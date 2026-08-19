import asyncio
import json
import logging
import time
from typing import Dict, Any, Optional

from src.infrastructure.queue.redis_queue import redis_queue, REDIS_STREAM_KEY
from src.infrastructure.database.session import async_session_factory
from src.application.parcel_service import ParcelApplicationService

logger = logging.getLogger(__name__)

REDIS_DLQ_KEY = "logistics:events:dlq"
MAX_RETRIES = 3


class EventWorker:
    """
    Hardened background worker with Dead-Letter Queue (DLQ) protection.
    Continuously pulls events from Redis Stream, executes atomic dual-commit
    (PostgreSQL Event Store + World Model), and isolates poison pills after 3 attempts.
    """
    def __init__(self, consumer_group: str = "logistics_workers", consumer_name: str = "worker_1"):
        self.group = consumer_group
        self.name = consumer_name
        self.running = False

    async def start(self):
        self.running = True
        await redis_queue.connect()

        # Create consumer group if live Redis client is active
        if redis_queue.redis_client:
            try:
                await redis_queue.redis_client.xgroup_create(
                    name=REDIS_STREAM_KEY,
                    groupname=self.group,
                    id="0",
                    mkstream=True,
                )
            except Exception:
                # Consumer group already exists or stream initialized
                pass

        logger.info(f"Hardened Event Worker '{self.name}' listening with DLQ & Retry protection...")

        while self.running:
            try:
                # 1. Live Redis Stream reading with DLQ error handling
                if redis_queue.redis_client:
                    try:
                        entries = await redis_queue.redis_client.xreadgroup(
                            groupname=self.group,
                            consumername=self.name,
                            streams={REDIS_STREAM_KEY: ">"},
                            count=10,
                            block=1500,
                        )

                        if entries:
                            for stream, messages in entries:
                                for message_id, message_data in messages:
                                    await self._handle_message_with_dlq(message_id, message_data)
                        else:
                            await asyncio.sleep(0.02)
                    except Exception as e:
                        logger.warning(f"Redis stream reading error: {e}")
                        await asyncio.sleep(0.5)

                # 2. In-Memory Fallback queue reading
                while not redis_queue._fallback_stream.empty():
                    msg_id, event_dict = await redis_queue._fallback_stream.get()
                    try:
                        await self.process_event(event_dict)
                    except Exception as e:
                        logger.error(f"In-memory worker event failure: {e}")

                await asyncio.sleep(0.02)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in event worker loop: {e}", exc_info=True)
                await asyncio.sleep(0.5)

    async def _handle_message_with_dlq(self, message_id: str, message_data: Dict[str, Any]):
        raw_payload = message_data.get("payload")
        if not raw_payload:
            await redis_queue.redis_client.xack(REDIS_STREAM_KEY, self.group, message_id)
            return

        try:
            event_dict = json.loads(raw_payload) if isinstance(raw_payload, str) else raw_payload
        except Exception as parse_err:
            logger.error(f"Malformed JSON in message {message_id}: {parse_err}")
            await self._isolate_to_dlq(message_id, {"raw": str(raw_payload)}, str(parse_err), retries=0)
            return

        retry_count = int(message_data.get("retry_count", 0))

        try:
            # Attempt atomic dual-commit processing
            await self.process_event(event_dict)
            # Acknowledge successful processing
            await redis_queue.redis_client.xack(REDIS_STREAM_KEY, self.group, message_id)

        except Exception as process_error:
            retry_count += 1
            logger.warning(
                f"Event processing failed for {event_dict.get('event_type')} "
                f"(Attempt {retry_count}/{MAX_RETRIES}): {process_error}"
            )

            if retry_count >= MAX_RETRIES:
                # 3 Strikes Exceeded -> Send to Dead-Letter Queue
                await self._isolate_to_dlq(message_id, event_dict, str(process_error), retries=retry_count)
            else:
                # Exponential backoff retry
                backoff_delay = 0.1 * (2 ** retry_count)
                await asyncio.sleep(backoff_delay)
                await redis_queue.redis_client.xadd(
                    name=REDIS_STREAM_KEY,
                    fields={
                        "payload": json.dumps(event_dict) if isinstance(event_dict, dict) else str(event_dict),
                        "retry_count": str(retry_count),
                    },
                )
                await redis_queue.redis_client.xack(REDIS_STREAM_KEY, self.group, message_id)

    async def _isolate_to_dlq(self, original_id: str, event_data: Any, error_msg: str, retries: int):
        """Isolates poisoned message to DLQ and removes it from main consumer group."""
        dlq_entry = {
            "original_stream_id": original_id,
            "event": event_data,
            "error": error_msg,
            "timestamp": time.time(),
            "retries": retries,
        }
        try:
            await redis_queue.redis_client.xadd(
                name=REDIS_DLQ_KEY,
                fields={"payload": json.dumps(dlq_entry)},
            )
            await redis_queue.redis_client.xack(REDIS_STREAM_KEY, self.group, original_id)
            logger.error(f"Event {original_id} successfully isolated to DLQ [{REDIS_DLQ_KEY}]")
        except Exception as e:
            logger.critical(f"Failed to isolate event to DLQ: {e}")

    async def process_event(self, event_dict: dict, session: Optional[Any] = None):
        """
        Executes domain service with atomic dual-commit and broadcasts state update.
        """
        if session is not None:
            await self._execute_service(session, event_dict)
            return

        async with async_session_factory() as sess:
            await self._execute_service(sess, event_dict)

    async def _execute_service(self, session: Any, event_dict: dict):
        try:
            service = ParcelApplicationService(session=session)
            result = await service.handle_event(event_dict)

            # State extraction
            state = "UPDATED"
            if isinstance(result, dict):
                state = result.get("state", "UPDATED")
            elif hasattr(result, "state"):
                state = result.state

            entity_id = (
                event_dict.get("entity_id")
                or event_dict.get("parcel_id")
                or (result.get("parcel_id") if isinstance(result, dict) else "UNKNOWN")
            )

            broadcast_payload = {
                "type": "DOMAIN_EVENT_PROCESSED",
                "event_type": event_dict.get("event_type", "PARCEL_CREATED"),
                "entity_id": entity_id,
                "state": state,
                "timestamp": event_dict.get("metadata", {}).get("timestamp"),
            }
            await redis_queue.publish_broadcast(broadcast_payload)
            logger.info(f"Committed & Broadcasted event {event_dict.get('event_type')} for {entity_id}")

        except Exception as err:
            await session.rollback()
            raise err

    def stop(self):
        self.running = False
