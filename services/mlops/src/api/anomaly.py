"""
Anomaly detection API endpoints.
T138: Implement anomaly detection (Isolation Forest)
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Optional
import sys
from pathlib import Path

# Add ML service to path
ml_service_path = Path(__file__).parent.parent.parent.parent / "ml" / "src"
sys.path.insert(0, str(ml_service_path))

from anomaly_detection import AnomalyDetector, AnomalyFeatures

router = APIRouter(prefix="/api/v1/ml", tags=["anomaly-detection"])

# Global model instance
_anomaly_detector: Optional[AnomalyDetector] = None
_anomaly_detector_mtime_ns: Optional[int] = None


class AnomalyDetectionRequest(BaseModel):
    """Request body for anomaly detection."""
    battery_system_id: str = Field(..., description="Battery system identifier")
    features: Dict[str, float] = Field(
        ...,
        description="Battery features for anomaly detection",
        json_schema_extra={
            "example": {
                "temperature_delta": 0.5,
                "voltage_variance": 0.002,
                "soh_rate": 0.01
            }
        }
    )


class AnomalyDetectionResponse(BaseModel):
    """Response for anomaly detection."""
    battery_system_id: str
    is_anomaly: bool
    anomaly_score: float
    threshold: float
    feature_contributions: Dict[str, float]
    severity: str = Field(description="Severity level: low, medium, high")


class ModelMetricsResponse(BaseModel):
    """Response for model metrics."""
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    contamination: float
    is_trained: bool


def get_detector() -> AnomalyDetector:
    """Get or initialize the anomaly detector."""
    global _anomaly_detector, _anomaly_detector_mtime_ns
    
    if _anomaly_detector is None:
        # Use contamination=0.10 to match ~9% anomaly rate in training data
        _anomaly_detector = AnomalyDetector(contamination=0.10)
        
        # Try to load pre-trained model
        model_path = Path("data/models/anomaly_detector.joblib")
        if model_path.exists():
            try:
                _anomaly_detector.load(str(model_path))
                _anomaly_detector_mtime_ns = model_path.stat().st_mtime_ns
            except Exception as e:
                print(f"Failed to load model: {e}")
    else:
        model_path = Path("data/models/anomaly_detector.joblib")
        if model_path.exists():
            try:
                current_mtime_ns = model_path.stat().st_mtime_ns
                if _anomaly_detector_mtime_ns != current_mtime_ns:
                    _anomaly_detector.load(str(model_path))
                    _anomaly_detector_mtime_ns = current_mtime_ns
            except Exception as e:
                print(f"Failed to hot-reload model: {e}")
    
    return _anomaly_detector


def calculate_severity(score: float, threshold: float) -> str:
    """Calculate severity level based on anomaly score."""
    if not score:
        return "low"
    
    # Score is negative, more negative = more anomalous
    # Threshold is the boundary
    distance = abs(score - threshold)
    
    if score >= threshold:
        return "low"
    elif distance < 0.1:
        return "medium"
    else:
        return "high"


@router.post("/detect-anomaly", response_model=AnomalyDetectionResponse, status_code=status.HTTP_200_OK)
async def detect_anomaly(request: AnomalyDetectionRequest):
    """
    Detect anomalies in battery behavior patterns.
    
    Uses Isolation Forest to identify unusual patterns in:
    - Temperature changes (rapid heating/cooling)
    - Voltage variance (cell inconsistencies)
    - SoH degradation rate (abnormal aging)
    
    **Acceptance Criteria:**
    - Precision >80%
    - Recall >70%
    - Real-time scoring
    """
    detector = get_detector()
    
    if not detector.is_trained:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not trained. Train the model first using /train endpoint."
        )
    
    # Validate features
    required_features = {'temperature_delta', 'voltage_variance', 'soh_rate'}
    missing_features = required_features - set(request.features.keys())
    
    if missing_features:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required features: {missing_features}"
        )
    
    try:
        # Detect anomaly
        result = detector.detect(request.features)
        
        # Calculate severity
        severity = calculate_severity(result.anomaly_score, result.threshold)
        
        return AnomalyDetectionResponse(
            battery_system_id=request.battery_system_id,
            is_anomaly=result.is_anomaly,
            anomaly_score=result.anomaly_score,
            threshold=result.threshold,
            feature_contributions=result.feature_contributions,
            severity=severity
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anomaly detection failed: {str(e)}"
        )


@router.get("/anomaly-metrics", response_model=ModelMetricsResponse, status_code=status.HTTP_200_OK)
async def get_anomaly_metrics():
    """
    Get anomaly detection model metrics.
    
    Returns model performance metrics including precision, recall, and F1 score.
    """
    detector = get_detector()
    
    metrics = detector.get_metrics()
    
    return ModelMetricsResponse(
        precision=metrics.get('precision'),
        recall=metrics.get('recall'),
        f1_score=metrics.get('f1_score'),
        contamination=detector.contamination,
        is_trained=detector.is_trained
    )


@router.post("/train-anomaly", status_code=status.HTTP_200_OK)
async def train_anomaly_detector():
    """
    Train the anomaly detection model.
    
    Trains Isolation Forest on normal operation data.
    This is a simplified endpoint - in production, you would pass training data.
    """
    detector = get_detector()
    
    # Generate synthetic normal operation data for demonstration
    import numpy as np
    
    np.random.seed(42)
    n_samples = 200
    
    # Normal operation ranges
    temp_deltas = np.random.normal(0.5, 0.2, n_samples)
    voltage_vars = np.random.normal(0.002, 0.001, n_samples)
    soh_rates = np.random.normal(0.01, 0.005, n_samples)
    
    X_normal = np.column_stack([temp_deltas, voltage_vars, soh_rates])
    
    # Add some anomalies for validation - more extreme for better separation
    n_anomalies = 20
    temp_deltas_anom = np.random.normal(15.0, 3.0, n_anomalies)
    voltage_vars_anom = np.random.normal(0.15, 0.05, n_anomalies)
    soh_rates_anom = np.random.normal(1.5, 0.3, n_anomalies)
    
    X_anomaly = np.column_stack([temp_deltas_anom, voltage_vars_anom, soh_rates_anom])
    
    # Combine data
    X = np.vstack([X_normal, X_anomaly])
    y = np.array([0] * n_samples + [1] * n_anomalies)
    
    try:
        detector.train(X, y)
        
        # Save model
        model_path = Path("data/models/anomaly_detector.joblib")
        detector.save(str(model_path))
        
        metrics = detector.get_metrics()
        
        return {
            "status": "success",
            "message": "Model trained successfully",
            "metrics": metrics,
            "model_path": str(model_path)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Training failed: {str(e)}"
        )
