# ==========================================
# Stage 1: Build & Requirements
# ==========================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies into /install prefix
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ==========================================
# Stage 2: Production Image
# ==========================================
FROM python:3.12-slim

WORKDIR /app

# Install runtime database libraries and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed dependencies from the builder stage to system-wide /usr/local
COPY --from=builder /install /usr/local

ENV PYTHONPATH=/app

# Create a non-root user for security
RUN useradd -m -r appuser && chown -R appuser /app
USER appuser

# Copy the actual application code and scripts
COPY --chown=appuser:appuser src/ ./src/
COPY --chown=appuser:appuser scripts/ ./scripts/

# Ensure entrypoint script has Unix line endings and is executable
RUN sed -i 's/\r$//' ./scripts/entrypoint.sh && chmod +x ./scripts/entrypoint.sh

# Expose FastAPI port
EXPOSE 8000

# Use the entrypoint script to run migrations/seeder before starting uvicorn
ENTRYPOINT ["/bin/bash", "./scripts/entrypoint.sh"]
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

