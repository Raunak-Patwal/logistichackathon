import asyncio
import json
import logging
from typing import Optional, AsyncGenerator, Dict, Any

try:
    import redis.asyncio as redis
except ImportError:
    redis = None  # type: ignore

from src.config.settings import settings

logger = logging.getLogger(__name__)

REDIS_STREAM_KEY = "logistics:events:stream"
REDIS_BROADCAST_CHANNEL = "logistics:events:broadcast"


class RedisQueueManager:
    """
    Manages Redis Streams for decoupled ingestion 
    and Redis Pub/Sub for real-time frontend broadcasting.
    Includes in-memory fallback for offline development and testing.
    """
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        self.redis_client: Optional[Any] = None
        self._is_connected = False
        # In-memory queue fallback for offline/test environments
        self._fallback_stream: asyncio.Queue = asyncio.Queue()
        self._fallback_subscribers: set[asyncio.Queue] = set()

    async def connect(self):
        if self._is_connected:
            return

        if redis and "redis://" in self.redis_url:
            try:
                client = redis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                    socket_connect_timeout=1.5,
                )
                await client.ping()
                self.redis_client = client
                self._is_connected = True
                logger.info(f"Connected to Redis at {self.redis_url} for Queue and Pub/Sub.")
                return
            except Exception as e:
                logger.warning(f"Live Redis not available ({e}). Using in-memory stream fallback.")

        self._is_connected = True
        logger.info("Initialized in-memory Event Queue & Pub/Sub fallback.")

    async def disconnect(self):
        if self.redis_client:
            try:
                if hasattr(self.redis_client, "aclose"):
                    await self.redis_client.aclose()
                else:
                    await self.redis_client.close()
            except Exception:
                pass
            self.redis_client = None
        self._is_connected = False
        logger.info("Disconnected from Redis.")

    async def enqueue_event(self, event_dict: dict) -> str:
        """
        Pushes a serialized ULEO event into the Redis Stream.
        Returns the generated Redis Stream Message ID.
        """
        if not self._is_connected:
            await self.connect()

        if self.redis_client:
            try:
                stream_id = await self.redis_client.xadd(
                    name=REDIS_STREAM_KEY,
                    fields={"payload": json.dumps(event_dict)}
                )
                return str(stream_id)
            except Exception as e:
                logger.warning(f"Redis xadd failed ({e}), using in-memory stream.")

        # Fallback in-memory stream
        msg_id = f"mem-{asyncio.get_event_loop().time()}"
        await self._fallback_stream.put((msg_id, event_dict))
        return msg_id

    async def publish_broadcast(self, event_data: dict):
        """
        Broadcasts a successfully committed event to all active WebSocket listeners.
        """
        if not self._is_connected:
            await self.connect()

        if self.redis_client:
            try:
                await self.redis_client.publish(
                    REDIS_BROADCAST_CHANNEL,
                    json.dumps(event_data)
                )
            except Exception as e:
                logger.warning(f"Redis publish failed ({e}), broadcasting via in-memory pubsub.")

        # Also publish to in-memory subscribers
        for sub_queue in list(self._fallback_subscribers):
            try:
                await sub_queue.put(event_data)
            except Exception:
                pass

    async def subscribe_broadcast(self) -> AsyncGenerator[dict, None]:
        """
        Subscribes to the Pub/Sub channel and yields event messages as they arrive.
        """
        if not self._is_connected:
            await self.connect()

        if self.redis_client:
            try:
                pubsub = self.redis_client.pubsub()
                await pubsub.subscribe(REDIS_BROADCAST_CHANNEL)
                try:
                    async for message in pubsub.listen():
                        if message.get("type") == "message":
                            data = json.loads(message["data"])
                            yield data
                finally:
                    await pubsub.unsubscribe(REDIS_BROADCAST_CHANNEL)
                    if hasattr(pubsub, "aclose"):
                        await pubsub.aclose()
                    else:
                        await pubsub.close()
                return
            except Exception as e:
                logger.warning(f"Redis pubsub subscription failed ({e}), falling back to in-memory subscriber.")

        # In-memory subscriber queue
        sub_queue: asyncio.Queue = asyncio.Queue()
        self._fallback_subscribers.add(sub_queue)
        try:
            while self._is_connected:
                data = await sub_queue.get()
                yield data
        finally:
            self._fallback_subscribers.discard(sub_queue)


# Singleton instance
redis_queue = RedisQueueManager()
