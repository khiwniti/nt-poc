"""Configuration settings for MLOps service"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


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
        "http://localhost:8001"
    ]
    
    # Model paths
    MODELS_DIR: str = "models"
    
    # Logging
    LOG_LEVEL: str = "INFO"


settings = Settings()
