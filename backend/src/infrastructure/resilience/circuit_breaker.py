import time
import asyncio
import logging
from enum import Enum
from functools import wraps
from typing import Callable, Any, Optional

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    CLOSED = "CLOSED"        # Normal operation: all calls pass through
    OPEN = "OPEN"            # Tripped: fast-fail or fallback immediately
    HALF_OPEN = "HALF_OPEN"  # Testing recovery: probe with limited requests


class CircuitBreakerOpenException(Exception):
    """Raised when an operation is rejected by an open circuit breaker."""
    pass


class CircuitBreaker:
    """
    Asynchronous Circuit Breaker protecting external APIs (e.g. Gemini AI, 3rd-party services)
    and database connections from cascading brownout failures.
    """
    def __init__(
        self,
        failure_threshold: int = 3,
        recovery_timeout: float = 20.0,
        name: str = "default_circuit",
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.name = name
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_state_change = time.time()
        self._lock = asyncio.Lock()

    async def call(self, func: Callable, fallback_fn: Optional[Callable] = None, *args, **kwargs) -> Any:
        now = time.time()

        async with self._lock:
            # Transition OPEN -> HALF_OPEN after recovery_timeout
            if self.state == CircuitState.OPEN:
                if now - self.last_state_change > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.last_state_change = now
                    logger.info(f"CircuitBreaker '{self.name}' transitioned to HALF_OPEN (probing...)")
                else:
                    logger.warning(f"CircuitBreaker '{self.name}' is OPEN. Rejecting call.")
                    if fallback_fn:
                        return await fallback_fn(*args, **kwargs) if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn(*args, **kwargs)
                    raise CircuitBreakerOpenException(f"CircuitBreaker '{self.name}' is currently OPEN.")

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            async with self._lock:
                if self.state == CircuitState.HALF_OPEN:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.last_state_change = now
                    logger.info(f"CircuitBreaker '{self.name}' recovered to CLOSED.")
                elif self.state == CircuitState.CLOSED and self.failure_count > 0:
                    self.failure_count = 0

            return result

        except Exception as e:
            async with self._lock:
                self.failure_count += 1
                self.last_state_change = now
                logger.error(f"CircuitBreaker '{self.name}' detected error (Failures: {self.failure_count}/{self.failure_threshold}): {e}")

                if self.failure_count >= self.failure_threshold:
                    self.state = CircuitState.OPEN
                    logger.critical(f"CircuitBreaker '{self.name}' TRIPPED to OPEN for {self.recovery_timeout}s!")

            if fallback_fn:
                return await fallback_fn(*args, **kwargs) if asyncio.iscoroutinefunction(fallback_fn) else fallback_fn(*args, **kwargs)
            raise e


# Global Circuit Breakers for critical platform dependencies
gemini_circuit_breaker = CircuitBreaker(failure_threshold=3, recovery_timeout=15.0, name="gemini_reasoning_api")
