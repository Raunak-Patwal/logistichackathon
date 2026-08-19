#!/bin/bash
set -e

echo "Running AI Logistics Brain Initialization..."

# Optionally run Alembic migrations here if you use them
# echo "Applying database migrations..."
# alembic upgrade head

# Run your deterministic seeder script to initialize the World Model if DB is empty
echo "Running database seeder..."
python -m src.infrastructure.seeder

echo "Starting Uvicorn server..."
# Exec replaces the shell process with the uvicorn process, passing along signal handling
exec "$@"
