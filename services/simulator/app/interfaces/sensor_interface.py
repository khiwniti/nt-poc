"""Abstract sensor interface for replaceability design.

This module defines the contract that ALL sensor backends (simulator, hardware)
must implement. This enables zero-code-change switching between implementations
via configuration only.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class SensorInterface(ABC):
    """Abstract base class ensuring simulator/hardware are interchangeable.

    This interface defines ALL operations any sensor backend must support.
    Implementations include:
    - SimulatorSensor: Generates realistic simulated data for testing
    - HardwareSensor: Communicates with real sensor hardware

    The factory pattern in main.py selects which implementation to use based
    on the SENSOR_BACKEND configuration setting.
    """

    @abstractmethod
    async def initialize(self) -> None:
        """Initialize sensor connection/state.

        Called during application startup. Should establish connections,
        initialize state, and prepare the sensor backend for operation.

        Raises:
            Exception: If initialization fails (connection error, invalid config, etc.)
        """
        pass

    @abstractmethod
    async def get_reading(self, battery_system_id: str) -> Dict[str, Any]:
        """Get current sensor reading for a battery system.

        Args:
            battery_system_id: Unique identifier for the battery system

        Returns:
            Dict containing sensor reading with fields:
            - voltage (float): Battery voltage in volts
            - current (float): Current in amperes
            - temperature (float): Temperature in Celsius
            - soc (float): State of Charge percentage (0-100)
            - soh (float): State of Health percentage (0-100)
            - power (float): Power in watts (calculated as V*I)
            - timestamp (str): ISO format timestamp

        Raises:
            ValueError: If battery_system_id is invalid
            Exception: If reading fails (communication error, timeout, etc.)
        """
        pass

    @abstractmethod
    async def get_metrics(self, battery_system_id: str) -> Dict[str, Any]:
        """Get aggregated battery metrics.

        Args:
            battery_system_id: Unique identifier for the battery system

        Returns:
            Dict containing metrics including:
            - current_reading: Latest sensor reading
            - statistics: Min/max/avg values over time window
            - health_indicators: Additional health metrics
            - metadata: System information

        Raises:
            ValueError: If battery_system_id is invalid
            Exception: If metrics calculation fails
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check sensor system health.

        Returns:
            Dict containing:
            - backend_type (str): "simulator" or "hardware"
            - status (str): "healthy", "degraded", or "unhealthy"
            - details (dict): Implementation-specific health information
            - timestamp (str): ISO format timestamp

        This method should never raise exceptions - return status="unhealthy"
        with error details instead.
        """
        pass

    @abstractmethod
    async def shutdown(self) -> None:
        """Clean shutdown of sensor connection/state.

        Called during application shutdown. Should close connections,
        release resources, and perform cleanup.

        This method should handle errors gracefully and not raise exceptions.
        """
        pass
