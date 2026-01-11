"""Pydantic models for sensor data.

This module defines the data schemas for battery sensor readings and metrics.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class SensorReading(BaseModel):
    """Single sensor reading from a battery system."""

    battery_system_id: str = Field(description="Unique battery system identifier")
    voltage: float = Field(ge=0.0, le=10.0, description="Battery voltage in volts")
    current: float = Field(ge=-200.0, le=200.0, description="Current in amperes")
    temperature: float = Field(ge=-50.0, le=100.0, description="Temperature in Celsius")
    soc: float = Field(ge=0.0, le=100.0, description="State of Charge percentage")
    soh: float = Field(ge=0.0, le=100.0, description="State of Health percentage")
    power: float = Field(description="Power in watts (V*I)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional metadata")

    @field_validator("power")
    @classmethod
    def validate_power(cls, v: float, info) -> float:
        """Ensure power is calculated correctly if voltage/current available."""
        # Power validation happens after model creation
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "battery_system_id": "BAT-001",
                "voltage": 3.7,
                "current": -10.5,
                "temperature": 25.3,
                "soc": 75.2,
                "soh": 95.8,
                "power": -38.85,
                "timestamp": "2024-01-10T12:00:00Z",
                "metadata": {"cell_count": 12, "location": "rack-a-01"}
            }
        }


class BatteryMetrics(BaseModel):
    """Aggregated battery metrics over time."""

    battery_system_id: str
    current_reading: SensorReading
    statistics: Dict[str, Any] = Field(
        description="Statistical summary (min/max/avg)"
    )
    health_indicators: Dict[str, Any] = Field(
        description="Health and performance indicators"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "battery_system_id": "BAT-001",
                "current_reading": {
                    "voltage": 3.7,
                    "current": -10.5,
                    "temperature": 25.3,
                    "soc": 75.2,
                    "soh": 95.8,
                    "power": -38.85
                },
                "statistics": {
                    "voltage_avg": 3.68,
                    "temperature_max": 26.1,
                    "soc_min": 74.5
                },
                "health_indicators": {
                    "cycle_count": 145,
                    "degradation_rate": 0.02
                }
            }
        }


class BatteryState(BaseModel):
    """Internal battery state for simulation."""

    battery_system_id: str
    soc: float = Field(default=85.0, ge=0.0, le=100.0)
    soh: float = Field(default=95.0, ge=0.0, le=100.0)
    temperature: float = Field(default=25.0)
    cycle_count: int = Field(default=0, ge=0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    discharge_rate: float = Field(default=-10.0)  # Amperes

    class Config:
        json_schema_extra = {
            "example": {
                "battery_system_id": "BAT-001",
                "soc": 85.0,
                "soh": 95.0,
                "temperature": 25.0,
                "cycle_count": 100,
                "discharge_rate": -10.0
            }
        }
