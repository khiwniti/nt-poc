"""
SHAP-based explainability for predictions.
T156: Implement prediction explainability (SHAP)
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Union, Tuple
import shap
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import io
import base64
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SHAPExplainer:
    """
    SHAP-based prediction explainability.
    
    Features:
    - Calculate SHAP values for model predictions
    - Generate waterfall plots (feature contributions)
    - Generate force plots (individual predictions)
    - Natural language explanations
    - Export explanation reports
    """
    
    def __init__(
        self,
        model: Any,
        feature_names: List[str],
        background_data: Optional[Union[pd.DataFrame, np.ndarray]] = None,
        model_type: str = 'tree'
    ):
        """
        Initialize SHAP explainer.
        
        Args:
            model: Trained model (scikit-learn, XGBoost, etc.)
            feature_names: List of feature names
            background_data: Background dataset for SHAP (100 samples recommended)
            model_type: 'tree', 'linear', or 'kernel' for explainer type
        """
        self.model = model
        self.feature_names = feature_names
        self.model_type = model_type
        self.explainer = None
        self.background_data = background_data
        
        # Initialize appropriate explainer
        self._initialize_explainer()
    
    def _initialize_explainer(self):
        """Initialize the appropriate SHAP explainer based on model type."""
        logger.info(f"Initializing {self.model_type} SHAP explainer")
        
        try:
            if self.model_type == 'tree':
                # For tree-based models (RandomForest, XGBoost, LightGBM)
                self.explainer = shap.TreeExplainer(self.model)
                logger.info("TreeExplainer initialized")
                
            elif self.model_type == 'linear':
                # For linear models
                self.explainer = shap.LinearExplainer(self.model, self.background_data)
                logger.info("LinearExplainer initialized")
                
            elif self.model_type == 'kernel':
                # For any model (slower but universal)
                if self.background_data is None:
                    raise ValueError("background_data required for KernelExplainer")
                self.explainer = shap.KernelExplainer(
                    self.model.predict,
                    self.background_data
                )
                logger.info("KernelExplainer initialized")
                
            else:
                raise ValueError(f"Unknown model_type: {self.model_type}")
                
        except Exception as e:
            logger.error(f"Failed to initialize explainer: {e}")
            raise
    
    def calculate_shap_values(
        self,
        features: Union[pd.DataFrame, np.ndarray]
    ) -> np.ndarray:
        """
        Calculate SHAP values for given features.
        
        Args:
            features: Feature data (single sample or batch)
            
        Returns:
            SHAP values array
        """
        if self.explainer is None:
            raise RuntimeError("Explainer not initialized")
        
        # Convert to numpy if DataFrame
        if isinstance(features, pd.DataFrame):
            features_array = features.values
        else:
            features_array = features
        
        # Ensure 2D array
        if len(features_array.shape) == 1:
            features_array = features_array.reshape(1, -1)
        
        logger.info(f"Calculating SHAP values for {features_array.shape[0]} samples")
        
        try:
            shap_values = self.explainer.shap_values(features_array)
            
            # Handle multi-class output (take first class if multi-output)
            if isinstance(shap_values, list):
                shap_values = shap_values[0]
            
            logger.info(f"SHAP values calculated: {shap_values.shape}")
            return shap_values
            
        except Exception as e:
            logger.error(f"Failed to calculate SHAP values: {e}")
            raise
    
    def generate_waterfall_plot(
        self,
        features: Union[pd.DataFrame, np.ndarray],
        prediction_index: int = 0,
        max_display: int = 10,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate waterfall plot showing feature contributions.
        
        Args:
            features: Feature data
            prediction_index: Index of prediction to explain (for batch)
            max_display: Maximum features to display
            output_path: Optional path to save plot
            
        Returns:
            Dictionary with plot data and base64 image
        """
        logger.info("Generating waterfall plot")
        
        # Calculate SHAP values
        shap_values = self.calculate_shap_values(features)
        
        # Get feature values for the specific prediction
        if isinstance(features, pd.DataFrame):
            feature_values = features.iloc[prediction_index].values
        else:
            if len(features.shape) == 1:
                feature_values = features
            else:
                feature_values = features[prediction_index]
        
        # Get SHAP values for this prediction
        if len(shap_values.shape) > 1:
            instance_shap = shap_values[prediction_index]
        else:
            instance_shap = shap_values
        
        # Get expected value (base value)
        if hasattr(self.explainer, 'expected_value'):
            expected_value = self.explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                expected_value = expected_value[0]
        else:
            expected_value = 0.0
        
        # Create Explanation object for waterfall plot
        explanation = shap.Explanation(
            values=instance_shap,
            base_values=expected_value,
            data=feature_values,
            feature_names=self.feature_names
        )
        
        # Generate plot
        plt.figure(figsize=(10, 6))
        shap.plots.waterfall(explanation, max_display=max_display, show=False)
        
        # Save to file or encode to base64
        if output_path:
            plt.savefig(output_path, bbox_inches='tight', dpi=150)
            logger.info(f"Waterfall plot saved to {output_path}")
            img_base64 = None
        else:
            # Convert to base64
            buf = io.BytesIO()
            plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
            buf.seek(0)
            img_base64 = base64.b64encode(buf.read()).decode('utf-8')
            buf.close()
        
        plt.close()
        
        # Get top contributing features
        feature_contributions = [
            {
                'feature': self.feature_names[i],
                'value': float(feature_values[i]),
                'shap_value': float(instance_shap[i]),
                'contribution': abs(float(instance_shap[i]))
            }
            for i in range(len(self.feature_names))
        ]
        
        # Sort by absolute contribution
        feature_contributions.sort(key=lambda x: x['contribution'], reverse=True)
        
        return {
            'type': 'waterfall',
            'prediction_index': prediction_index,
            'base_value': float(expected_value),
            'prediction_value': float(expected_value + instance_shap.sum()),
            'feature_contributions': feature_contributions[:max_display],
            'image_base64': img_base64,
            'output_path': output_path
        }
    
    def generate_force_plot(
        self,
        features: Union[pd.DataFrame, np.ndarray],
        prediction_index: int = 0,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate force plot for individual prediction.
        
        Args:
            features: Feature data
            prediction_index: Index of prediction to explain
            output_path: Optional path to save plot HTML
            
        Returns:
            Dictionary with force plot data and HTML
        """
        logger.info("Generating force plot")
        
        # Calculate SHAP values
        shap_values = self.calculate_shap_values(features)
        
        # Get feature values
        if isinstance(features, pd.DataFrame):
            feature_values = features.iloc[prediction_index].values
        else:
            if len(features.shape) == 1:
                feature_values = features
            else:
                feature_values = features[prediction_index]
        
        # Get SHAP values for this prediction
        if len(shap_values.shape) > 1:
            instance_shap = shap_values[prediction_index]
        else:
            instance_shap = shap_values
        
        # Get expected value
        if hasattr(self.explainer, 'expected_value'):
            expected_value = self.explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                expected_value = expected_value[0]
        else:
            expected_value = 0.0
        
        # Generate force plot
        force_plot = shap.force_plot(
            expected_value,
            instance_shap,
            feature_values,
            feature_names=self.feature_names,
            matplotlib=False,
            show=False
        )
        
        # Save to HTML if path provided
        if output_path:
            shap.save_html(output_path, force_plot)
            logger.info(f"Force plot saved to {output_path}")
        
        # Get HTML string
        html_str = shap.getjs() + force_plot.html()
        
        # Separate positive and negative contributions
        positive_features = []
        negative_features = []
        
        for i, (name, value, shap_val) in enumerate(
            zip(self.feature_names, feature_values, instance_shap)
        ):
            feature_data = {
                'feature': name,
                'value': float(value),
                'shap_value': float(shap_val),
                'contribution': abs(float(shap_val))
            }
            
            if shap_val > 0:
                positive_features.append(feature_data)
            else:
                negative_features.append(feature_data)
        
        # Sort by contribution
        positive_features.sort(key=lambda x: x['contribution'], reverse=True)
        negative_features.sort(key=lambda x: x['contribution'], reverse=True)
        
        return {
            'type': 'force',
            'prediction_index': prediction_index,
            'base_value': float(expected_value),
            'prediction_value': float(expected_value + instance_shap.sum()),
            'positive_contributions': positive_features,
            'negative_contributions': negative_features,
            'html': html_str,
            'output_path': output_path
        }
    
    def generate_explanation_text(
        self,
        features: Union[pd.DataFrame, np.ndarray],
        prediction_value: float,
        prediction_index: int = 0,
        top_n: int = 5,
        prediction_type: str = 'RUL'
    ) -> str:
        """
        Generate natural language explanation for prediction.
        
        Args:
            features: Feature data
            prediction_value: The predicted value
            prediction_index: Index of prediction to explain
            top_n: Number of top features to include
            prediction_type: 'RUL', 'anomaly', or 'risk'
            
        Returns:
            Natural language explanation string
        """
        logger.info("Generating natural language explanation")
        
        # Calculate SHAP values
        shap_values = self.calculate_shap_values(features)
        
        # Get feature values
        if isinstance(features, pd.DataFrame):
            feature_values = features.iloc[prediction_index].values
        else:
            if len(features.shape) == 1:
                feature_values = features
            else:
                feature_values = features[prediction_index]
        
        # Get SHAP values for this prediction
        if len(shap_values.shape) > 1:
            instance_shap = shap_values[prediction_index]
        else:
            instance_shap = shap_values
        
        # Get expected value
        if hasattr(self.explainer, 'expected_value'):
            expected_value = self.explainer.expected_value
            if isinstance(expected_value, (list, np.ndarray)):
                expected_value = expected_value[0]
        else:
            expected_value = 0.0
        
        # Get top contributing features
        feature_impacts = []
        for i, (name, value, shap_val) in enumerate(
            zip(self.feature_names, feature_values, instance_shap)
        ):
            feature_impacts.append({
                'name': name,
                'value': float(value),
                'shap_value': float(shap_val),
                'abs_impact': abs(float(shap_val))
            })
        
        # Sort by absolute impact
        feature_impacts.sort(key=lambda x: x['abs_impact'], reverse=True)
        top_features = feature_impacts[:top_n]
        
        # Build explanation text
        explanation_parts = []
        
        # Header
        if prediction_type == 'RUL':
            explanation_parts.append(
                f"The predicted Remaining Useful Life (RUL) is {prediction_value:.1f} days."
            )
        elif prediction_type == 'anomaly':
            explanation_parts.append(
                f"The anomaly detection model predicts: {prediction_value}"
            )
        elif prediction_type == 'risk':
            explanation_parts.append(
                f"The predicted maintenance risk level is: {prediction_value}"
            )
        else:
            explanation_parts.append(
                f"The predicted value is: {prediction_value}"
            )
        
        explanation_parts.append(
            f"\nThis prediction is based on the baseline expectation of {expected_value:.2f}, "
            f"adjusted by the following key factors:\n"
        )
        
        # Top contributing features
        explanation_parts.append(f"**Top {len(top_features)} Contributing Factors:**\n")
        
        for idx, feature in enumerate(top_features, 1):
            impact_direction = "increases" if feature['shap_value'] > 0 else "decreases"
            impact_magnitude = abs(feature['shap_value'])
            
            # Format feature name (convert snake_case to readable)
            readable_name = feature['name'].replace('_', ' ').title()
            
            explanation_parts.append(
                f"{idx}. **{readable_name}** (value: {feature['value']:.2f})\n"
                f"   - This feature {impact_direction} the prediction by {impact_magnitude:.2f}\n"
                f"   - Impact: {(impact_magnitude / abs(instance_shap.sum()) * 100):.1f}% "
                f"of total change from baseline\n"
            )
        
        # Summary
        total_positive = sum(f['shap_value'] for f in feature_impacts if f['shap_value'] > 0)
        total_negative = sum(f['shap_value'] for f in feature_impacts if f['shap_value'] < 0)
        
        explanation_parts.append("\n**Summary:**\n")
        explanation_parts.append(
            f"- Factors increasing prediction: +{total_positive:.2f}\n"
            f"- Factors decreasing prediction: {total_negative:.2f}\n"
            f"- Net adjustment from baseline: {(prediction_value - expected_value):.2f}\n"
        )
        
        return ''.join(explanation_parts)
    
    def export_explanation_report(
        self,
        features: Union[pd.DataFrame, np.ndarray],
        prediction_value: float,
        prediction_index: int = 0,
        output_dir: str = 'explanations',
        prediction_type: str = 'RUL',
        battery_system_id: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Export complete explanation report with plots and text.
        
        Args:
            features: Feature data
            prediction_value: The predicted value
            prediction_index: Index of prediction to explain
            output_dir: Directory to save report files
            prediction_type: 'RUL', 'anomaly', or 'risk'
            battery_system_id: Optional battery system identifier
            
        Returns:
            Dictionary with paths to generated files
        """
        logger.info("Generating explanation report")
        
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Generate timestamp for filenames
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Generate identifier
        if battery_system_id:
            identifier = f"{battery_system_id}_{timestamp}"
        else:
            identifier = f"prediction_{timestamp}"
        
        # Generate waterfall plot
        waterfall_path = str(output_path / f"waterfall_{identifier}.png")
        waterfall_data = self.generate_waterfall_plot(
            features,
            prediction_index=prediction_index,
            output_path=waterfall_path
        )
        
        # Generate force plot
        force_path = str(output_path / f"force_{identifier}.html")
        force_data = self.generate_force_plot(
            features,
            prediction_index=prediction_index,
            output_path=force_path
        )
        
        # Generate text explanation
        explanation_text = self.generate_explanation_text(
            features,
            prediction_value,
            prediction_index=prediction_index,
            prediction_type=prediction_type
        )
        
        # Save text explanation
        text_path = str(output_path / f"explanation_{identifier}.md")
        with open(text_path, 'w') as f:
            f.write(f"# Prediction Explanation Report\n\n")
            f.write(f"**Generated:** {datetime.now().isoformat()}\n")
            if battery_system_id:
                f.write(f"**Battery System ID:** {battery_system_id}\n")
            f.write(f"**Prediction Type:** {prediction_type}\n\n")
            f.write("---\n\n")
            f.write(explanation_text)
            f.write("\n\n---\n\n")
            f.write(f"## Visualizations\n\n")
            f.write(f"- Waterfall Plot: `{waterfall_path}`\n")
            f.write(f"- Force Plot: `{force_path}`\n")
        
        logger.info(f"Explanation report saved to {output_dir}")
        
        return {
            'waterfall_plot': waterfall_path,
            'force_plot': force_path,
            'explanation_text': text_path,
            'output_directory': str(output_path)
        }
    
    def batch_explain(
        self,
        features: pd.DataFrame,
        prediction_values: List[float],
        prediction_type: str = 'RUL',
        top_n: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate explanations for multiple predictions.
        
        Args:
            features: Feature DataFrame
            prediction_values: List of predicted values
            prediction_type: 'RUL', 'anomaly', or 'risk'
            top_n: Number of top features per explanation
            
        Returns:
            List of explanation dictionaries
        """
        logger.info(f"Generating batch explanations for {len(features)} predictions")
        
        explanations = []
        
        for idx, pred_value in enumerate(prediction_values):
            try:
                explanation_text = self.generate_explanation_text(
                    features,
                    pred_value,
                    prediction_index=idx,
                    top_n=top_n,
                    prediction_type=prediction_type
                )
                
                explanations.append({
                    'index': idx,
                    'prediction_value': pred_value,
                    'explanation': explanation_text,
                    'status': 'success'
                })
                
            except Exception as e:
                logger.error(f"Failed to generate explanation for index {idx}: {e}")
                explanations.append({
                    'index': idx,
                    'prediction_value': pred_value,
                    'explanation': None,
                    'status': 'error',
                    'error': str(e)
                })
        
        logger.info(f"Batch explanations complete: {len(explanations)} total")
        return explanations
