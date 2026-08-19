# Infrastructure: Database & Session Management
from collections.abc import AsyncGenerator
from typing import Optional
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
    AsyncEngine,
)
from src.config.settings import get_settings
from src.infrastructure.database.models.base import Base

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        import os
        settings = get_settings()
        env = os.getenv("ENVIRONMENT", settings.ENVIRONMENT)
        db_url = os.getenv("DATABASE_URL", settings.DATABASE_URL)
        if env == "testing" or "sqlite" in db_url:
            db_url = "sqlite+aiosqlite:///:memory:"

        connect_args = {}
        pool_kwargs = {}
        if "sqlite" in db_url:
            connect_args = {"check_same_thread": False}
        else:
            # High-throughput PostgreSQL QueuePool settings
            pool_kwargs = {
                "pool_size": 25,
                "max_overflow": 15,
                "pool_timeout": 10.0,
                "pool_recycle": 1800,
                "pool_pre_ping": True,
            }

        _engine = create_async_engine(
            db_url,
            echo=False,
            future=True,
            connect_args=connect_args,
            **pool_kwargs,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        engine = get_engine()
        _session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


def async_session_factory() -> AsyncSession:
    """Convenience helper returning a new AsyncSession context manager."""
    factory = get_session_factory()
    return factory()



async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for yielding async DB sessions."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


from sqlalchemy import text


async def init_vector_extension(engine: AsyncEngine) -> None:
    """Enables the pgvector extension if running on PostgreSQL."""
    try:
        async with engine.begin() as conn:
            # Only execute on PostgreSQL connections
            if conn.dialect.name == "postgresql":
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        pass


async def init_database() -> None:
    """Creates all database tables defined in models."""
    engine = get_engine()
    await init_vector_extension(engine)

    # Import all models so Base has all metadata registered
    import src.infrastructure.database.models.event_store
    import src.infrastructure.database.models.parcel
    import src.infrastructure.database.models.truck
    import src.infrastructure.database.models.warehouse
    import src.infrastructure.database.models.airport
    import src.infrastructure.database.models.route
    import src.infrastructure.database.models.driver
    import src.infrastructure.database.models.incident
    import src.infrastructure.database.models.incident_embedding

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_database() -> None:
    """Closes all database engine connection pools."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
