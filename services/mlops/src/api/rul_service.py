"""
RUL prediction service and model management
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

import numpy as np

from ..config import settings
from ..serving.model_cache import ModelCache

logger = logging.getLogger(__name__)


class RULPredictionService:
    """Service for RUL predictions using LSTM model"""

    def __init__(
        self, model_path: Optional[str] = None, model_cache: Optional[ModelCache] = None
    ):
        """
        Initialize RUL prediction service.

        Args:
            model_path: Path to trained model (.h5 file)
        """
        self.model = None
        self.metadata: Dict[str, Any] = {}
        self.model_path: Optional[str] = None
        self._model_cache = model_cache or ModelCache(max_models=4)
        self.model_version = "v1.0.0"
        self.feature_names = ["soc", "soh", "temperature", "voltage", "cycles"]

        if model_path:
            self.load_model(model_path)

    def load_model(self, model_path: str):
        """
        Load trained model from file.

        Args:
            model_path: Path to model file
        """
        path = Path(model_path).expanduser().resolve()
        artifact = self._model_cache.get(path, force_reload=True)
        self.model_path = str(artifact.path)
        self.model = artifact.model
        self.metadata = artifact.metadata or {}

        logger.info("Model loaded from %s", artifact.path)

        if "feature_names" in self.metadata:
            self.feature_names = list(self.metadata["feature_names"])

    def reload_model(self) -> None:
        """Force model reload from disk."""
        if not self.model_path:
            raise RuntimeError("No model_path configured for reload")
        artifact = self._model_cache.get(self.model_path, force_reload=True)
        self.model = artifact.model
        self.metadata = artifact.metadata or {}
        if "feature_names" in self.metadata:
            self.feature_names = list(self.metadata["feature_names"])

    def _refresh_model_if_updated(self) -> None:
        """Hot-reload the model if its file has been updated."""
        if not self.model_path:
            return
        artifact = self._model_cache.get(self.model_path, force_reload=False)
        if artifact.model is not self.model:
            self.model = artifact.model
            self.metadata = artifact.metadata or {}
            if "feature_names" in self.metadata:
                self.feature_names = list(self.metadata["feature_names"])

    def predict(
        self, sequence: np.ndarray, return_confidence: bool = True
    ) -> Dict[str, Any]:
        """
        Make RUL prediction.

        Args:
            sequence: Input sequence (sequence_length, n_features)
            return_confidence: Whether to calculate confidence score

        Returns:
            Dictionary with prediction and confidence
        """
        self._refresh_model_if_updated()
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
            "predicted_rul": rul,
            "confidence": confidence,
            "model_version": self.model_version,
            "features_used": self.feature_names,
        }

    def predict_batch(self, sequences: np.ndarray) -> np.ndarray:
    def predict_batch(
        self,
        sequences: np.ndarray,
        batch_size: Optional[int] = None
    ) -> np.ndarray:
        """
        Make batch predictions with optimized internal batching.
        
        Args:
            sequences: Input sequences (batch_size, sequence_length, n_features)
            batch_size: Internal TensorFlow batch size for predictions (default: from config)
            
        Returns:
            Array of RUL predictions
        """
        self._refresh_model_if_updated()
        if self.model is None:
            raise RuntimeError("Model not loaded")
        
        # Use config batch size if not provided
        if batch_size is None:
            batch_size = settings.PREDICTION_BATCH_SIZE
        
        # Make predictions with internal batching for better performance
        predictions = self.model.predict(sequences, batch_size=batch_size, verbose=0)
        return predictions.flatten()


    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information.

        Returns:
            Dictionary with model metadata
        """
        info = {
            "model_version": self.model_version,
            "model_type": "LSTM",
            "feature_names": self.feature_names,
            "loaded": self.model is not None,
        }

        self._refresh_model_if_updated()
        if self.model:
            info["sequence_length"] = self.model.input_shape[1]
            info["n_features"] = self.model.input_shape[2]

        if self.metadata:
            info["metrics"] = self.metadata.get("metrics", {})

        return info

    def validate_input(self, sequence: list) -> np.ndarray:
        """
        Validate and convert input sequence.

        Args:
            sequence: List of lists representing the sequence

        Returns:
            Validated numpy array
        """
        try:
            self._refresh_model_if_updated()
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

    def validate_batch_input(self, sequences: list) -> np.ndarray:
        """
        Validate and convert a batch of sequences.

        Args:
            sequences: List of sequences (batch_size x sequence_length x n_features)

        Returns:
            Validated numpy array (batch_size, sequence_length, n_features)
        """
        try:
            self._refresh_model_if_updated()
            arr = np.array(sequences, dtype=np.float32)

            if len(arr.shape) != 3:
                raise ValueError(f"Expected 3D batch, got shape {arr.shape}")

            if arr.shape[0] > settings.BATCH_MAX_SIZE:
                raise ValueError(
                    f"Batch size {arr.shape[0]} exceeds max {settings.BATCH_MAX_SIZE}"
                )

            if self.model:
                expected_seq_len = self.model.input_shape[1]
                expected_n_features = self.model.input_shape[2]

                if arr.shape[1] != expected_seq_len:
                    raise ValueError(
                        f"Expected sequence length {expected_seq_len}, got {arr.shape[1]}"
                    )

                if arr.shape[2] != expected_n_features:
                    raise ValueError(
                        f"Expected {expected_n_features} features, got {arr.shape[2]}"
                    )

            return arr

        except Exception as e:
            raise ValueError(f"Invalid batch input: {e}")


# Global service instance
_service: Optional[RULPredictionService] = None
_model_cache: Optional[ModelCache] = None


def get_prediction_service() -> RULPredictionService:
    """
    Get or create prediction service singleton.

    Returns:
        RULPredictionService instance
    """
    global _service, _model_cache

    if _service is None:
        # Look for model in default location
        model_path = os.getenv("RUL_MODEL_PATH", "/app/models/rul_lstm_model.h5")

        # Try local path if environment path doesn't exist
        if not Path(model_path).exists():
            local_path = (
                Path(__file__).parent.parent.parent / "models" / "rul_lstm_model.h5"
            )
            if local_path.exists():
                model_path = str(local_path)

        _model_cache = ModelCache(max_models=4)
        _service = RULPredictionService(model_cache=_model_cache)

        if Path(model_path).exists():
            try:
                _service.load_model(model_path)
            except Exception as e:
                logger.warning(f"Could not load model from {model_path}: {e}")
        else:
            logger.warning(
                f"Model not found at {model_path}. Predictions will fail until model is loaded."
            )

    return _service
