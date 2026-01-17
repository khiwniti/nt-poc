"""Pydantic models for API responses."""

from typing import List, Optional, Any
from pydantic import BaseModel, Field
from models.sensor_data import SensorReading, BatteryMetrics


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(description="Service status: healthy, degraded, unhealthy")
    service: str = Field(default="simulator", description="Service name")
    sensor_backend: dict = Field(description="Sensor backend health details")
    timestamp: str = Field(description="Response timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "service": "simulator",
                "sensor_backend": {
                    "backend_type": "simulator",
                    "status": "healthy",
                    "details": {"batteries_tracked": 5}
                },
                "timestamp": "2024-01-10T12:00:00Z"
            }
        }


class ReadingResponse(BaseModel):
    """Single sensor reading response."""

    success: bool = Field(default=True)
    data: SensorReading
    message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "battery_system_id": "BAT-001",
                    "voltage": 3.7,
                    "current": -10.5,
                    "temperature": 25.3,
                    "soc": 75.2,
                    "soh": 95.8,
                    "power": -38.85,
                    "timestamp": "2024-01-10T12:00:00Z"
                }
            }
        }


class MultiReadingResponse(BaseModel):
    """Multiple sensor readings response."""

    success: bool = Field(default=True)
    data: List[SensorReading]
    count: int
    message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "count": 2,
                "data": [
                    {
                        "battery_system_id": "BAT-001",
                        "voltage": 3.7,
                        "current": -10.5,
                        "soc": 75.2
                    },
                    {
                        "battery_system_id": "BAT-002",
                        "voltage": 3.8,
                        "current": -12.0,
                        "soc": 80.1
                    }
                ]
            }
        }


class MetricsResponse(BaseModel):
    """Battery metrics response."""

    success: bool = Field(default=True)
    data: BatteryMetrics
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response."""

    success: bool = Field(default=False)
    error: str = Field(description="Error message")
    details: Optional[Any] = Field(default=None, description="Additional error details")

    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "error": "Battery system not found",
                "details": {"battery_system_id": "BAT-999"}
            }
        }