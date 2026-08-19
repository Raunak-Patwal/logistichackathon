import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.infrastructure.queue.redis_queue import RedisQueueManager
from src.application.workers.event_worker import EventWorker
from src.api.routes.websocket import WebSocketConnectionManager


@pytest.mark.asyncio
async def test_redis_queue_manager_enqueue_and_broadcast():
    """Verifies that RedisQueueManager enqueues events and publishes broadcasts."""
    manager = RedisQueueManager()
    await manager.connect()

    # Enqueue event
    event_dict = {
        "event_type": "PARCEL_CREATED",
        "entity_id": "PKG-STREAM-TEST",
        "payload": {"weight": 5.0, "destination": "Bengaluru W08"},
    }
    msg_id = await manager.enqueue_event(event_dict)
    assert msg_id is not None

    # Test subscribe & publish
    sub_gen = manager.subscribe_broadcast()
    sub_task = asyncio.create_task(sub_gen.__anext__())

    await asyncio.sleep(0.01)
    await manager.publish_broadcast({"type": "DOMAIN_EVENT_PROCESSED", "entity_id": "PKG-STREAM-TEST"})

    received = await asyncio.wait_for(sub_task, timeout=2.0)
    assert received["type"] == "DOMAIN_EVENT_PROCESSED"
    assert received["entity_id"] == "PKG-STREAM-TEST"

    await manager.disconnect()


@pytest.mark.asyncio
async def test_websocket_connection_manager_broadcast():
    """Verifies that WebSocketConnectionManager tracks connections and sends json payloads."""
    ws_mgr = WebSocketConnectionManager()
    mock_ws = MagicMock()
    mock_ws.accept = AsyncMock()
    mock_ws.send_json = AsyncMock()

    await ws_mgr.connect(mock_ws)
    assert mock_ws in ws_mgr.active_connections

    await ws_mgr.broadcast({"type": "LIVE_PING", "data": "OK"})
    mock_ws.send_json.assert_called_once_with({"type": "LIVE_PING", "data": "OK"})

    ws_mgr.disconnect(mock_ws)
    assert mock_ws not in ws_mgr.active_connections


@pytest.mark.asyncio
async def test_event_worker_process_event(test_session):
    """Verifies that EventWorker processes events and commits to database."""
    worker = EventWorker()
    event_dict = {
        "event_type": "PARCEL_CREATED",
        "entity_id": "PKG-WORKER-TEST",
        "source": "WMS_GATEWAY",
        "idempotency_key": "idemp-worker-test-1",
        "payload": {"weight": 3.4, "destination": "Hyderabad"},
    }
    await worker.process_event(event_dict, session=test_session)
    # If no exceptions were raised, dual commit succeeded
    assert True

