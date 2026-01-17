"""FastAPI application entry point.

This module creates the FastAPI application with:
- Sensor backend factory (simulator vs hardware selection)
- Lifespan management (initialization and shutdown)
- CORS middleware
- API routing
- Logging configuration
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, sensors
from app.config import SensorBackend, settings
from app.implementations.hardware import HardwareSensor
from app.implementations.simulator import SimulatorSensor
from app.interfaces.sensor_interface import SensorInterface

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# Global sensor backend instance
sensor_backend: Optional[SensorInterface] = None


def create_sensor_backend() -> SensorInterface:
    """Factory function to create configured sensor backend.

    This is the CRITICAL function for replaceability:
    - Reads SENSOR_BACKEND from configuration
    - Creates appropriate implementation (simulator or hardware)
    - Returns interface-compliant instance

    Returns:
        SensorInterface implementation (SimulatorSensor or HardwareSensor)

    Raises:
        ValueError: If SENSOR_BACKEND is invalid
    """
    logger.info(f"Creating sensor backend: {settings.SENSOR_BACKEND}")

    if settings.SENSOR_BACKEND == SensorBackend.SIMULATOR:
        logger.info("Initializing simulator backend")
        return SimulatorSensor(
            seed=settings.SIMULATOR_SEED,
            noise_level=settings.SIMULATOR_NOISE_LEVEL,
            drift_enabled=settings.SIMULATOR_DRIFT_ENABLED,
            update_interval_ms=settings.SIMULATOR_UPDATE_INTERVAL_MS,
            soc_decay_rate=settings.SIMULATOR_SOC_DECAY_RATE,
            soh_decay_rate=settings.SIMULATOR_SOH_DECAY_RATE,
            cache_size=settings.SIMULATOR_CACHE_SIZE,
        )
    elif settings.SENSOR_BACKEND == SensorBackend.HARDWARE:
        logger.info("Initializing hardware backend")
        return HardwareSensor(
            connection_string=settings.HARDWARE_CONNECTION_STRING,
            timeout_ms=settings.HARDWARE_TIMEOUT_MS,
            retry_attempts=settings.HARDWARE_RETRY_ATTEMPTS,
            retry_delay_ms=settings.HARDWARE_RETRY_DELAY_MS,
        )
    else:
        raise ValueError(f"Unknown sensor backend: {settings.SENSOR_BACKEND}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management.

    Handles:
    - Startup: Initialize sensor backend
    - Shutdown: Clean up resources
    """
    global sensor_backend

    # Startup
    logger.info(f"Starting {settings.APP_NAME}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Sensor Backend: {settings.SENSOR_BACKEND}")

    try:
        sensor_backend = create_sensor_backend()
        await sensor_backend.initialize()
        app.state.sensor = sensor_backend
        logger.info("Application startup complete")
    except Exception as e:
        logger.error(f"Startup failed: {e}", exc_info=True)
        raise

    yield

    # Shutdown
    logger.info("Starting shutdown")
    if sensor_backend:
        try:
            await sensor_backend.shutdown()
        except Exception as e:
            logger.error(f"Shutdown error: {e}", exc_info=True)

    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="Battery sensor simulator with pluggable backend (simulator/hardware)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(sensors.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "backend": settings.SENSOR_BACKEND.value,
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower(),
    )
