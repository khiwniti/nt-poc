"""Sensor data endpoints.

This module provides API endpoints for accessing sensor readings and metrics.
"""

import logging
from typing import List
from fastapi import APIRouter, Request, HTTPException, status
from pydantic import BaseModel

from app.models.responses import ReadingResponse, MultiReadingResponse, MetricsResponse, ErrorResponse
from app.models.sensor_data import SensorReading

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sensors", tags=["Sensors"])


class BatchReadingRequest(BaseModel):
    """Request body for batch readings."""
    battery_system_ids: List[str]


@router.get("/reading/{battery_system_id}", response_model=ReadingResponse)
async def get_sensor_reading(battery_system_id: str, request: Request):
    """Get current sensor reading for a battery system.

    Args:
        battery_system_id: Unique battery system identifier

    Returns:
        ReadingResponse with current sensor data

    Raises:
        HTTPException: If reading fails
    """
    try:
        sensor = request.app.state.sensor
        reading_dict = await sensor.get_reading(battery_system_id)

        return ReadingResponse(
            success=True,
            data=SensorReading(**reading_dict)
        )
    except ValueError as e:
        logger.warning(f"Invalid battery system ID: {battery_system_id} - {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get reading for {battery_system_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sensor reading: {str(e)}"
        )


@router.post("/readings/batch", response_model=MultiReadingResponse)
async def get_multiple_readings(request_body: BatchReadingRequest, request: Request):
    """Get sensor readings for multiple battery systems.

    Args:
        request_body: List of battery system IDs

    Returns:
        MultiReadingResponse with readings for all requested batteries

    Raises:
        HTTPException: If any reading fails
    """
    try:
        sensor = request.app.state.sensor
        readings = []

        for battery_system_id in request_body.battery_system_ids:
            reading_dict = await sensor.get_reading(battery_system_id)
            readings.append(SensorReading(**reading_dict))

        return MultiReadingResponse(
            success=True,
            data=readings,
            count=len(readings)
        )
    except Exception as e:
        logger.error(f"Failed to get batch readings: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get batch readings: {str(e)}"
        )


@router.get("/metrics/{battery_system_id}", response_model=MetricsResponse)
async def get_battery_metrics(battery_system_id: str, request: Request):
    """Get aggregated metrics for a battery system.

    Args:
        battery_system_id: Unique battery system identifier

    Returns:
        MetricsResponse with aggregated metrics

    Raises:
        HTTPException: If metrics retrieval fails
    """
    try:
        sensor = request.app.state.sensor
        metrics_dict = await sensor.get_metrics(battery_system_id)

        # Parse the dict into BatteryMetrics (already validated by sensor backend)
        from app.models.sensor_data import BatteryMetrics
        metrics = BatteryMetrics(**metrics_dict)

        return MetricsResponse(
            success=True,
            data=metrics
        )
    except ValueError as e:
        logger.warning(f"Invalid battery system ID: {battery_system_id} - {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get metrics for {battery_system_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {str(e)}"
        )


@router.get("/status", tags=["Status"])
async def get_sensor_status(request: Request):
    """Get sensor backend status and configuration.

    Returns:
        Dict with sensor backend information
    """
    from app.config import settings

    sensor = request.app.state.sensor
    health = await sensor.health_check()

    return {
        "success": True,
        "backend": settings.SENSOR_BACKEND.value,
        "health": health,
        "configuration": {
            "backend_type": settings.SENSOR_BACKEND.value,
            "simulator_config": {
                "noise_level": settings.SIMULATOR_NOISE_LEVEL,
                "drift_enabled": settings.SIMULATOR_DRIFT_ENABLED
            } if settings.is_simulator() else None,
            "hardware_config": {
                "connection_configured": bool(settings.HARDWARE_CONNECTION_STRING),
                "timeout_ms": settings.HARDWARE_TIMEOUT_MS
            } if settings.is_hardware() else None
        }
    }
