import os
os.environ["ENVIRONMENT"] = "testing"

import pytest
import pytest_asyncio
from collections.abc import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from src.main import create_app
from src.infrastructure.database.models.base import Base
from src.infrastructure.database.session import get_db_session
from src.infrastructure.database.seeder import seed_initial_data

# Import all models
import src.infrastructure.database.models.event_store
import src.infrastructure.database.models.parcel
import src.infrastructure.database.models.truck
import src.infrastructure.database.models.warehouse
import src.infrastructure.database.models.airport
import src.infrastructure.database.models.route
import src.infrastructure.database.models.driver
import src.infrastructure.database.models.incident


@pytest_asyncio.fixture(scope="function")
async def test_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides an isolated in-memory SQLite async database session for unit/integration tests."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )

    async with session_factory() as session:
        await seed_initial_data(session)
        yield session

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_client(test_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an AsyncClient bound to the FastAPI app with test_session overridden."""
    app = create_app()

    async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield test_session

    app.dependency_overrides[get_db_session] = override_get_db_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
