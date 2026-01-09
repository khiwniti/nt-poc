"""
RUL prediction request/response models
"""

from pydantic import BaseModel, Field
from typing import List, Optional


class RULPredictionRequest(BaseModel):
    """Request model for RUL prediction"""
    
    sequence: List[List[float]] = Field(
        ...,
        description="Sequence of battery measurements (sequence_length x n_features)",
        example=[
            [85.0, 92.5, 25.0, 3.85, 450],
            [80.0, 92.3, 26.0, 3.80, 451],
            [75.0, 92.1, 25.5, 3.75, 452]
        ]
    )
    
    battery_system_id: Optional[str] = Field(
        None,
        description="Battery system ID for tracking"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
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
                "battery_system_id": "battery-uuid-123"
            }
        }


class RULPredictionResponse(BaseModel):
    """Response model for RUL prediction"""
    
    predicted_rul: float = Field(
        ...,
        description="Predicted remaining useful life in days"
    )
    
    confidence: float = Field(
        ...,
        description="Prediction confidence score (0-1)",
        ge=0.0,
        le=1.0
    )
    
    model_version: str = Field(
        ...,
        description="Model version used for prediction"
    )
    
    features_used: List[str] = Field(
        ...,
        description="Feature names in order"
    )
    
    battery_system_id: Optional[str] = Field(
        None,
        description="Battery system ID if provided"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "predicted_rul": 245.5,
                "confidence": 0.92,
                "model_version": "v1.0.0",
                "features_used": ["soc", "soh", "temperature", "voltage", "cycles"],
                "battery_system_id": "battery-uuid-123"
            }
        }


class ModelInfoResponse(BaseModel):
    """Model information response"""
    
    model_version: str
    model_type: str
    sequence_length: int
    n_features: int
    feature_names: List[str]
    metrics: dict
    loaded: bool
