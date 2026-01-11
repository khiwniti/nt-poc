"""Integration tests for API endpoints."""

import pytest


@pytest.mark.integration
async def test_root_endpoint(client):
    """Test root endpoint."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "Battery Simulator Service"
    assert "backend" in data


@pytest.mark.integration
async def test_health_endpoint(client):
    """Test health check endpoint."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["service"] == "simulator"
    assert "sensor_backend" in data


@pytest.mark.integration
async def test_get_sensor_reading(client, battery_id):
    """Test getting single sensor reading."""
    response = await client.get(f"/api/sensors/reading/{battery_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "data" in data

    reading = data["data"]
    assert reading["battery_system_id"] == battery_id
    assert "voltage" in reading
    assert "current" in reading
    assert "temperature" in reading
    assert "soc" in reading
    assert "soh" in reading
    assert "power" in reading


@pytest.mark.integration
async def test_batch_readings(client):
    """Test batch readings endpoint."""
    battery_ids = ["BAT-001", "BAT-002", "BAT-003"]

    response = await client.post(
        "/api/sensors/readings/batch",
        json={"battery_system_ids": battery_ids}
    )
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["count"] == len(battery_ids)
    assert len(data["data"]) == len(battery_ids)

    for i, reading in enumerate(data["data"]):
        assert reading["battery_system_id"] == battery_ids[i]


@pytest.mark.integration
async def test_get_metrics(client, battery_id):
    """Test metrics endpoint."""
    response = await client.get(f"/api/sensors/metrics/{battery_id}")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "data" in data

    metrics = data["data"]
    assert metrics["battery_system_id"] == battery_id
    assert "current_reading" in metrics
    assert "statistics" in metrics
    assert "health_indicators" in metrics


@pytest.mark.integration
async def test_sensor_status(client):
    """Test sensor status endpoint."""
    response = await client.get("/api/sensors/status")
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert "backend" in data
    assert "health" in data
    assert "configuration" in data
