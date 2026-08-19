import time
import logging
from typing import Dict, Tuple, Optional
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.infrastructure.queue.redis_queue import redis_queue

logger = logging.getLogger(__name__)

# Atomic Redis Sliding-Window Rate Limiter Lua Script
RATE_LIMIT_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])

local clearBefore = now - window
redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return {1, limit - currentRequests - 1}
else
    return {0, 0}
end
"""

# In-memory sliding window fallback for local testing & offline mode
_IN_MEMORY_RATE_STORE: Dict[str, list[float]] = {}


class DistributedRateLimitMiddleware(BaseHTTPMiddleware):
    """
    High-performance distributed rate limiting middleware.
    Protects /auth and /events endpoints against DDoS and brute force attacks.
    """

    async def dispatch(self, request: Request, call_next):
        # 1. Identify Client Identity (Token Sub or Remote IP)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            client_id = f"token:{auth_header.split(' ')[1][:16]}"
        else:
            client_ip = (
                request.headers.get("X-Forwarded-For", request.client.host if request.client else "127.0.0.1")
                .split(",")[0]
                .strip()
            )
            client_id = f"ip:{client_ip}"

        path = request.url.path

        # 2. Define Rate Tiers per Route
        if path.startswith("/api/v1/auth/token"):
            limit = 30       # 30 login attempts per minute
            window = 60
        elif path.startswith("/api/v1/events"):
            limit = 1000     # 1,000 events/sec ingestion throughput
            window = 1
        elif path.startswith("/api/v1/"):
            limit = 500      # 500 requests/min general API limit
            window = 60
        else:
            # Static docs, health checks bypass
            return await call_next(request)

        rate_key = f"rate_limit:{path}:{client_id}"
        allowed = True

        try:
            now = time.time()
            if redis_queue.redis_client:
                result = await redis_queue.redis_client.eval(
                    RATE_LIMIT_LUA, 1, rate_key, now, window, limit
                )
                if result and result[0] == 0:
                    allowed = False
            else:
                # In-memory sliding window fallback
                timestamps = _IN_MEMORY_RATE_STORE.setdefault(rate_key, [])
                # Prune old
                _IN_MEMORY_RATE_STORE[rate_key] = [t for t in timestamps if t > now - window]
                if len(_IN_MEMORY_RATE_STORE[rate_key]) >= limit:
                    allowed = False
                else:
                    _IN_MEMORY_RATE_STORE[rate_key].append(now)

            if not allowed:
                logger.warning(f"Rate limit exceeded for {client_id} on {path}")
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit of {limit} requests per {window}s exceeded. Back off and retry.",
                        "retry_after_seconds": window,
                    },
                    headers={"Retry-After": str(window)},
                )
        except Exception as e:
            # Fail open gracefully if rate limiter store encounters an error
            logger.warning(f"Rate limiter check error (failing open): {e}")

        response: Response = await call_next(request)
        return response
