"""Tests for battery simulator."""
import pytest
from datetime import datetime
from src.generator import BatterySimulator

def test_battery_simulator_initialization():
    """Test simulator can be initialized."""
    sim = BatterySimulator(seed=42)
    assert sim is not None

def test_generate_timeseries():
    """Test timeseries generation produces valid data."""
    sim = BatterySimulator(seed=42)
    data = sim.generate_timeseries(
        start_time=datetime(2024, 1, 1),
        duration_hours=24,
        interval_minutes=60
    )

    assert len(data) == 24
    assert list(data.columns) == [
        'timestamp', 'battery_id', 'voltage', 'current',
        'temperature', 'state_of_charge', 'state_of_health'
    ]
    assert data['state_of_charge'].between(0, 100).all()
    assert data['state_of_health'].between(0, 100).all()
