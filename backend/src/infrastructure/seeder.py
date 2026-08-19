import asyncio
import sys
from pathlib import Path

# Ensure script dir does not shadow standard library modules like 'queue'
script_dir = str(Path(__file__).resolve().parent)
while script_dir in sys.path:
    sys.path.remove(script_dir)

backend_root = str(Path(__file__).resolve().parent.parent.parent)
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from src.infrastructure.database.session import init_database, get_session_factory, close_database
from src.infrastructure.database.seeder import seed_initial_data


async def run_seeder() -> None:
    print("[AI Logistics Brain] Initializing database schema...")
    await init_database()
    factory = get_session_factory()
    async with factory() as session:
        print("[AI Logistics Brain] Seeding canonical world model dataset...")
        await seed_initial_data(session)
    await close_database()
    print("[AI Logistics Brain] Database initialization & seeding complete.")


if __name__ == "__main__":
    try:
        asyncio.run(run_seeder())
    except Exception as e:
        print(f"[AI Logistics Brain] Seeding error: {e}", file=sys.stderr)
        sys.exit(1)
