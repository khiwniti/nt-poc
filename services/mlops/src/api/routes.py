"""API routes for MLOps service"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from datetime import datetime, UTC
import platform
import sys

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
