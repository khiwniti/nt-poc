# Simulator Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for Python 3.11 + FastAPI

# Builder stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements from simulator service directory
COPY services/simulator/requirements.txt .

# Install dependencies
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code from simulator service directory
COPY services/simulator/app/ ./app/

# Create non-root user
RUN useradd -m -u 1001 python && \
    chown -R python:python /app

USER python

# Environment
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app \
    PYTHONUNBUFFERED=1

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Health check (uses PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", \"8000\")}/api/health')" || exit 1

# Start application (uses PORT env var from Railway)
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
