"""Unit tests for simulator implementation."""

import pytest
from datetime import datetime
from app.implementations.simulator import SimulatorSensor


@pytest.mark.unit
async def test_simulator_initialization(simulator):
    """Test simulator initializes correctly."""
    assert simulator._initialized
    assert simulator._noise_level == 0.01
    assert simulator._drift_enabled is False


@pytest.mark.unit
async def test_get_reading_creates_state(simulator, battery_id):
    """Test reading creates battery state."""
    reading = await simulator.get_reading(battery_id)

    assert reading["battery_system_id"] == battery_id
    assert 2.8 <= reading["voltage"] <= 4.3
    assert -50.0 <= reading["current"] <= 50.0
    assert 15.0 <= reading["temperature"] <= 45.0
    assert 0.0 <= reading["soc"] <= 100.0
    assert 0.0 <= reading["soh"] <= 100.0
    assert battery_id in simulator._battery_states


@pytest.mark.unit
async def test_deterministic_behavior(battery_id):
    """Test same seed produces same results."""
    sensor1 = SimulatorSensor(seed=42, drift_enabled=False)
    sensor2 = SimulatorSensor(seed=42, drift_enabled=False)

    await sensor1.initialize()
    await sensor2.initialize()

    reading1 = await sensor1.get_reading(battery_id)
    reading2 = await sensor2.get_reading(battery_id)

    assert reading1["voltage"] == reading2["voltage"]
    assert reading1["current"] == reading2["current"]

    await sensor1.shutdown()
    await sensor2.shutdown()


@pytest.mark.unit
async def test_voltage_soc_correlation(simulator, battery_id):
    """Test voltage increases with SoC."""
    readings = []

    for _ in range(5):
        reading = await simulator.get_reading(battery_id)
        readings.append(reading)

    # All readings should have consistent voltage-soc relationship
    for reading in readings:
        voltage = reading["voltage"]
        soc = reading["soc"]
        # Voltage should be roughly in range based on SoC
        expected_min = 3.0 + (soc / 100.0) * 1.2 - 0.2  # Allow noise
        expected_max = 3.0 + (soc / 100.0) * 1.2 + 0.2
        assert expected_min <= voltage <= expected_max


@pytest.mark.unit
async def test_power_calculation(simulator, battery_id):
    """Test power is calculated correctly."""
    reading = await simulator.get_reading(battery_id)

    voltage = reading["voltage"]
    current = reading["current"]
    power = reading["power"]

    # Power should equal voltage * current
    assert abs(power - (voltage * current)) < 0.01


@pytest.mark.unit
async def test_health_check(simulator):
    """Test health check returns correct info."""
    health = await simulator.health_check()

    assert health["backend_type"] == "simulator"
    assert health["status"] == "healthy"
    assert "batteries_tracked" in health["details"]
    assert "timestamp" in health


@pytest.mark.unit
async def test_metrics(simulator, battery_id):
    """Test metrics aggregation."""
    # Generate some readings first
    await simulator.get_reading(battery_id)

    metrics = await simulator.get_metrics(battery_id)

    assert metrics["battery_system_id"] == battery_id
    assert "current_reading" in metrics
    assert "statistics" in metrics
    assert "health_indicators" in metrics
