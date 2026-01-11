"""API routes for MLOps service"""
from fastapi import APIRouter, status, HTTPException
from fastapi.responses import JSONResponse
from datetime import datetime, UTC
import platform
import sys
import logging

from .models import (
    RULPredictionRequest,
    RULPredictionResponse,
    ModelInfoResponse,
    RULBatchPredictionRequest,
    RULBatchPredictionResponse,
)
from .rul_service import get_prediction_service
from ..utils.latency_monitor import get_latency_monitor

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint
    
    Returns service health status and system information
    """
    latency_stats = get_latency_monitor().stats()
    latency_p95_target_ms = 100.0

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "status": "healthy",
            "service": "mlops",
            "timestamp": datetime.now(UTC).isoformat(),
            "version": "1.0.0",
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": platform.platform(),
            "inference_latency": {
                "count": latency_stats.count,
                "p50_ms": round(latency_stats.p50_ms, 3),
                "p95_ms": round(latency_stats.p95_ms, 3),
                "p99_ms": round(latency_stats.p99_ms, 3),
                "target_p95_ms": latency_p95_target_ms,
                "meets_target": latency_stats.p95_ms <= latency_p95_target_ms if latency_stats.count else None,
            },
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


@router.get("/ml/latency", status_code=status.HTTP_200_OK)
async def get_latency():
    """Get in-memory inference latency stats (p50/p95/p99)."""
    monitor = get_latency_monitor()
    stats = monitor.stats()
    by_path = {path: monitor.stats(path).__dict__ for path in monitor.paths()}
    return {
        "overall": stats.__dict__,
        "by_path": by_path,
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
        logger.error(f"Model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not available"
        )
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/ml/predict-rul/batch", response_model=RULBatchPredictionResponse, status_code=status.HTTP_200_OK)
async def predict_rul_batch(request: RULBatchPredictionRequest):
    """
    Predict Remaining Useful Life (RUL) for up to 100 battery sequences.
    """
    try:
        service = get_prediction_service()

        if request.battery_system_ids is not None and len(request.battery_system_ids) != len(request.sequences):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="battery_system_ids must be the same length as sequences",
            )

        sequences_array = service.validate_batch_input(request.sequences)
        predictions = service.predict_batch(sequences_array).astype(float).tolist()

        confidences = [0.90] * len(predictions)

        logger.info("RUL batch prediction: batch_size=%d", len(predictions))

        return RULBatchPredictionResponse(
            predicted_rul=predictions,
            confidence=confidences,
            model_version=service.model_version,
            features_used=service.feature_names,
            battery_system_ids=request.battery_system_ids,
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except RuntimeError as e:
        logger.error(f"Model error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not available"
        )
    except Exception as e:
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
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve model information"
        )
