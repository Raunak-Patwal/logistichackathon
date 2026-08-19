import asyncio
import logging
from typing import Set, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from src.infrastructure.queue.redis_queue import redis_queue

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSockets"])


class WebSocketConnectionManager:
    """
    Manages active WebSocket connections from React / Three.js frontends.
    """
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


manager = WebSocketConnectionManager()


@router.websocket("/ws/events")
@router.websocket("/api/v1/ws/events")
async def websocket_event_stream(websocket: WebSocket):
    """
    Subscribes the frontend to the real-time logistics event stream.
    Broadcasts live state mutations and telemetry.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep socket alive and receive any client-side pings/commands
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        manager.disconnect(websocket)


async def start_pubsub_listener():
    """
    Background task that listens to Redis Pub/Sub and relays events to all connected WebSockets.
    """
    logger.info("Starting Redis PubSub WebSocket listener...")
    try:
        async for event in redis_queue.subscribe_broadcast():
            await manager.broadcast(event)
    except asyncio.CancelledError:
        logger.info("Redis PubSub WebSocket listener cancelled.")
    except Exception as e:
        logger.error(f"Error in PubSub WebSocket listener: {e}", exc_info=True)
