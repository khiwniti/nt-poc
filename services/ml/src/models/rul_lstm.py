"""
LSTM-based RUL (Remaining Useful Life) prediction model for battery systems.

Features:
- 2-layer LSTM architecture with 64 units per layer
- Input features: SoC, SoH, temperature, voltage, cycle count
- Output: Predicted RUL in days
- Trained on synthetic battery degradation curves
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models, callbacks
from typing import Tuple, Dict, Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def huber_loss(y_true, y_pred, delta=10.0):
    """
    Huber loss - robust to outliers.

    More robust than MSE for RUL prediction where some batteries
    may have unusual degradation patterns.

    Args:
        y_true: True RUL values
        y_pred: Predicted RUL values
        delta: Threshold (10 days is reasonable for RUL)

    Returns:
        Huber loss value
    """
    error = y_true - y_pred
    is_small_error = tf.abs(error) <= delta
    squared_loss = 0.5 * tf.square(error)
    linear_loss = delta * tf.abs(error) - 0.5 * tf.square(delta)
    return tf.reduce_mean(tf.where(is_small_error, squared_loss, linear_loss))


class RULLSTMModel:
    """LSTM model for RUL prediction"""
    
    def __init__(
        self,
        sequence_length: int = 10,
        n_features: int = 5,
        lstm_units: int = 64,
        dropout_rate: float = 0.2
    ):
        """
        Initialize RUL LSTM model.
        
        Args:
            sequence_length: Number of time steps in input sequences
            n_features: Number of input features (SoC, SoH, temp, voltage, cycles)
            lstm_units: Number of units in each LSTM layer
            dropout_rate: Dropout rate for regularization
        """
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.lstm_units = lstm_units
        self.dropout_rate = dropout_rate
        self.model = None
        self.history = None
        
    def build_model(self) -> keras.Model:
        """
        Build LSTM model architecture.
        
        Architecture:
        - Input: (sequence_length, n_features)
        - LSTM Layer 1: 64 units, return sequences
        - Dropout: 0.2
        - LSTM Layer 2: 64 units
        - Dropout: 0.2
        - Dense: 32 units, ReLU activation
        - Output: 1 unit (RUL prediction)
        
        Returns:
            Compiled Keras model
        """
        model = models.Sequential([
            layers.Input(shape=(self.sequence_length, self.n_features)),
            
            # First LSTM layer
            layers.LSTM(
                self.lstm_units,
                return_sequences=True,
                name='lstm_1'
            ),
            layers.Dropout(self.dropout_rate),
            
            # Second LSTM layer
            layers.LSTM(
                self.lstm_units,
                return_sequences=False,
                name='lstm_2'
            ),
            layers.Dropout(self.dropout_rate),
            
            # Dense layers
            layers.Dense(32, activation='relu', name='dense_1'),
            layers.Dense(1, activation='linear', name='output')
        ])
        
        # Compile model with Huber loss (robust to outliers)
        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss=huber_loss,  # Changed from 'mse' for better robustness
            metrics=['mae', 'mse']
        )
        
        self.model = model
        
        logger.info("Model architecture:")
        model.summary(print_fn=logger.info)
        
        return model
    
    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: int = 100,
        batch_size: int = 32,
        patience: int = 15,
        verbose: int = 1
    ) -> Dict[str, Any]:
        """
        Train the LSTM model.
        
        Args:
            X_train: Training features (n_samples, sequence_length, n_features)
            y_train: Training targets (n_samples,)
            X_val: Validation features
            y_val: Validation targets
            epochs: Maximum training epochs
            batch_size: Batch size for training
            patience: Early stopping patience
            verbose: Verbosity level
            
        Returns:
            Training history dictionary
        """
        if self.model is None:
            self.build_model()
        
        # Callbacks
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=patience,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )
        
        logger.info(f"Training with {len(X_train)} samples, validating with {len(X_val)} samples")
        
        # Train model
        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, reduce_lr],
            verbose=verbose
        )
        
        self.history = history
        
        return history.history
    
    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """
        Evaluate model on test set with comprehensive metrics.

        Args:
            X_test: Test features
            y_test: Test targets

        Returns:
            Dictionary of evaluation metrics
        """
        if self.model is None:
            raise ValueError("Model not built or loaded")

        # Get predictions
        y_pred = self.model.predict(X_test, verbose=0).flatten()

        # Core metrics
        mae = float(np.mean(np.abs(y_test - y_pred)))
        mse = float(np.mean((y_test - y_pred) ** 2))
        rmse = float(np.sqrt(mse))

        # MAPE (Mean Absolute Percentage Error)
        mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1))) * 100)

        # R² score
        ss_res = np.sum((y_test - y_pred) ** 2)
        ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
        r2 = float(1 - (ss_res / ss_tot))

        # Prognostic Horizon - percentage within thresholds
        within_10_days = float(np.mean(np.abs(y_test - y_pred) <= 10) * 100)
        within_30_days = float(np.mean(np.abs(y_test - y_pred) <= 30) * 100)

        # Critical phase accuracy (RUL < 100 days)
        critical_mask = y_test < 100
        if np.any(critical_mask):
            critical_mae = float(np.mean(np.abs(y_test[critical_mask] - y_pred[critical_mask])))
        else:
            critical_mae = 0.0

        metrics = {
            'mae': mae,
            'mse': mse,
            'rmse': rmse,
            'mape': mape,
            'r2': r2,
            'within_10_days_pct': within_10_days,
            'within_30_days_pct': within_30_days,
            'critical_phase_mae': critical_mae
        }

        logger.info("=== Test Set Metrics ===")
        logger.info(f"  MAE: {mae:.2f} days")
        logger.info(f"  RMSE: {rmse:.2f} days")
        logger.info(f"  MAPE: {mape:.2f}%")
        logger.info(f"  R²: {r2:.4f}")
        logger.info(f"  Within 10 days: {within_10_days:.1f}%")
        logger.info(f"  Within 30 days: {within_30_days:.1f}%")
        logger.info(f"  Critical phase MAE: {critical_mae:.2f} days")

        return metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make RUL predictions.
        
        Args:
            X: Input features (n_samples, sequence_length, n_features)
            
        Returns:
            RUL predictions in days
        """
        if self.model is None:
            raise ValueError("Model not built or loaded")
        
        predictions = self.model.predict(X, verbose=0)
        return predictions.flatten()
    
    def save(self, filepath: str):
        """
        Save model to .h5 format.
        
        Args:
            filepath: Path to save model (should end with .h5)
        """
        if self.model is None:
            raise ValueError("No model to save")
        
        self.model.save(filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str):
        """
        Load model from .h5 format.
        
        Args:
            filepath: Path to model file
        """
        self.model = keras.models.load_model(filepath)
        logger.info(f"Model loaded from {filepath}")
    
    def get_model_summary(self) -> Dict[str, Any]:
        """
        Get model configuration summary.
        
        Returns:
            Dictionary with model parameters
        """
        return {
            'sequence_length': self.sequence_length,
            'n_features': self.n_features,
            'lstm_units': self.lstm_units,
            'dropout_rate': self.dropout_rate,
            'total_params': self.model.count_params() if self.model else 0
        }
