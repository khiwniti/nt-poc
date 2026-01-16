# MLOps Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for optimized production image

# Stage 1: Build
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from mlops service directory
COPY services/mlops/requirements.txt .

# Install Python dependencies in a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code from mlops service directory
COPY services/mlops/src/ ./src/

# Create non-root user
RUN groupadd -g 1001 python && \
    useradd -m -u 1001 -g python python

# Change ownership
RUN chown -R python:python /app

# Switch to non-root user
USER python

# Set Python path and use virtual environment
ENV PYTHONPATH=/app
ENV PATH="/opt/venv/bin:$PATH"

# Expose service port (Railway will set PORT env var)
EXPOSE 8000

# Health check (uses PORT env var)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Run application (uses PORT env var from Railway)
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8000}
