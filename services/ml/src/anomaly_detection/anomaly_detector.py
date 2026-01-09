"""
Isolation Forest-based anomaly detection for battery systems.
T138: Implement anomaly detection (Isolation Forest)

Detects abnormal temperature, voltage, or degradation rates in battery behavior.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from sklearn.ensemble import IsolationForest
from sklearn.metrics import precision_score, recall_score, f1_score
import joblib
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AnomalyFeatures:
    """Features for anomaly detection."""
    temperature_delta: float  # Temperature change rate (°C/hour)
    voltage_variance: float   # Voltage variance across cells (V²)
    soh_rate: float          # State of Health degradation rate (%/day)


@dataclass
class AnomalyResult:
    """Result of anomaly detection."""
    is_anomaly: bool
    anomaly_score: float
    threshold: float
    feature_contributions: Dict[str, float]


class AnomalyDetector:
    """
    Isolation Forest anomaly detector for battery behavior patterns.
    
    Features:
    - Temperature delta: Detects rapid temperature changes
    - Voltage variance: Identifies voltage inconsistencies across cells
    - SoH rate: Catches abnormal degradation patterns
    
    Model: Isolation Forest with contamination=0.05
    Target: Precision >80%, Recall >70%
    """
    
    MODEL_VERSION = 'v1.0.0'
    CONTAMINATION = 0.05  # 5% expected anomaly rate
    RANDOM_STATE = 42
    
    def __init__(
        self,
        contamination: float = CONTAMINATION,
        n_estimators: int = 100,
        max_samples: int = 256,
        random_state: int = RANDOM_STATE
    ):
        """
        Initialize anomaly detector.
        
        Args:
            contamination: Proportion of outliers in dataset (default: 0.05)
            n_estimators: Number of isolation trees (default: 100)
            max_samples: Number of samples to draw for each tree (default: 256)
            random_state: Random seed for reproducibility
        """
        self.contamination = contamination
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.random_state = random_state
        
        self.model: Optional[IsolationForest] = None
        self.is_trained: bool = False
        self.threshold: Optional[float] = None
        self.feature_names = ['temperature_delta', 'voltage_variance', 'soh_rate']
        self.metrics: Dict[str, float] = {}
        
    def _extract_features(self, features: Union[AnomalyFeatures, Dict[str, float]]) -> np.ndarray:
        """Extract feature vector from AnomalyFeatures or dict."""
        if isinstance(features, AnomalyFeatures):
            return np.array([
                features.temperature_delta,
                features.voltage_variance,
                features.soh_rate
            ])
        else:
            return np.array([
                features['temperature_delta'],
                features['voltage_variance'],
                features['soh_rate']
            ])
    
    def train(
        self,
        X: Union[pd.DataFrame, np.ndarray, List[AnomalyFeatures]],
        y: Optional[np.ndarray] = None
    ) -> None:
        """
        Train Isolation Forest on normal operation data.
        
        Args:
            X: Training features (normal operation data)
               Can be DataFrame, ndarray, or list of AnomalyFeatures
            y: Optional labels for validation (1 = anomaly, 0 = normal)
        """
        # Convert input to numpy array
        if isinstance(X, list) and len(X) > 0 and isinstance(X[0], AnomalyFeatures):
            X_array = np.array([self._extract_features(f) for f in X])
        elif isinstance(X, pd.DataFrame):
            X_array = X[self.feature_names].values
        else:
            X_array = np.array(X)
        
        if X_array.shape[0] < 10:
            raise ValueError("Need at least 10 samples for training")
        
        if X_array.shape[1] != 3:
            raise ValueError(f"Expected 3 features, got {X_array.shape[1]}")
        
        logger.info(f"Training Isolation Forest on {X_array.shape[0]} samples...")
        logger.info(f"Contamination: {self.contamination}, Trees: {self.n_estimators}")
        
        # Create and train Isolation Forest
        self.model = IsolationForest(
            contamination=self.contamination,
            n_estimators=self.n_estimators,
            max_samples=self.max_samples,
            random_state=self.random_state,
            n_jobs=-1
        )
        
        self.model.fit(X_array)
        self.is_trained = True
        
        # Calculate threshold from decision scores
        scores = self.model.score_samples(X_array)
        self.threshold = np.percentile(scores, self.contamination * 100)
        
        logger.info(f"Training complete. Threshold: {self.threshold:.4f}")
        
        # Validate if labels provided
        if y is not None:
            self._calculate_metrics(X_array, y)
    
    def _calculate_metrics(self, X: np.ndarray, y_true: np.ndarray) -> None:
        """Calculate precision, recall, F1 score."""
        if not self.is_trained or self.model is None:
            return
        
        y_pred = self.model.predict(X)
        # Convert IsolationForest output: -1 (anomaly) -> 1, 1 (normal) -> 0
        y_pred_binary = (y_pred == -1).astype(int)
        
        # Ensure y_true is binary (0/1)
        y_true_binary = (y_true > 0).astype(int)
        
        self.metrics = {
            'precision': precision_score(y_true_binary, y_pred_binary, zero_division=0),
            'recall': recall_score(y_true_binary, y_pred_binary, zero_division=0),
            'f1_score': f1_score(y_true_binary, y_pred_binary, zero_division=0),
            'contamination': self.contamination
        }
        
        logger.info(f"Validation metrics:")
        logger.info(f"  Precision: {self.metrics['precision']:.3f}")
        logger.info(f"  Recall: {self.metrics['recall']:.3f}")
        logger.info(f"  F1 Score: {self.metrics['f1_score']:.3f}")
        
        # Check if meets acceptance criteria
        if self.metrics['precision'] >= 0.80 and self.metrics['recall'] >= 0.70:
            logger.info("✅ Meets acceptance criteria (Precision >80%, Recall >70%)")
        else:
            logger.warning("⚠️  Does not meet acceptance criteria")
    
    def detect(
        self,
        features: Union[AnomalyFeatures, Dict[str, float]]
    ) -> AnomalyResult:
        """
        Detect if battery behavior is anomalous.
        
        Args:
            features: Battery features to analyze
        
        Returns:
            AnomalyResult with detection outcome and details
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Model not trained. Call train() first.")
        
        # Extract features
        X = self._extract_features(features).reshape(1, -1)
        
        # Get anomaly score
        score = self.model.score_samples(X)[0]
        
        # Predict anomaly (-1 = anomaly, 1 = normal)
        prediction = self.model.predict(X)[0]
        is_anomaly = (prediction == -1)
        
        # Calculate feature contributions using decision path
        # Normalized feature importance based on isolation depth
        feature_values = X[0]
        feature_contributions = {}
        
        for i, name in enumerate(self.feature_names):
            # Simple contribution: normalized absolute value
            contrib = abs(feature_values[i])
            feature_contributions[name] = float(contrib)
        
        # Normalize contributions to sum to 1
        total = sum(feature_contributions.values())
        if total > 0:
            feature_contributions = {
                k: v/total for k, v in feature_contributions.items()
            }
        
        return AnomalyResult(
            is_anomaly=bool(is_anomaly),
            anomaly_score=float(score),
            threshold=float(self.threshold) if self.threshold else 0.0,
            feature_contributions=feature_contributions
        )
    
    def detect_batch(
        self,
        features_list: List[Union[AnomalyFeatures, Dict[str, float]]]
    ) -> List[AnomalyResult]:
        """
        Detect anomalies for multiple samples.
        
        Args:
            features_list: List of battery features
        
        Returns:
            List of AnomalyResults
        """
        return [self.detect(features) for features in features_list]
    
    def get_metrics(self) -> Dict[str, float]:
        """Get model performance metrics."""
        return self.metrics.copy()
    
    def save(self, filepath: str) -> None:
        """
        Save model to disk.
        
        Args:
            filepath: Path to save model file
        """
        if not self.is_trained or self.model is None:
            raise RuntimeError("Cannot save untrained model")
        
        model_data = {
            'model': self.model,
            'threshold': self.threshold,
            'contamination': self.contamination,
            'metrics': self.metrics,
            'version': self.MODEL_VERSION
        }
        
        Path(filepath).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model_data, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load(self, filepath: str) -> None:
        """
        Load model from disk.
        
        Args:
            filepath: Path to model file
        """
        if not Path(filepath).exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        model_data = joblib.load(filepath)
        
        self.model = model_data['model']
        self.threshold = model_data['threshold']
        self.contamination = model_data.get('contamination', self.CONTAMINATION)
        self.metrics = model_data.get('metrics', {})
        self.is_trained = True
        
        logger.info(f"Model loaded from {filepath}")
        logger.info(f"Version: {model_data.get('version', 'unknown')}")
