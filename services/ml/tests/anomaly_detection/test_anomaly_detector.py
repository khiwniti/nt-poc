"""
Tests for Isolation Forest anomaly detector.
T138: Implement anomaly detection
"""

import pytest
import numpy as np
import pandas as pd
from pathlib import Path
import tempfile

from src.anomaly_detection import AnomalyDetector, AnomalyFeatures, AnomalyResult


@pytest.fixture
def normal_data():
    """Generate normal operation data."""
    np.random.seed(42)
    n_samples = 200
    
    # Normal operation ranges
    temp_deltas = np.random.normal(0.5, 0.2, n_samples)  # ~0.5°C/hour
    voltage_vars = np.random.normal(0.002, 0.001, n_samples)  # ~0.002 V²
    soh_rates = np.random.normal(0.01, 0.005, n_samples)  # ~0.01%/day
    
    return np.column_stack([temp_deltas, voltage_vars, soh_rates])


@pytest.fixture
def anomaly_data():
    """Generate anomalous data."""
    np.random.seed(42)
    n_samples = 20
    
    # Anomalous behavior - more extreme for better separation
    temp_deltas = np.random.normal(15.0, 3.0, n_samples)  # Very rapid temp change
    voltage_vars = np.random.normal(0.15, 0.05, n_samples)  # Very high variance
    soh_rates = np.random.normal(1.5, 0.3, n_samples)  # Very fast degradation
    
    return np.column_stack([temp_deltas, voltage_vars, soh_rates])


@pytest.fixture
def detector():
    """Create a fresh detector instance."""
    return AnomalyDetector(contamination=0.05, random_state=42)


class TestAnomalyDetectorInitialization:
    """Test detector initialization and configuration."""
    
    def test_default_initialization(self):
        """Test detector initializes with default parameters."""
        detector = AnomalyDetector()
        
        assert detector.contamination == 0.05
        assert detector.n_estimators == 100
        assert detector.max_samples == 256
        assert detector.random_state == 42
        assert not detector.is_trained
        assert detector.model is None
    
    def test_custom_initialization(self):
        """Test detector initializes with custom parameters."""
        detector = AnomalyDetector(
            contamination=0.1,
            n_estimators=50,
            max_samples=128,
            random_state=123
        )
        
        assert detector.contamination == 0.1
        assert detector.n_estimators == 50
        assert detector.max_samples == 128
        assert detector.random_state == 123
    
    def test_feature_names(self):
        """Test feature names are correctly defined."""
        detector = AnomalyDetector()
        
        expected_features = ['temperature_delta', 'voltage_variance', 'soh_rate']
        assert detector.feature_names == expected_features


class TestAnomalyDetectorTraining:
    """Test model training functionality."""
    
    def test_train_with_numpy_array(self, detector, normal_data):
        """Test training with numpy array."""
        detector.train(normal_data)
        
        assert detector.is_trained
        assert detector.model is not None
        assert detector.threshold is not None
    
    def test_train_with_dataframe(self, detector, normal_data):
        """Test training with pandas DataFrame."""
        df = pd.DataFrame(
            normal_data,
            columns=['temperature_delta', 'voltage_variance', 'soh_rate']
        )
        
        detector.train(df)
        
        assert detector.is_trained
        assert detector.model is not None
    
    def test_train_with_anomaly_features(self, detector):
        """Test training with AnomalyFeatures objects."""
        features_list = [
            AnomalyFeatures(0.5, 0.002, 0.01),
            AnomalyFeatures(0.4, 0.003, 0.009),
            AnomalyFeatures(0.6, 0.002, 0.011),
            AnomalyFeatures(0.3, 0.001, 0.008),
            AnomalyFeatures(0.7, 0.004, 0.012),
            AnomalyFeatures(0.5, 0.002, 0.010),
            AnomalyFeatures(0.4, 0.003, 0.009),
            AnomalyFeatures(0.6, 0.002, 0.011),
            AnomalyFeatures(0.5, 0.002, 0.010),
            AnomalyFeatures(0.5, 0.002, 0.010),
        ]
        
        detector.train(features_list)
        
        assert detector.is_trained
    
    def test_train_insufficient_data(self, detector):
        """Test training fails with insufficient data."""
        X = np.array([[0.5, 0.002, 0.01]] * 5)  # Only 5 samples
        
        with pytest.raises(ValueError, match="Need at least 10 samples"):
            detector.train(X)
    
    def test_train_wrong_feature_count(self, detector):
        """Test training fails with wrong number of features."""
        X = np.random.rand(50, 5)  # 5 features instead of 3
        
        with pytest.raises(ValueError, match="Expected 3 features"):
            detector.train(X)
    
    def test_train_with_labels(self, detector, normal_data, anomaly_data):
        """Test training with validation labels."""
        # Combine normal and anomaly data
        X = np.vstack([normal_data, anomaly_data])
        y = np.array([0] * len(normal_data) + [1] * len(anomaly_data))
        
        detector.train(X, y)
        
        assert detector.is_trained
        assert 'precision' in detector.metrics
        assert 'recall' in detector.metrics
        assert 'f1_score' in detector.metrics
    
    def test_contamination_parameter(self, detector, normal_data):
        """Test contamination parameter affects threshold."""
        detector.train(normal_data)
        threshold_005 = detector.threshold
        
        # Train with higher contamination
        detector2 = AnomalyDetector(contamination=0.1, random_state=42)
        detector2.train(normal_data)
        threshold_010 = detector2.threshold
        
        # Higher contamination should give higher threshold
        assert threshold_010 != threshold_005


class TestAnomalyDetection:
    """Test anomaly detection functionality."""
    
    @pytest.fixture
    def trained_detector(self, detector, normal_data):
        """Provide a trained detector."""
        detector.train(normal_data)
        return detector
    
    def test_detect_normal_behavior(self, trained_detector):
        """Test detection of normal battery behavior."""
        features = AnomalyFeatures(
            temperature_delta=0.5,
            voltage_variance=0.002,
            soh_rate=0.01
        )
        
        result = trained_detector.detect(features)
        
        assert isinstance(result, AnomalyResult)
        assert isinstance(result.is_anomaly, bool)
        assert isinstance(result.anomaly_score, float)
        assert isinstance(result.threshold, float)
        assert isinstance(result.feature_contributions, dict)
        
        # Normal behavior should not be anomaly
        assert not result.is_anomaly
    
    def test_detect_anomalous_behavior(self, trained_detector):
        """Test detection of anomalous battery behavior."""
        features = AnomalyFeatures(
            temperature_delta=10.0,  # Rapid temperature change
            voltage_variance=0.1,    # High voltage variance
            soh_rate=1.0            # Fast degradation
        )
        
        result = trained_detector.detect(features)
        
        # Anomalous behavior should be detected
        assert result.is_anomaly
        assert result.anomaly_score < result.threshold
    
    def test_detect_with_dict(self, trained_detector):
        """Test detection with dictionary input."""
        features = {
            'temperature_delta': 0.5,
            'voltage_variance': 0.002,
            'soh_rate': 0.01
        }
        
        result = trained_detector.detect(features)
        
        assert isinstance(result, AnomalyResult)
    
    def test_detect_untrained_model(self, detector):
        """Test detection fails with untrained model."""
        features = AnomalyFeatures(0.5, 0.002, 0.01)
        
        with pytest.raises(RuntimeError, match="Model not trained"):
            detector.detect(features)
    
    def test_feature_contributions(self, trained_detector):
        """Test feature contributions sum to 1."""
        features = AnomalyFeatures(
            temperature_delta=5.0,
            voltage_variance=0.05,
            soh_rate=0.5
        )
        
        result = trained_detector.detect(features)
        
        # All features should be present
        assert 'temperature_delta' in result.feature_contributions
        assert 'voltage_variance' in result.feature_contributions
        assert 'soh_rate' in result.feature_contributions
        
        # Contributions should sum to ~1
        total = sum(result.feature_contributions.values())
        assert abs(total - 1.0) < 0.01
    
    def test_anomaly_score_consistency(self, trained_detector):
        """Test anomaly scores are consistent for same input."""
        features = AnomalyFeatures(0.5, 0.002, 0.01)
        
        result1 = trained_detector.detect(features)
        result2 = trained_detector.detect(features)
        
        assert result1.anomaly_score == result2.anomaly_score
        assert result1.is_anomaly == result2.is_anomaly


class TestBatchDetection:
    """Test batch detection functionality."""
    
    @pytest.fixture
    def trained_detector(self, detector, normal_data):
        """Provide a trained detector."""
        detector.train(normal_data)
        return detector
    
    def test_detect_batch(self, trained_detector):
        """Test batch detection."""
        features_list = [
            AnomalyFeatures(0.5, 0.002, 0.01),
            AnomalyFeatures(10.0, 0.1, 1.0),
            AnomalyFeatures(0.4, 0.003, 0.009),
        ]
        
        results = trained_detector.detect_batch(features_list)
        
        assert len(results) == 3
        assert all(isinstance(r, AnomalyResult) for r in results)
        
        # Second should be anomaly, others normal
        assert not results[0].is_anomaly
        assert results[1].is_anomaly
        assert not results[2].is_anomaly
    
    def test_detect_batch_with_dicts(self, trained_detector):
        """Test batch detection with dictionaries."""
        features_list = [
            {'temperature_delta': 0.5, 'voltage_variance': 0.002, 'soh_rate': 0.01},
            {'temperature_delta': 10.0, 'voltage_variance': 0.1, 'soh_rate': 1.0},
        ]
        
        results = trained_detector.detect_batch(features_list)
        
        assert len(results) == 2


class TestModelPersistence:
    """Test model saving and loading."""
    
    @pytest.fixture
    def trained_detector(self, detector, normal_data):
        """Provide a trained detector."""
        detector.train(normal_data)
        return detector
    
    def test_save_model(self, trained_detector):
        """Test model saving."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / 'anomaly_model.joblib'
            
            trained_detector.save(str(filepath))
            
            assert filepath.exists()
    
    def test_save_untrained_model(self, detector):
        """Test saving untrained model fails."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / 'model.joblib'
            
            with pytest.raises(RuntimeError, match="Cannot save untrained model"):
                detector.save(str(filepath))
    
    def test_load_model(self, trained_detector):
        """Test model loading."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / 'anomaly_model.joblib'
            
            # Save model
            trained_detector.save(str(filepath))
            
            # Create new detector and load
            new_detector = AnomalyDetector()
            new_detector.load(str(filepath))
            
            assert new_detector.is_trained
            assert new_detector.model is not None
            assert new_detector.threshold is not None
    
    def test_load_nonexistent_model(self, detector):
        """Test loading nonexistent model fails."""
        with pytest.raises(FileNotFoundError):
            detector.load('nonexistent_model.joblib')
    
    def test_save_load_preserves_predictions(self, trained_detector):
        """Test saved/loaded model produces same predictions."""
        features = AnomalyFeatures(0.5, 0.002, 0.01)
        
        # Get prediction from original model
        result1 = trained_detector.detect(features)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = Path(tmpdir) / 'model.joblib'
            
            # Save and load
            trained_detector.save(str(filepath))
            new_detector = AnomalyDetector()
            new_detector.load(str(filepath))
            
            # Get prediction from loaded model
            result2 = new_detector.detect(features)
            
            assert result1.is_anomaly == result2.is_anomaly
            assert abs(result1.anomaly_score - result2.anomaly_score) < 1e-6


class TestMetrics:
    """Test metrics calculation and retrieval."""
    
    def test_get_metrics_untrained(self, detector):
        """Test get_metrics on untrained model returns empty dict."""
        metrics = detector.get_metrics()
        
        assert metrics == {}
    
    def test_get_metrics_with_labels(self, detector, normal_data, anomaly_data):
        """Test metrics calculation with validation labels."""
        X = np.vstack([normal_data, anomaly_data])
        y = np.array([0] * len(normal_data) + [1] * len(anomaly_data))
        
        detector.train(X, y)
        metrics = detector.get_metrics()
        
        assert 'precision' in metrics
        assert 'recall' in metrics
        assert 'f1_score' in metrics
        assert 'contamination' in metrics
        
        # Check value ranges
        assert 0 <= metrics['precision'] <= 1
        assert 0 <= metrics['recall'] <= 1
        assert 0 <= metrics['f1_score'] <= 1
    
    def test_acceptance_criteria(self, normal_data, anomaly_data):
        """Test model meets acceptance criteria (Precision >80%, Recall >70%)."""
        # Create dataset with clear separation
        X = np.vstack([normal_data, anomaly_data])
        y = np.array([0] * len(normal_data) + [1] * len(anomaly_data))
        
        # Use higher contamination since we have ~9% anomalies in test data
        detector = AnomalyDetector(contamination=0.10, random_state=42)
        detector.train(X, y)
        metrics = detector.get_metrics()
        
        # Should meet acceptance criteria
        assert metrics['precision'] >= 0.80, f"Precision {metrics['precision']:.2f} < 0.80"
        assert metrics['recall'] >= 0.70, f"Recall {metrics['recall']:.2f} < 0.70"


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_zero_features(self, detector, normal_data):
        """Test detection with all zero features."""
        detector.train(normal_data)
        
        features = AnomalyFeatures(0.0, 0.0, 0.0)
        result = detector.detect(features)
        
        assert isinstance(result, AnomalyResult)
    
    def test_negative_features(self, detector, normal_data):
        """Test detection with negative feature values."""
        detector.train(normal_data)
        
        features = AnomalyFeatures(-1.0, 0.002, -0.5)
        result = detector.detect(features)
        
        assert isinstance(result, AnomalyResult)
    
    def test_extreme_values(self, detector, normal_data):
        """Test detection with extreme feature values."""
        detector.train(normal_data)
        
        features = AnomalyFeatures(1000.0, 10.0, 100.0)
        result = detector.detect(features)
        
        # Extreme values should be anomalous
        assert result.is_anomaly
