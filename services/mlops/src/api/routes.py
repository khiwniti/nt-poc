"""API routes for MLOps service"""
from fastapi import APIRouter, status, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, UTC
import platform
import sys
import logging

import sentry_sdk

from .models import (
    RULPredictionRequest,
    RULPredictionResponse,
    ModelInfoResponse
)
from .rul_service import get_prediction_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint
    
    Returns service health status and system information
    """
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "service": "mlops",
            "timestamp": datetime.now(UTC).isoformat(),
            "version": "1.0.0",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": platform.platform(),
        }
    )


@router.get("/", status_code=status.HTTP_200_OK)
async def root():
    """Root endpoint"""
    return {
        "service": "MLOps Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@router.post("/ml/predict-rul", response_model=RULPredictionResponse, status_code=status.HTTP_200_OK)
async def predict_rul(request: RULPredictionRequest):
    """
    Predict Remaining Useful Life (RUL) for a battery system.
    
    Accepts a sequence of recent battery measurements and returns predicted RUL in days.
    
    **Features (in order):**
    1. State of Charge (SoC) - 0-100%
    2. State of Health (SoH) - 0-100%
    3. Temperature - °C
    4. Voltage - V
    5. Cycle count - integer
    
    **Example sequence:** 10 time steps of measurements
    """
    try:
        service = get_prediction_service()
        
        # Validate input
        sequence_array = service.validate_input(request.sequence)
        
        # Make prediction
        result = service.predict(sequence_array)
        
        # Create response
        response = RULPredictionResponse(
            predicted_rul=result['predicted_rul'],
            confidence=result['confidence'],
            model_version=result['model_version'],
            features_used=result['features_used'],
            battery_system_id=request.battery_system_id
        )
        
        logger.info(
            f"RUL prediction: {result['predicted_rul']:.1f} days "
            f"(confidence: {result['confidence']:.2f})"
        )
        
        return response
        
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except RuntimeError as e:
        sentry_sdk.capture_exception()
        logger.error(f"Model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not available"
        )
    except Exception as e:
        sentry_sdk.capture_exception()
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/ml/model-info", response_model=ModelInfoResponse, status_code=status.HTTP_200_OK)
async def get_model_info():
    """
    Get RUL model information and status.
    
    Returns model version, architecture details, and performance metrics.
    """
    try:
        service = get_prediction_service()
        info = service.get_model_info()
        
        return ModelInfoResponse(**info)
        
    except Exception as e:
        sentry_sdk.capture_exception()
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve model information"
        )
