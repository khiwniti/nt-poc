"""MLOps Service - FastAPI Application"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.routes import router
from .api.explainability import router as explainability_router
from .api.anomaly import router as anomaly_router
from .config import settings
from .utils.latency_monitor import get_latency_monitor, LatencyMonitoringMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("MLOps Service starting up...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info(f"Port: {settings.PORT}")
    yield
    # Shutdown
    logger.info("MLOps Service shutting down...")


# Create FastAPI application
app = FastAPI(
    title="MLOps Service",
    description="Machine Learning Operations and Inference Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Latency monitoring (in-memory; useful for p95 tracking)
app.add_middleware(
    LatencyMonitoringMiddleware,
    monitor=get_latency_monitor(),
    include_prefixes=("/ml/", "/api/v1/ml/", "/explain/"),
)

# Include API routes
app.include_router(router)
app.include_router(explainability_router)
app.include_router(anomaly_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
