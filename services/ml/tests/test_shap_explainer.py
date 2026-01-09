"""
Tests for SHAP explainability module.
T156: Implement prediction explainability (SHAP)
"""

import pytest
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from explainability.shap_explainer import SHAPExplainer


@pytest.fixture
def trained_model():
    """Create a simple trained Random Forest model."""
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    
    # Generate training data
    X_train = np.random.randn(100, 4)
    y_train = (X_train[:, 0] * 2 + X_train[:, 1] * -1 + 
               X_train[:, 2] * 0.5 + np.random.randn(100) * 0.1)
    
    model.fit(X_train, y_train)
    return model


@pytest.fixture
def feature_names():
    """Feature names for test data."""
    return ['soh_delta', 'anomaly_count', 'temp_max', 'voltage_min']


@pytest.fixture
def test_features():
    """Test feature data."""
    return np.array([[-0.15, 8, 55.0, 3.0]])


@pytest.fixture
def explainer(trained_model, feature_names):
    """Create SHAP explainer instance."""
    background_data = np.random.randn(50, 4)
    return SHAPExplainer(
        model=trained_model,
        feature_names=feature_names,
        background_data=background_data,
        model_type='tree'
    )


class TestSHAPExplainer:
    """Tests for SHAPExplainer class."""
    
    def test_initialization(self, trained_model, feature_names):
        """Test explainer initialization."""
        explainer = SHAPExplainer(
            model=trained_model,
            feature_names=feature_names,
            model_type='tree'
        )
        
        assert explainer.model is not None
        assert explainer.explainer is not None
        assert explainer.feature_names == feature_names
        assert explainer.model_type == 'tree'
    
    def test_calculate_shap_values(self, explainer, test_features):
        """Test SHAP value calculation."""
        shap_values = explainer.calculate_shap_values(test_features)
        
        assert shap_values is not None
        assert shap_values.shape == test_features.shape
        assert isinstance(shap_values, np.ndarray)
    
    def test_calculate_shap_values_dataframe(self, explainer, feature_names):
        """Test SHAP calculation with DataFrame input."""
        test_df = pd.DataFrame(
            [[-0.15, 8, 55.0, 3.0]],
            columns=feature_names
        )
        
        shap_values = explainer.calculate_shap_values(test_df)
        
        assert shap_values is not None
        assert shap_values.shape == (1, 4)
    
    def test_generate_waterfall_plot(self, explainer, test_features):
        """Test waterfall plot generation."""
        waterfall_data = explainer.generate_waterfall_plot(
            features=test_features,
            prediction_index=0,
            max_display=4,
            output_path=None
        )
        
        assert waterfall_data['type'] == 'waterfall'
        assert 'base_value' in waterfall_data
        assert 'prediction_value' in waterfall_data
        assert 'feature_contributions' in waterfall_data
        assert len(waterfall_data['feature_contributions']) == 4
        assert waterfall_data['image_base64'] is not None
    
    def test_generate_force_plot(self, explainer, test_features):
        """Test force plot generation."""
        force_data = explainer.generate_force_plot(
            features=test_features,
            prediction_index=0,
            output_path=None
        )
        
        assert force_data['type'] == 'force'
        assert 'base_value' in force_data
        assert 'prediction_value' in force_data
        assert 'positive_contributions' in force_data
        assert 'negative_contributions' in force_data
        assert 'html' in force_data
        assert isinstance(force_data['html'], str)
    
    def test_generate_explanation_text(self, explainer, test_features):
        """Test natural language explanation generation."""
        explanation = explainer.generate_explanation_text(
            features=test_features,
            prediction_value=25.5,
            prediction_index=0,
            top_n=3,
            prediction_type='RUL'
        )
        
        assert isinstance(explanation, str)
        assert len(explanation) > 0
        assert 'Remaining Useful Life' in explanation
        assert 'baseline' in explanation.lower()
        assert 'Top 3 Contributing Factors' in explanation


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
