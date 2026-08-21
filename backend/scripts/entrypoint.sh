#!/bin/bash
set -e

echo "Running AI Logistics Brain Initialization..."

# Run deterministic seeder script to initialize the World Model if DB is empty
echo "Running database seeder..."
python -m src.infrastructure.seeder

echo "Starting Uvicorn server..."
# Exec replaces the shell process with the uvicorn process, passing along signal handling
exec "$@"
