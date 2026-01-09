"""
Tests for RUL LSTM model
"""

import pytest
import numpy as np
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from models.rul_lstm import RULLSTMModel
from models.data_generator import BatteryDegradationGenerator


class TestRULLSTMModel:
    """Test RUL LSTM model"""
    
    def test_model_initialization(self):
        """Test model can be initialized"""
        model = RULLSTMModel(
            sequence_length=10,
            n_features=5,
            lstm_units=64
        )
        
        assert model.sequence_length == 10
        assert model.n_features == 5
        assert model.lstm_units == 64
        assert model.model is None
    
    def test_model_build(self):
        """Test model architecture can be built"""
        model = RULLSTMModel(
            sequence_length=10,
            n_features=5,
            lstm_units=64
        )
        
        keras_model = model.build_model()
        
        assert keras_model is not None
        assert model.model is not None
        assert model.model.input_shape == (None, 10, 5)
        assert model.model.output_shape == (None, 1)
    
    def test_model_prediction_shape(self):
        """Test model prediction output shape"""
        model = RULLSTMModel(
            sequence_length=10,
            n_features=5,
            lstm_units=64
        )
        model.build_model()
        
        # Create dummy input
        X = np.random.rand(5, 10, 5).astype(np.float32)
        
        predictions = model.predict(X)
        
        assert predictions.shape == (5,)
        assert all(isinstance(p, (int, float, np.number)) for p in predictions)
    
    def test_model_summary(self):
        """Test model summary"""
        model = RULLSTMModel(
            sequence_length=10,
            n_features=5,
            lstm_units=64
        )
        model.build_model()
        
        summary = model.get_model_summary()
        
        assert summary['sequence_length'] == 10
        assert summary['n_features'] == 5
        assert summary['lstm_units'] == 64
        assert summary['total_params'] > 0


class TestBatteryDegradationGenerator:
    """Test data generator"""
    
    def test_generate_single_lifecycle(self):
        """Test generating single battery lifecycle"""
        generator = BatteryDegradationGenerator(seed=42)
        
        df = generator.generate_battery_lifecycle(
            total_days=365,
            initial_soh=100.0,
            failure_threshold=70.0
        )
        
        assert len(df) == 365
        assert 'soc' in df.columns
        assert 'soh' in df.columns
        assert 'temperature' in df.columns
        assert 'voltage' in df.columns
        assert 'cycles' in df.columns
        assert 'rul' in df.columns
        
        # Check value ranges
        assert df['soc'].min() >= 0
        assert df['soc'].max() <= 100
        assert df['soh'].min() >= 70
        assert df['soh'].max() <= 100
        assert df['temperature'].min() >= 15
        assert df['temperature'].max() <= 45
        assert df['voltage'].min() >= 3.0
        assert df['voltage'].max() <= 4.2
        assert df['rul'].min() >= 0
    
    def test_generate_dataset(self):
        """Test generating multi-battery dataset"""
        generator = BatteryDegradationGenerator(seed=42)
        
        df = generator.generate_dataset(
            n_batteries=10,
            total_days=100,
            daily_readings=1
        )
        
        assert len(df) == 1000  # 10 batteries * 100 days
        assert df['battery_id'].nunique() == 10
    
    def test_create_sequences(self):
        """Test sequence creation"""
        generator = BatteryDegradationGenerator(seed=42)
        
        df = generator.generate_dataset(
            n_batteries=5,
            total_days=50,
            daily_readings=1
        )
        
        X, y = generator.create_sequences(
            df=df,
            sequence_length=10,
            feature_cols=['soc', 'soh', 'temperature', 'voltage', 'cycles']
        )
        
        assert len(X.shape) == 3  # (n_samples, sequence_length, n_features)
        assert X.shape[1] == 10  # sequence_length
        assert X.shape[2] == 5   # n_features
        assert len(y) == len(X)
    
    def test_split_data(self):
        """Test data splitting"""
        generator = BatteryDegradationGenerator(seed=42)
        
        X = np.random.rand(1000, 10, 5)
        y = np.random.rand(1000)
        
        X_train, X_val, X_test, y_train, y_val, y_test = generator.split_data(
            X, y,
            train_ratio=0.7,
            val_ratio=0.15,
            test_ratio=0.15
        )
        
        assert len(X_train) == 700
        assert len(X_val) == 150
        assert len(X_test) == 150
        assert len(y_train) == 700
        assert len(y_val) == 150
        assert len(y_test) == 150


class TestModelTraining:
    """Integration test for model training"""
    
    @pytest.mark.slow
    def test_small_scale_training(self):
        """Test model can train on small dataset"""
        # Generate small dataset
        generator = BatteryDegradationGenerator(seed=42)
        df = generator.generate_dataset(
            n_batteries=20,
            total_days=100,
            daily_readings=1
        )
        
        X, y = generator.create_sequences(df, sequence_length=10)
        X_train, X_val, X_test, y_train, y_val, y_test = generator.split_data(X, y)
        
        # Train model
        model = RULLSTMModel(
            sequence_length=10,
            n_features=5,
            lstm_units=32  # Smaller for faster testing
        )
        
        history = model.train(
            X_train, y_train,
            X_val, y_val,
            epochs=5,
            batch_size=32,
            patience=3,
            verbose=0
        )
        
        assert history is not None
        assert 'loss' in history
        assert 'val_loss' in history
        
        # Evaluate
        metrics = model.evaluate(X_test, y_test)
        
        assert 'mae' in metrics
        assert 'r2' in metrics
        assert metrics['mae'] >= 0
        assert metrics['r2'] <= 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
