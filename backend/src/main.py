import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import api_router
from src.api.routes.websocket import start_pubsub_listener
from src.application.workers.event_worker import EventWorker
from src.config.settings import get_settings
from src.infrastructure.database.session import init_database, close_database, get_session_factory
from src.infrastructure.database.seeder import seed_initial_data
from src.infrastructure.queue.redis_queue import redis_queue

logger = logging.getLogger(__name__)

worker = EventWorker()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifecycle management for database schema, seeder,
    Redis stream queue, background workers, and real-time WebSocket pubsub.
    """
    # 1. Startup: create tables and seed initial canonical dataset
    await init_database()
    factory = get_session_factory()
    async with factory() as session:
        await seed_initial_data(session)

    # 2. Redis & Async Worker Tasks
    await redis_queue.connect()
    worker_task = asyncio.create_task(worker.start())
    pubsub_task = asyncio.create_task(start_pubsub_listener())
    logger.info("AI Logistics Brain event streaming & WebSocket pipeline initialized.")

    yield

    # 3. Shutdown: Stop background tasks and close connection pools
    worker.stop()
    worker_task.cancel()
    pubsub_task.cancel()
    try:
        await asyncio.gather(worker_task, pubsub_task, return_exceptions=True)
    except Exception:
        pass

    await redis_queue.disconnect()
    await close_database()
    logger.info("AI Logistics Brain services safely stopped.")


def create_app() -> FastAPI:
    """
    FastAPI Application Factory.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # Security & CORS Middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if settings.DEBUG else ["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from src.api.middleware.rate_limit import DistributedRateLimitMiddleware
    app.add_middleware(DistributedRateLimitMiddleware)

    # Mount API routers
    app.include_router(api_router, prefix=settings.API_V1_STR)
    app.include_router(api_router)  # Also mount at root for /health and /ws convenience

    return app


app = create_app()
