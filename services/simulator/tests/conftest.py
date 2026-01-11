"""Pytest configuration and fixtures."""

import pytest
import os
from httpx import AsyncClient

# Set test environment variables
os.environ["ENVIRONMENT"] = "test"
os.environ["SENSOR_BACKEND"] = "simulator"
os.environ["SIMULATOR_SEED"] = "42"
os.environ["SIMULATOR_NOISE_LEVEL"] = "0.01"
os.environ["SIMULATOR_DRIFT_ENABLED"] = "false"

from app.main import app
from app.implementations.simulator import SimulatorSensor


@pytest.fixture
async def simulator():
    """Create simulator instance for testing."""
    sensor = SimulatorSensor(
        seed=42,
        noise_level=0.01,
        drift_enabled=False,
        update_interval_ms=100,
        soc_decay_rate=0.1,
        soh_decay_rate=0.0001
    )
    await sensor.initialize()
    yield sensor
    await sensor.shutdown()


@pytest.fixture
async def client():
    """Create HTTP client for API testing."""
    # Initialize app state manually for testing
    sensor = SimulatorSensor(seed=42, noise_level=0.01, drift_enabled=False)
    await sensor.initialize()
    app.state.sensor = sensor

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Cleanup
    await sensor.shutdown()


@pytest.fixture
def battery_id():
    """Sample battery system ID."""
    return "test-battery-001"
