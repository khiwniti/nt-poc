"""Test health check endpoint"""
import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_check():
    """Test health check endpoint returns 200 and correct data"""
    response = client.get("/health")
    assert response.status_code == 200
    
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "mlops"
    assert "timestamp" in data
    assert "version" in data
    assert data["python_version"].startswith("3.")


def test_root_endpoint():
    """Test root endpoint returns service information"""
    response = client.get("/")
    assert response.status_code == 200
    
    data = response.json()
    assert data["service"] == "MLOps Service"
    assert data["version"] == "1.0.0"
    assert data["status"] == "running"
    assert data["docs"] == "/docs"


def test_latency_endpoint():
    """Test latency endpoint returns stats structure"""
    response = client.get("/ml/latency")
    assert response.status_code == 200
    data = response.json()
    assert "overall" in data
    assert "by_path" in data
