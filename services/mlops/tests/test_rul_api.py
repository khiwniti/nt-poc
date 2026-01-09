"""
Tests for RUL prediction API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
import numpy as np

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from main import app
from api.rul_service import RULPredictionService


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.fixture
def mock_service():
    """Mock prediction service"""
    service = Mock(spec=RULPredictionService)
    service.validate_input.return_value = np.random.rand(10, 5)
    service.predict.return_value = {
        'predicted_rul': 245.5,
        'confidence': 0.92,
        'model_version': 'v1.0.0',
        'features_used': ['soc', 'soh', 'temperature', 'voltage', 'cycles']
    }
    service.get_model_info.return_value = {
        'model_version': 'v1.0.0',
        'model_type': 'LSTM',
        'sequence_length': 10,
        'n_features': 5,
        'feature_names': ['soc', 'soh', 'temperature', 'voltage', 'cycles'],
        'metrics': {'mae': 8.5, 'r2': 0.89},
        'loaded': True
    }
    return service


class TestHealthEndpoint:
    """Test health check endpoint"""
    
    def test_health_check(self, client):
        """Test health endpoint returns 200"""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        assert data['service'] == 'mlops'


class TestRULPredictionEndpoint:
    """Test RUL prediction endpoint"""
    
    @patch('api.routes.get_prediction_service')
    def test_predict_rul_success(self, mock_get_service, client, mock_service):
        """Test successful RUL prediction"""
        mock_get_service.return_value = mock_service
        
        request_data = {
            "sequence": [
                [85.0, 92.5, 25.0, 3.85, 450],
                [80.0, 92.3, 26.0, 3.80, 451],
                [75.0, 92.1, 25.5, 3.75, 452],
                [90.0, 92.0, 24.0, 3.90, 453],
                [85.0, 91.8, 25.0, 3.85, 454],
                [80.0, 91.6, 26.0, 3.80, 455],
                [75.0, 91.4, 25.5, 3.75, 456],
                [90.0, 91.2, 24.0, 3.90, 457],
                [85.0, 91.0, 25.0, 3.85, 458],
                [80.0, 90.8, 26.0, 3.80, 459]
            ],
            "battery_system_id": "test-battery-123"
        }
        
        response = client.post("/ml/predict-rul", json=request_data)
        
        assert response.status_code == 200
        data = response.json()
        assert 'predicted_rul' in data
        assert 'confidence' in data
        assert 'model_version' in data
        assert data['battery_system_id'] == "test-battery-123"
        assert 0 <= data['confidence'] <= 1
    
    @patch('api.routes.get_prediction_service')
    def test_predict_rul_validation_error(self, mock_get_service, client, mock_service):
        """Test prediction with invalid input"""
        mock_service.validate_input.side_effect = ValueError("Invalid input")
        mock_get_service.return_value = mock_service
        
        request_data = {
            "sequence": [[1, 2, 3]]  # Wrong shape
        }
        
        response = client.post("/ml/predict-rul", json=request_data)
        
        assert response.status_code == 400
    
    @patch('api.routes.get_prediction_service')
    def test_predict_rul_model_not_loaded(self, mock_get_service, client, mock_service):
        """Test prediction when model is not loaded"""
        mock_service.predict.side_effect = RuntimeError("Model not loaded")
        mock_get_service.return_value = mock_service
        
        request_data = {
            "sequence": [[1, 2, 3, 4, 5]] * 10
        }
        
        response = client.post("/ml/predict-rul", json=request_data)
        
        assert response.status_code == 503


class TestModelInfoEndpoint:
    """Test model info endpoint"""
    
    @patch('api.routes.get_prediction_service')
    def test_get_model_info(self, mock_get_service, client, mock_service):
        """Test getting model information"""
        mock_get_service.return_value = mock_service
        
        response = client.get("/ml/model-info")
        
        assert response.status_code == 200
        data = response.json()
        assert 'model_version' in data
        assert 'model_type' in data
        assert 'feature_names' in data
        assert data['model_type'] == 'LSTM'


class TestRULPredictionService:
    """Test RUL prediction service class"""
    
    def test_service_initialization(self):
        """Test service can be initialized"""
        service = RULPredictionService()
        
        assert service.model is None
        assert service.model_version == 'v1.0.0'
        assert len(service.feature_names) == 5
    
    def test_validate_input_correct_shape(self):
        """Test input validation with correct shape"""
        service = RULPredictionService()
        
        # Mock model with expected shapes
        service.model = Mock()
        service.model.input_shape = (None, 10, 5)
        
        sequence = [[1.0, 2.0, 3.0, 4.0, 5.0]] * 10
        
        result = service.validate_input(sequence)
        
        assert result.shape == (10, 5)
        assert result.dtype == np.float32
    
    def test_validate_input_wrong_shape(self):
        """Test input validation with wrong shape"""
        service = RULPredictionService()
        
        # Mock model with expected shapes
        service.model = Mock()
        service.model.input_shape = (None, 10, 5)
        
        sequence = [[1.0, 2.0, 3.0]] * 5  # Wrong: 5 time steps, 3 features
        
        with pytest.raises(ValueError):
            service.validate_input(sequence)
    
    def test_get_model_info_no_model(self):
        """Test getting model info when no model loaded"""
        service = RULPredictionService()
        
        info = service.get_model_info()
        
        assert info['loaded'] is False
        assert info['model_version'] == 'v1.0.0'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
