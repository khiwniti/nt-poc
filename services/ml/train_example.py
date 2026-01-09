"""
Example training script demonstrating the complete ML pipeline.
This script shows how to:
1. Load and preprocess data
2. Engineer features
3. Train models with hyperparameter tuning
4. Evaluate and version models
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from preprocessing import DataPreprocessor
from feature_engineering import FeatureEngineer
from training import TrainingPipeline


def generate_sample_data(n_samples: int = 1000) -> pd.DataFrame:
    """
    Generate sample sensor data for demonstration.

    Args:
        n_samples: Number of samples to generate

    Returns:
        DataFrame with sample sensor readings
    """
    np.random.seed(42)

    dates = pd.date_range(start='2024-01-01', periods=n_samples, freq='H')

    # Generate synthetic sensor data with temporal patterns
    data = {
        'timestamp': dates,
        'temperature': 20 + 5 * np.sin(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 1, n_samples),
        'humidity': 60 + 10 * np.cos(np.arange(n_samples) * 2 * np.pi / 24) + np.random.normal(0, 2, n_samples),
        'pressure': 1013 + np.random.normal(0, 5, n_samples),
        'co2': 400 + 50 * np.sin(np.arange(n_samples) * 2 * np.pi / 168) + np.random.normal(0, 10, n_samples),
    }

    df = pd.DataFrame(data)

    # Add some outliers (5%)
    outlier_indices = np.random.choice(n_samples, size=int(n_samples * 0.05), replace=False)
    df.loc[outlier_indices, 'temperature'] += np.random.uniform(10, 20, len(outlier_indices))

    # Add target variable (temperature 1 hour ahead)
    df['target'] = df['temperature'].shift(-1)
    df = df.dropna()

    return df


def main():
    """Main training pipeline execution."""
    print("=" * 80)
    print("Model Training Pipeline Example")
    print("=" * 80)

    # ========================================================================
    # 1. Generate/Load Data
    # ========================================================================
    print("\n[Step 1] Loading data...")
    df = generate_sample_data(n_samples=2000)
    print(f"Loaded {len(df)} samples with {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")

    # ========================================================================
    # 2. Data Preprocessing
    # ========================================================================
    print("\n[Step 2] Preprocessing data...")
    preprocessor = DataPreprocessor(
        scaling_method='standard',
        outlier_method='iqr',
        outlier_threshold=1.5,
        fill_method='forward'
    )

    # Select feature columns (exclude timestamp and target)
    feature_columns = [col for col in df.columns if col not in ['timestamp', 'target']]

    df_processed, outliers = preprocessor.preprocess(
        df,
        fit=True,
        remove_outliers=True,
        normalize=False,  # We'll normalize after feature engineering
        columns=feature_columns
    )

    print(f"Preprocessing complete: {len(df_processed)} samples after outlier removal")
    if outliers is not None:
        print(f"Removed {len(outliers)} outliers")

    # ========================================================================
    # 3. Feature Engineering
    # ========================================================================
    print("\n[Step 3] Engineering features...")
    feature_engineer = FeatureEngineer()

    feature_config = {
        'rolling': {
            'columns': feature_columns,
            'windows': [5, 10, 24],  # 5h, 10h, 24h windows
            'stats': ['mean', 'std', 'min', 'max']
        },
        'delta': {
            'columns': feature_columns,
            'periods': [1, 5, 24]  # 1h, 5h, 24h deltas
        },
        'lag': {
            'columns': feature_columns,
            'lags': [1, 5, 24]  # 1h, 5h, 24h lags
        },
        'time': {
            'timestamp_col': 'timestamp',
            'features': ['hour', 'day_of_week', 'is_weekend', 'is_business_hours']
        }
    }

    df_features = feature_engineer.engineer_features(df_processed, feature_config)

    print(f"Feature engineering complete: {len(feature_engineer.get_feature_names())} features created")
    print(f"Total features: {len(df_features.columns)}")

    # ========================================================================
    # 4. Normalize Features
    # ========================================================================
    print("\n[Step 4] Normalizing features...")
    # Exclude timestamp and target from normalization
    normalize_columns = [col for col in df_features.columns if col not in ['timestamp', 'target']]

    df_normalized = preprocessor.normalize(df_features, columns=normalize_columns, fit=True)

    # ========================================================================
    # 5. Prepare Training Data
    # ========================================================================
    print("\n[Step 5] Preparing training data...")
    # Separate features and target
    X = df_normalized.drop(columns=['timestamp', 'target'])
    y = df_normalized['target']

    print(f"Feature matrix shape: {X.shape}")
    print(f"Target vector shape: {y.shape}")

    # ========================================================================
    # 6. Train Model with Hyperparameter Tuning
    # ========================================================================
    print("\n[Step 6] Training model with hyperparameter tuning...")

    # Define model and hyperparameter grid
    model = RandomForestRegressor(random_state=42)

    param_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [10, 20, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4]
    }

    # Initialize training pipeline
    pipeline = TrainingPipeline(
        model=model,
        param_grid=param_grid,
        test_size=0.2,
        cv_splits=5,
        models_dir='data/models',
        logs_dir='logs'
    )

    # Train model
    best_model = pipeline.train(
        X=X,
        y=y,
        timestamp_col=None,  # Already sorted
        perform_tuning=True
    )

    # ========================================================================
    # 7. Review Results
    # ========================================================================
    print("\n[Step 7] Training Results Summary")
    print("=" * 80)

    metrics = pipeline.get_metrics()

    print("\nTrain Metrics:")
    print(f"  MSE:  {metrics['train_mse']:.4f}")
    print(f"  RMSE: {metrics['train_rmse']:.4f}")
    print(f"  MAE:  {metrics['train_mae']:.4f}")
    print(f"  R²:   {metrics['train_r2']:.4f}")

    print("\nTest Metrics:")
    print(f"  MSE:  {metrics['test_mse']:.4f}")
    print(f"  RMSE: {metrics['test_rmse']:.4f}")
    print(f"  MAE:  {metrics['test_mae']:.4f}")
    print(f"  R²:   {metrics['test_r2']:.4f}")

    print("\nModel Info:")
    print(f"  Model Type: {metrics['model_type']}")
    print(f"  Features: {metrics['n_features']}")
    print(f"  Train Samples: {metrics['n_train_samples']}")
    print(f"  Test Samples: {metrics['n_test_samples']}")

    if 'best_params' in metrics:
        print("\nBest Hyperparameters:")
        for param, value in metrics['best_params'].items():
            print(f"  {param}: {value}")

    print("\n" + "=" * 80)
    print("Training pipeline completed successfully!")
    print("=" * 80)

    # ========================================================================
    # 8. Example: Load and Use Saved Model
    # ========================================================================
    print("\n[Step 8] Demonstrating model loading...")

    from training import ModelVersioning

    versioning = ModelVersioning(models_dir='data/models')

    # List all versions
    versions = versioning.list_versions()
    print(f"\nAvailable model versions: {len(versions)}")

    if versions:
        latest_version = versioning.get_latest_version()
        print(f"Latest version: {latest_version}")

        # Load latest model
        loaded_model, loaded_metadata = versioning.load_model(latest_version)
        print(f"Successfully loaded model version {latest_version}")

        # Make a prediction with loaded model
        sample_prediction = loaded_model.predict(X.iloc[:5])
        print(f"\nSample predictions: {sample_prediction}")


if __name__ == '__main__':
    main()
