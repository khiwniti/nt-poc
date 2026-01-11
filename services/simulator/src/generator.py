"""Battery simulation data generator."""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional

class BatterySimulator:
    """Generates synthetic battery sensor data with realistic patterns."""

    def __init__(self, seed: Optional[int] = None):
        """Initialize simulator with optional random seed."""
        if seed is not None:
            np.random.seed(seed)

    def generate_timeseries(
        self,
        start_time: datetime,
        duration_hours: int,
        interval_minutes: int = 1,
        battery_id: str = "BAT001"
    ) -> pd.DataFrame:
        """
        Generate battery sensor data timeseries.

        Args:
            start_time: Start timestamp
            duration_hours: Duration in hours
            interval_minutes: Data point interval
            battery_id: Battery identifier

        Returns:
            DataFrame with battery sensor readings
        """
        num_points = int(duration_hours * 60 / interval_minutes)
        timestamps = [
            start_time + timedelta(minutes=i * interval_minutes)
            for i in range(num_points)
        ]

        # Realistic battery parameters with noise
        voltage = 3.7 + np.random.normal(0, 0.05, num_points)
        current = np.random.uniform(-10, 10, num_points)
        temperature = 25 + np.random.normal(0, 2, num_points)
        soc = 100 - (np.arange(num_points) / num_points) * 20
        soh = 95 + np.random.normal(0, 0.5, num_points)

        return pd.DataFrame({
            'timestamp': timestamps,
            'battery_id': battery_id,
            'voltage': voltage,
            'current': current,
            'temperature': temperature,
            'state_of_charge': np.clip(soc, 0, 100),
            'state_of_health': np.clip(soh, 0, 100)
        })
