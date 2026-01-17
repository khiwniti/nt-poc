"""Configuration settings for MLOps service"""

from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    # Application
    APP_NAME: str = "MLOps Service"
    ENVIRONMENT: str = "development"
    PORT: int = 8001

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:8001",
    ]

    # Model paths
    MODELS_DIR: str = "models"

    # Logging
    LOG_LEVEL: str = "INFO"

    # Production-scale batch processing
    BATCH_MAX_SIZE: int = Field(
        default=500,
        ge=10,
        le=2000,
        description="Maximum batteries per batch prediction request",
    )

    BATCH_PARALLEL_WORKERS: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Concurrent workers for parallel batch predictions",
    )

    # Model cache configuration
    MODEL_CACHE_SIZE: int = Field(
        default=4, ge=1, le=10, description="Maximum models cached in memory"
    )

    # Prediction optimization
    PREDICTION_BATCH_SIZE: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Internal TensorFlow batch size for predictions",
    )

    # Feature extraction
    FEATURE_WINDOW_SIZE: int = Field(
        default=10,
        ge=5,
        le=50,
        description="Time steps for feature window (sequence length)",
    )


settings = Settings()
