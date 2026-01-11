"""Configuration management for simulator service.

This module provides environment-based configuration using Pydantic Settings.
The CRITICAL setting is SENSOR_BACKEND which controls which sensor implementation
is loaded at runtime (simulator vs hardware).
"""

from enum import Enum
from typing import Optional, List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class SensorBackend(str, Enum):
    """Sensor backend types.

    This enum controls which sensor implementation is loaded:
    - SIMULATOR: Use simulated sensor data (for testing/development)
    - HARDWARE: Use real sensor hardware (for production)
    """

    SIMULATOR = "simulator"
    HARDWARE = "hardware"


class Settings(BaseSettings):
    """Application settings loaded from environment variables.

    To switch between simulator and hardware, simply change SENSOR_BACKEND
    in your .env file and restart the service. No code changes required.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    # Application Settings
    APP_NAME: str = Field(default="Battery Simulator Service")
    ENVIRONMENT: str = Field(default="development")
    PORT: int = Field(default=8001)
    LOG_LEVEL: str = Field(default="INFO")

    # CORS Configuration
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"]
    )

    # CRITICAL: Sensor Backend Selection
    SENSOR_BACKEND: SensorBackend = Field(
        default=SensorBackend.SIMULATOR,
        description="Which sensor backend to use (simulator or hardware)"
    )

    # Simulator Configuration (used when SENSOR_BACKEND=simulator)
    SIMULATOR_SEED: Optional[int] = Field(
        default=None,
        description="Random seed for deterministic simulation (None = random)"
    )
    SIMULATOR_NOISE_LEVEL: float = Field(
        default=0.02,
        ge=0.0,
        le=1.0,
        description="Noise level for sensor readings (0.0 = no noise, 1.0 = high noise)"
    )
    SIMULATOR_DRIFT_ENABLED: bool = Field(
        default=True,
        description="Enable temporal drift (SoC decrease, SoH degradation)"
    )
    SIMULATOR_UPDATE_INTERVAL_MS: int = Field(
        default=1000,
        ge=100,
        le=60000,
        description="Minimum interval between state updates in milliseconds"
    )
    SIMULATOR_SOC_DECAY_RATE: float = Field(
        default=0.1,
        ge=0.0,
        le=10.0,
        description="SoC decay rate per minute under typical load"
    )
    SIMULATOR_SOH_DECAY_RATE: float = Field(
        default=0.0001,
        ge=0.0,
        le=1.0,
        description="SoH decay rate per cycle"
    )

    # Hardware Configuration (used when SENSOR_BACKEND=hardware)
    HARDWARE_CONNECTION_STRING: Optional[str] = Field(
        default=None,
        description="Connection string for hardware sensors (e.g., tcp://192.168.1.100:5000)"
    )
    HARDWARE_TIMEOUT_MS: int = Field(
        default=3000,
        ge=100,
        le=30000,
        description="Timeout for hardware communication in milliseconds"
    )
    HARDWARE_RETRY_ATTEMPTS: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of retry attempts for failed hardware reads"
    )
    HARDWARE_RETRY_DELAY_MS: int = Field(
        default=500,
        ge=100,
        le=5000,
        description="Delay between retry attempts in milliseconds"
    )

    def is_simulator(self) -> bool:
        """Check if simulator backend is selected."""
        return self.SENSOR_BACKEND == SensorBackend.SIMULATOR

    def is_hardware(self) -> bool:
        """Check if hardware backend is selected."""
        return self.SENSOR_BACKEND == SensorBackend.HARDWARE


# Global settings instance
settings = Settings()
