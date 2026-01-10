"""
FastAPI endpoints for SHAP explainability.
T156: Implement prediction explainability (SHAP)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import logging
import sys
from pathlib import Path

# Add ML service to path
sys.path.append(str(Path(__file__).parent.parent.parent.parent / 'ml' / 'src'))

from explainability.shap_explainer import SHAPExplainer
import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/explain", tags=["explainability"])

# Model cache
_model_cache: Dict[str, Any] = {}
_model_mtime_cache: Dict[str, int] = {}
_explainer_cache: Dict[str, SHAPExplainer] = {}


class ExplainRequest(BaseModel):
    """Request model for explanation generation."""
    battery_system_id: str = Field(..., description="Battery system identifier")
    features: Dict[str, float] = Field(..., description="Feature values for prediction")
    prediction_value: float = Field(..., description="The predicted value to explain")
    prediction_type: str = Field(default="RUL", description="Type: RUL, anomaly, or risk")
    top_n: Optional[int] = Field(default=5, description="Number of top features to show")
    max_display: Optional[int] = Field(default=10, description="Max features in waterfall plot")


class ExplainResponse(BaseModel):
    """Response model for explanations."""
    success: bool
    data: Dict[str, Any]
    message: Optional[str] = None


def get_or_load_model(model_version: str = "v1.0.0") -> Any:
    """Load model from cache or disk."""
    # Load from disk if available; hot-reload when the file changes.
    model_path_joblib = Path(f"data/models/model_{model_version}.joblib")
    model_path_pkl = Path(f"data/models/model_{model_version}.pkl")
    model_path = model_path_joblib if model_path_joblib.exists() else model_path_pkl

    if model_version in _model_cache and model_path.exists():
        current_mtime = model_path.stat().st_mtime_ns
        if _model_mtime_cache.get(model_version) == current_mtime:
            return _model_cache[model_version]
    
    if not model_path.exists():
        # Use default model for demo
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        
        # Train on dummy data
        X_dummy = np.random.randn(100, 4)
        y_dummy = np.random.randn(100) * 10 + 30
        model.fit(X_dummy, y_dummy)
        
        logger.warning(f"Model not found at {model_path}, using dummy model")
    else:
        model = joblib.load(model_path)
        _model_mtime_cache[model_version] = model_path.stat().st_mtime_ns
        logger.info(f"Loaded model from {model_path}")
    
    _model_cache[model_version] = model
    return model


def get_or_create_explainer(
    model_version: str = "v1.0.0",
    feature_names: Optional[List[str]] = None
) -> SHAPExplainer:
    """Get cached explainer or create new one."""
    if model_version in _explainer_cache:
        return _explainer_cache[model_version]
    
    # Load model
    model = get_or_load_model(model_version)
    
    # Default feature names for RUL prediction
    if feature_names is None:
        feature_names = [
            "soh_delta",
            "anomaly_count",
            "temp_max",
            "voltage_min"
        ]
    
    # Create background data (sample from historical data in production)
    background_data = np.random.randn(100, len(feature_names))
    
    # Create explainer
    explainer = SHAPExplainer(
        model=model,
        feature_names=feature_names,
        background_data=background_data,
        model_type='tree'
    )
    
    _explainer_cache[model_version] = explainer
    logger.info(f"Created SHAP explainer for model {model_version}")
    
    return explainer


@router.post("/waterfall", response_model=ExplainResponse)
async def generate_waterfall_plot(request: ExplainRequest):
    """
    Generate SHAP waterfall plot showing feature contributions.
    
    Returns base64-encoded image and feature contribution data.
    """
    try:
        logger.info(f"Generating waterfall plot for {request.battery_system_id}")
        
        # Get explainer
        feature_names = list(request.features.keys())
        explainer = get_or_create_explainer(feature_names=feature_names)
        
        # Prepare features
        features_array = np.array([list(request.features.values())])
        
        # Generate waterfall plot
        waterfall_data = explainer.generate_waterfall_plot(
            features=features_array,
            prediction_index=0,
            max_display=request.max_display or 10,
            output_path=None  # Return base64 instead of saving
        )
        
        return ExplainResponse(
            success=True,
            data={
                "type": "waterfall",
                "battery_system_id": request.battery_system_id,
                "base_value": waterfall_data["base_value"],
                "prediction_value": waterfall_data["prediction_value"],
                "feature_contributions": waterfall_data["feature_contributions"],
                "image_base64": waterfall_data["image_base64"],
                "prediction_type": request.prediction_type
            },
            message="Waterfall plot generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating waterfall plot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/force", response_model=ExplainResponse)
async def generate_force_plot(request: ExplainRequest):
    """
    Generate SHAP force plot for individual prediction.
    
    Returns HTML visualization and feature contribution data.
    """
    try:
        logger.info(f"Generating force plot for {request.battery_system_id}")
        
        # Get explainer
        feature_names = list(request.features.keys())
        explainer = get_or_create_explainer(feature_names=feature_names)
        
        # Prepare features
        features_array = np.array([list(request.features.values())])
        
        # Generate force plot
        force_data = explainer.generate_force_plot(
            features=features_array,
            prediction_index=0,
            output_path=None  # Don't save to disk
        )
        
        return ExplainResponse(
            success=True,
            data={
                "type": "force",
                "battery_system_id": request.battery_system_id,
                "base_value": force_data["base_value"],
                "prediction_value": force_data["prediction_value"],
                "positive_contributions": force_data["positive_contributions"],
                "negative_contributions": force_data["negative_contributions"],
                "html": force_data["html"],
                "prediction_type": request.prediction_type
            },
            message="Force plot generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating force plot: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/text", response_model=ExplainResponse)
async def generate_text_explanation(request: ExplainRequest):
    """
    Generate natural language explanation for prediction.
    
    Returns human-readable explanation text with top contributing features.
    """
    try:
        logger.info(f"Generating text explanation for {request.battery_system_id}")
        
        # Get explainer
        feature_names = list(request.features.keys())
        explainer = get_or_create_explainer(feature_names=feature_names)
        
        # Prepare features
        features_array = np.array([list(request.features.values())])
        
        # Generate explanation text
        explanation = explainer.generate_explanation_text(
            features=features_array,
            prediction_value=request.prediction_value,
            prediction_index=0,
            top_n=request.top_n or 5,
            prediction_type=request.prediction_type
        )
        
        # Calculate SHAP values for top features
        shap_values = explainer.calculate_shap_values(features_array)
        
        if hasattr(explainer.explainer, 'expected_value'):
            expected_value = explainer.explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                expected_value = float(expected_value[0])
            else:
                expected_value = float(expected_value)
        else:
            expected_value = 0.0
        
        # Get top features
        feature_impacts = []
        for i, (name, value) in enumerate(request.features.items()):
            shap_val = float(shap_values[0][i])
            feature_impacts.append({
                'feature': name,
                'value': float(value),
                'shap_value': shap_val,
                'abs_impact': abs(shap_val)
            })
        
        feature_impacts.sort(key=lambda x: x['abs_impact'], reverse=True)
        top_features = feature_impacts[:request.top_n]
        
        return ExplainResponse(
            success=True,
            data={
                "explanation": explanation,
                "battery_system_id": request.battery_system_id,
                "base_value": expected_value,
                "prediction_value": request.prediction_value,
                "top_features": top_features,
                "prediction_type": request.prediction_type
            },
            message="Text explanation generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Error generating text explanation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export", response_model=ExplainResponse)
async def export_explanation_report(
    request: ExplainRequest,
    background_tasks: BackgroundTasks
):
    """
    Export complete explanation report with plots and text.
    
    Generates waterfall plot, force plot, and markdown explanation.
    """
    try:
        logger.info(f"Exporting explanation report for {request.battery_system_id}")
        
        # Get explainer
        feature_names = list(request.features.keys())
        explainer = get_or_create_explainer(feature_names=feature_names)
        
        # Prepare features
        features_df = pd.DataFrame([request.features])
        
        # Generate report
        report_paths = explainer.export_explanation_report(
            features=features_df,
            prediction_value=request.prediction_value,
            prediction_index=0,
            output_dir='explanations',
            prediction_type=request.prediction_type,
            battery_system_id=request.battery_system_id
        )
        
        return ExplainResponse(
            success=True,
            data={
                "waterfall_plot": report_paths["waterfall_plot"],
                "force_plot": report_paths["force_plot"],
                "explanation_text": report_paths["explanation_text"],
                "output_directory": report_paths["output_directory"],
                "battery_system_id": request.battery_system_id,
                "prediction_type": request.prediction_type
            },
            message="Explanation report exported successfully"
        )
        
    except Exception as e:
        logger.error(f"Error exporting explanation report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint for explainability service."""
    return {
        "status": "healthy",
        "service": "explainability",
        "models_loaded": len(_model_cache),
        "explainers_loaded": len(_explainer_cache)
    }
