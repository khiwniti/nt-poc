"""
RUL prediction service and model management
"""

import os
import json
import numpy as np
from pathlib import Path
from typing import Optional, Dict, Any
import logging

import tensorflow as tf
from tensorflow import keras

logger = logging.getLogger(__name__)


class RULPredictionService:
    """Service for RUL predictions using LSTM model"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize RUL prediction service.
        
        Args:
            model_path: Path to trained model (.h5 file)
        """
        self.model = None
        self.metadata = {}
        self.model_version = "v1.0.0"
        self.feature_names = ['soc', 'soh', 'temperature', 'voltage', 'cycles']
        
        if model_path:
            self.load_model(model_path)
    
    def load_model(self, model_path: str):
        """
        Load trained model from file.
        
        Args:
            model_path: Path to model file
        """
        try:
            model_path = Path(model_path)
            
            if not model_path.exists():
                raise FileNotFoundError(f"Model file not found: {model_path}")
            
            # Load model
            self.model = keras.models.load_model(str(model_path))
            logger.info(f"Model loaded from {model_path}")
            
            # Load metadata if available
            metadata_path = model_path.parent / f"{model_path.stem}_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
                logger.info(f"Metadata loaded from {metadata_path}")
                
                # Update feature names if in metadata
                if 'feature_names' in self.metadata:
                    self.feature_names = self.metadata['feature_names']
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def predict(
        self,
        sequence: np.ndarray,
        return_confidence: bool = True
    ) -> Dict[str, Any]:
        """
        Make RUL prediction.
        
        Args:
            sequence: Input sequence (sequence_length, n_features)
            return_confidence: Whether to calculate confidence score
            
        Returns:
            Dictionary with prediction and confidence
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Validate input shape
        if len(sequence.shape) == 2:
            sequence = np.expand_dims(sequence, axis=0)
        
        # Make prediction
        prediction = self.model.predict(sequence, verbose=0)
        rul = float(prediction[0, 0])
        
        # Calculate confidence (simplified: based on model certainty)
        # In production, this could be based on prediction intervals or ensemble variance
        confidence = 0.90  # Placeholder
        
        # Adjust confidence based on reasonable ranges
        if rul < 0:
            confidence *= 0.5
            rul = max(0, rul)
        elif rul > 2000:  # Unreasonably high
            confidence *= 0.7
        
        return {
            'predicted_rul': rul,
            'confidence': confidence,
            'model_version': self.model_version,
            'features_used': self.feature_names
        }
    
    def predict_batch(
        self,
        sequences: np.ndarray
    ) -> np.ndarray:
        """
        Make batch predictions.
        
        Args:
            sequences: Input sequences (batch_size, sequence_length, n_features)
            
        Returns:
            Array of RUL predictions
        """
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        predictions = self.model.predict(sequences, verbose=0)
        return predictions.flatten()
    
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information.
        
        Returns:
            Dictionary with model metadata
        """
        info = {
            'model_version': self.model_version,
            'model_type': 'LSTM',
            'feature_names': self.feature_names,
            'loaded': self.model is not None
        }
        
        if self.model:
            info['sequence_length'] = self.model.input_shape[1]
            info['n_features'] = self.model.input_shape[2]
        
        if self.metadata:
            info['metrics'] = self.metadata.get('metrics', {})
        
        return info
    
    def validate_input(
        self,
        sequence: list
    ) -> np.ndarray:
        """
        Validate and convert input sequence.
        
        Args:
            sequence: List of lists representing the sequence
            
        Returns:
            Validated numpy array
        """
        try:
            arr = np.array(sequence, dtype=np.float32)
            
            if len(arr.shape) != 2:
                raise ValueError(f"Expected 2D sequence, got shape {arr.shape}")
            
            if self.model:
                expected_seq_len = self.model.input_shape[1]
                expected_n_features = self.model.input_shape[2]
                
                if arr.shape[0] != expected_seq_len:
                    raise ValueError(
                        f"Expected sequence length {expected_seq_len}, got {arr.shape[0]}"
                    )
                
                if arr.shape[1] != expected_n_features:
                    raise ValueError(
                        f"Expected {expected_n_features} features, got {arr.shape[1]}"
                    )
            
            return arr
            
        except Exception as e:
            raise ValueError(f"Invalid input sequence: {e}")


# Global service instance
_service: Optional[RULPredictionService] = None


def get_prediction_service() -> RULPredictionService:
    """
    Get or create prediction service singleton.
    
    Returns:
        RULPredictionService instance
    """
    global _service
    
    if _service is None:
        # Look for model in default location
        model_path = os.getenv(
            'RUL_MODEL_PATH',
            '/app/models/rul_lstm_model.h5'
        )
        
        # Try local path if environment path doesn't exist
        if not Path(model_path).exists():
            local_path = Path(__file__).parent.parent.parent / 'models' / 'rul_lstm_model.h5'
            if local_path.exists():
                model_path = str(local_path)
        
        _service = RULPredictionService()
        
        if Path(model_path).exists():
            try:
                _service.load_model(model_path)
            except Exception as e:
                logger.warning(f"Could not load model from {model_path}: {e}")
        else:
            logger.warning(f"Model not found at {model_path}. Predictions will fail until model is loaded.")
    
    return _service
