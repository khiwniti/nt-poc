"""Health check endpoint.

This module provides the health check endpoint required by railway.toml.
The health check is used by the deployment platform to monitor service status.
"""

from datetime import datetime
from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    service: str
    sensor_backend: dict
    timestamp: str


@router.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check(request: Request):
    """Health check endpoint.

    This endpoint is specified in railway.toml as healthcheckPath="/api/health".
    It verifies that:
    - The service is running
    - The sensor backend is initialized
    - The sensor backend is healthy

    Returns:
        HealthResponse with status and sensor backend details
    """
    sensor = request.app.state.sensor
    sensor_health = await sensor.health_check()

    # Determine overall status based on sensor health
    sensor_status = sensor_health.get("status", "unknown")
    overall_status = "healthy" if sensor_status == "healthy" else "degraded"

    return HealthResponse(
        status=overall_status,
        service="simulator",
        sensor_backend=sensor_health,
        timestamp=datetime.utcnow().isoformat()
    )
