# ML Service - Model Training Pipeline

Complete machine learning pipeline for sensor data with preprocessing, feature engineering, hyperparameter tuning, and model versioning.

## Features

✅ **Data Preprocessing**
- Normalization (Standard, MinMax, Robust scaling)
- Outlier removal (IQR, Z-score methods)
- Missing value handling
- Data quality validation

✅ **Feature Engineering**
- Rolling statistics (mean, std, min, max)
- Delta and percentage change features
- Lag features for time series
- Time-based features (hour, day, weekend)
- Interaction features
- Aggregate features

✅ **Training Pipeline**
- Temporal train/test split (80/20) with ordering preservation
- Grid search hyperparameter tuning with cross-validation
- Model versioning with timestamps
- Comprehensive metrics logging (MSE, RMSE, MAE, R²)

## Installation

```bash
cd services/ml
pip install -r requirements.txt
```

## Quick Start

### 1. Basic Training Example

```python
from preprocessing import DataPreprocessor
from feature_engineering import FeatureEngineer
from training import TrainingPipeline
from sklearn.ensemble import RandomForestRegressor

# Load your data
df = pd.read_csv('sensor_data.csv')

# Preprocess
preprocessor = DataPreprocessor(scaling_method='standard')
df_clean, outliers = preprocessor.preprocess(df, fit=True)

# Engineer features
engineer = FeatureEngineer()
feature_config = {
    'rolling': {
        'columns': ['temperature', 'humidity'],
        'windows': [5, 10, 30],
        'stats': ['mean', 'std']
    },
    'delta': {
        'columns': ['temperature', 'humidity'],
        'periods': [1, 5]
    }
}
df_features = engineer.engineer_features(df_clean, feature_config)

# Prepare data
X = df_features.drop(columns=['target'])
y = df_features['target']

# Train with hyperparameter tuning
model = RandomForestRegressor(random_state=42)
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, None]
}

pipeline = TrainingPipeline(model=model, param_grid=param_grid)
best_model = pipeline.train(X, y, perform_tuning=True)

# Get metrics
metrics = pipeline.get_metrics()
print(f"Test R²: {metrics['test_r2']:.4f}")
print(f"Test MAE: {metrics['test_mae']:.4f}")
```

### 2. Run Example Script

```bash
cd services/ml
python train_example.py
```

This will:
- Generate synthetic sensor data
- Preprocess and engineer features
- Train a model with hyperparameter tuning
- Save model and metrics
- Demonstrate model loading

## Directory Structure

```
services/ml/
├── src/
│   ├── __init__.py
│   ├── preprocessing/
│   │   ├── __init__.py
│   │   └── data_preprocessor.py      # Data cleaning and normalization
│   ├── feature_engineering/
│   │   ├── __init__.py
│   │   └── feature_engineer.py       # Feature creation
│   ├── training/
│   │   ├── __init__.py
│   │   └── training_pipeline.py      # Training orchestration
│   └── utils/                         # Utility functions
├── tests/                             # Unit tests
├── data/
│   ├── raw/                           # Raw input data
│   ├── processed/                     # Processed datasets
│   └── models/                        # Saved model versions
├── logs/                              # Training logs and metrics
├── requirements.txt                   # Python dependencies
├── train_example.py                   # Example training script
└── README.md                          # This file
```

## Component Documentation

### DataPreprocessor

Handles data preprocessing with multiple strategies.

```python
from preprocessing import DataPreprocessor

preprocessor = DataPreprocessor(
    scaling_method='standard',      # 'standard', 'minmax', 'robust'
    outlier_method='iqr',           # 'iqr', 'zscore'
    outlier_threshold=1.5,          # Multiplier for outlier detection
    fill_method='forward'           # 'forward', 'backward', 'mean', 'median'
)

# Preprocess data
df_clean, outliers = preprocessor.preprocess(
    df,
    fit=True,                       # Fit scalers (use False for inference)
    remove_outliers=True,
    normalize=True,
    columns=['temp', 'humidity']    # Columns to process (None = all numeric)
)

# Get preprocessing stats
stats = preprocessor.get_stats()
```

**Methods:**
- `handle_missing_values()`: Fill or interpolate missing data
- `remove_outliers_iqr()`: IQR-based outlier detection
- `remove_outliers_zscore()`: Z-score based outlier detection
- `normalize()`: Apply scaling transformation
- `preprocess()`: Complete preprocessing pipeline

### FeatureEngineer

Creates time-series and statistical features.

```python
from feature_engineering import FeatureEngineer

engineer = FeatureEngineer()

# Configure feature engineering
config = {
    'rolling': {
        'columns': ['temperature', 'humidity', 'pressure'],
        'windows': [5, 10, 30, 60],      # Window sizes
        'stats': ['mean', 'std', 'min', 'max']
    },
    'delta': {
        'columns': ['temperature', 'humidity'],
        'periods': [1, 5, 10]             # Time periods for differences
    },
    'lag': {
        'columns': ['temperature'],
        'lags': [1, 5, 24]                # Lag periods
    },
    'time': {
        'timestamp_col': 'timestamp',
        'features': ['hour', 'day_of_week', 'is_weekend', 'is_business_hours']
    },
    'interaction': {
        'column_pairs': [('temperature', 'humidity')]
    }
}

df_features = engineer.engineer_features(df, config)

# Get created feature names
feature_names = engineer.get_feature_names()
print(f"Created {len(feature_names)} features")
```

**Feature Types:**
- **Rolling**: Moving window statistics
- **Delta**: Absolute and percentage changes
- **Lag**: Historical values
- **Time**: Temporal patterns (hour, day, weekend)
- **Interaction**: Feature combinations
- **Aggregate**: Group-based statistics

### TrainingPipeline

Orchestrates the complete training workflow.

```python
from training import TrainingPipeline
from sklearn.ensemble import RandomForestRegressor

# Define model and hyperparameter grid
model = RandomForestRegressor(random_state=42)
param_grid = {
    'n_estimators': [50, 100, 200],
    'max_depth': [10, 20, None],
    'min_samples_split': [2, 5, 10]
}

# Initialize pipeline
pipeline = TrainingPipeline(
    model=model,
    param_grid=param_grid,           # None to skip tuning
    test_size=0.2,                   # 20% test set
    cv_splits=5,                     # Cross-validation folds
    models_dir='data/models',
    logs_dir='logs'
)

# Train
best_model = pipeline.train(
    X=X,
    y=y,
    timestamp_col='timestamp',       # For temporal ordering
    perform_tuning=True              # Enable grid search
)

# Access results
metrics = pipeline.get_metrics()
model = pipeline.get_best_model()
```

**Pipeline Steps:**
1. **Temporal Train/Test Split**: 80/20 split preserving time order
2. **Hyperparameter Tuning**: Grid search with TimeSeriesSplit CV
3. **Model Evaluation**: Calculate train and test metrics
4. **Model Versioning**: Save with timestamp and metadata
5. **Metrics Logging**: Record all metrics to JSON

### TemporalTrainTestSplit

Time-aware data splitting for temporal data.

```python
from training import TemporalTrainTestSplit

splitter = TemporalTrainTestSplit(
    test_size=0.2,                   # 20% for test
    gap=0                            # Gap between train and test (prevents leakage)
)

X_train, X_test, y_train, y_test = splitter.split(
    X, y,
    timestamp_col='timestamp'        # Sort by this column
)
```

**Key Features:**
- Maintains temporal ordering
- Optional gap to prevent data leakage
- Automatic sorting by timestamp

### HyperparameterTuner

Grid search with time-series cross-validation.

```python
from training import HyperparameterTuner
from sklearn.ensemble import GradientBoostingRegressor

model = GradientBoostingRegressor()
param_grid = {
    'n_estimators': [100, 200, 300],
    'learning_rate': [0.01, 0.05, 0.1],
    'max_depth': [3, 5, 7]
}

tuner = HyperparameterTuner(
    model=model,
    param_grid=param_grid,
    cv_splits=5,
    scoring='neg_mean_squared_error',
    n_jobs=-1                        # Use all CPU cores
)

best_model = tuner.tune(X_train, y_train, use_time_series_cv=True)

# Review results
print(f"Best parameters: {tuner.best_params}")
print(f"Best CV score: {tuner.best_score}")

results_df = tuner.get_results_summary()
```

### MetricsLogger

Track and save training metrics.

```python
from training import MetricsLogger

logger = MetricsLogger(log_dir='logs')

# Log training metrics
train_metrics = logger.log_training_metrics(
    y_true=y_train,
    y_pred=y_train_pred,
    stage='train',
    additional_metrics={'custom_metric': 0.95}
)

# Log test metrics
test_metrics = logger.log_training_metrics(
    y_true=y_test,
    y_pred=y_test_pred,
    stage='test'
)

# Log model info
logger.log_model_info({
    'model_type': 'RandomForest',
    'n_features': 50,
    'hyperparameters': {'n_estimators': 100}
})

# Save to file
log_path = logger.save_logs(filename='training_metrics.json')
```

**Logged Metrics:**
- MSE (Mean Squared Error)
- RMSE (Root Mean Squared Error)
- MAE (Mean Absolute Error)
- R² (Coefficient of Determination)

### ModelVersioning

Version control for trained models.

```python
from training import ModelVersioning

versioning = ModelVersioning(models_dir='data/models')

# Save model with metadata
metadata = {
    'model_type': 'RandomForest',
    'test_r2': 0.85,
    'test_mae': 2.3,
    'features': feature_list,
    'hyperparameters': best_params
}

model_path, metadata_path = versioning.save_model(
    model=trained_model,
    metadata=metadata,
    version='20240109_143022'        # Auto-generated if None
)

# List all versions
versions = versioning.list_versions()
for v in versions:
    print(f"Version {v['version']}: R² = {v['test_r2']}")

# Get latest version
latest = versioning.get_latest_version()

# Load specific version
model, metadata = versioning.load_model(version=latest)
```

## Configuration Examples

### Preprocessing Configurations

```python
# Configuration 1: Conservative outlier removal
preprocessor = DataPreprocessor(
    scaling_method='robust',         # Robust to outliers
    outlier_method='iqr',
    outlier_threshold=3.0,           # More lenient (3x IQR)
    fill_method='median'
)

# Configuration 2: Aggressive outlier removal
preprocessor = DataPreprocessor(
    scaling_method='standard',
    outlier_method='zscore',
    outlier_threshold=2.0,           # Stricter (2 std devs)
    fill_method='forward'
)

# Configuration 3: Minimal preprocessing
preprocessor = DataPreprocessor(
    scaling_method='minmax',         # Scale to [0, 1]
    outlier_method='iqr',
    outlier_threshold=1.5,
    fill_method='mean'
)
```

### Feature Engineering Configurations

```python
# Configuration 1: Short-term patterns
short_term_config = {
    'rolling': {
        'columns': ['temperature', 'humidity'],
        'windows': [5, 10, 15],
        'stats': ['mean', 'std']
    },
    'delta': {
        'columns': ['temperature', 'humidity'],
        'periods': [1, 5]
    },
    'time': {
        'timestamp_col': 'timestamp',
        'features': ['hour', 'is_business_hours']
    }
}

# Configuration 2: Long-term patterns
long_term_config = {
    'rolling': {
        'columns': ['temperature', 'humidity', 'pressure'],
        'windows': [24, 48, 168],    # Day, 2 days, week
        'stats': ['mean', 'std', 'min', 'max']
    },
    'delta': {
        'columns': ['temperature'],
        'periods': [24, 168]
    },
    'lag': {
        'columns': ['temperature'],
        'lags': [24, 48, 168]
    },
    'time': {
        'timestamp_col': 'timestamp',
        'features': ['hour', 'day_of_week', 'is_weekend']
    }
}

# Configuration 3: Comprehensive features
comprehensive_config = {
    'rolling': {
        'columns': ['temperature', 'humidity', 'pressure', 'co2'],
        'windows': [5, 10, 30, 60, 120],
        'stats': ['mean', 'std', 'min', 'max', 'median']
    },
    'delta': {
        'columns': ['temperature', 'humidity', 'co2'],
        'periods': [1, 5, 10, 30]
    },
    'lag': {
        'columns': ['temperature', 'humidity'],
        'lags': [1, 5, 10, 30, 60]
    },
    'time': {
        'timestamp_col': 'timestamp',
        'features': ['hour', 'day_of_week', 'day_of_month', 'month',
                     'is_weekend', 'is_business_hours']
    },
    'interaction': {
        'column_pairs': [('temperature', 'humidity'), ('co2', 'humidity')]
    }
}
```

### Model Hyperparameter Grids

```python
# Random Forest
rf_param_grid = {
    'n_estimators': [50, 100, 200, 300],
    'max_depth': [10, 20, 30, None],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'max_features': ['sqrt', 'log2', None]
}

# Gradient Boosting
gb_param_grid = {
    'n_estimators': [100, 200, 300],
    'learning_rate': [0.01, 0.05, 0.1],
    'max_depth': [3, 5, 7],
    'min_samples_split': [2, 5, 10],
    'subsample': [0.8, 0.9, 1.0]
}

# Ridge Regression
ridge_param_grid = {
    'alpha': [0.001, 0.01, 0.1, 1.0, 10.0, 100.0],
    'solver': ['auto', 'svd', 'cholesky']
}

# Support Vector Regression
svr_param_grid = {
    'C': [0.1, 1.0, 10.0, 100.0],
    'epsilon': [0.01, 0.1, 0.5],
    'kernel': ['linear', 'rbf', 'poly']
}
```

## Best Practices

### 1. Data Preprocessing
- Always split data BEFORE preprocessing to avoid data leakage
- Use `fit=True` only on training data
- Apply the same preprocessing to train and test using `fit=False`
- Monitor outlier removal percentage (>10% may indicate issues)

### 2. Feature Engineering
- Start with simple features, add complexity gradually
- Check for multicollinearity (highly correlated features)
- Remove features with >80% missing values
- Use domain knowledge to create meaningful interactions

### 3. Model Training
- Use TimeSeriesSplit for temporal data cross-validation
- Start with conservative hyperparameter grids
- Monitor train vs test metrics for overfitting
- Version all models with metadata for reproducibility

### 4. Evaluation
- Always evaluate on held-out test set
- Use multiple metrics (MSE, MAE, R²)
- Check residual plots for patterns
- Validate on recent data for production readiness

## Performance Optimization

### Parallel Processing

```python
# Use all CPU cores for grid search
tuner = HyperparameterTuner(
    model=model,
    param_grid=param_grid,
    n_jobs=-1                        # Use all cores
)
```

### Reduced Feature Set

```python
# Use feature importance to select top features
from sklearn.ensemble import RandomForestRegressor

model = RandomForestRegressor()
model.fit(X_train, y_train)

# Get feature importances
importances = pd.DataFrame({
    'feature': X_train.columns,
    'importance': model.feature_importances_
}).sort_values('importance', ascending=False)

# Select top 50 features
top_features = importances.head(50)['feature'].tolist()
X_train_reduced = X_train[top_features]
X_test_reduced = X_test[top_features]
```

### Incremental Learning

```python
# For large datasets, use partial_fit if supported
from sklearn.linear_model import SGDRegressor

model = SGDRegressor()

# Train in batches
batch_size = 1000
for i in range(0, len(X_train), batch_size):
    X_batch = X_train[i:i+batch_size]
    y_batch = y_train[i:i+batch_size]
    model.partial_fit(X_batch, y_batch)
```

## Troubleshooting

### Issue: High Training Error
- Check data quality (missing values, outliers)
- Try more complex models
- Engineer more features
- Reduce regularization

### Issue: High Test Error (Overfitting)
- Simplify model (reduce complexity)
- Increase regularization
- Use more training data
- Remove correlated features
- Apply early stopping

### Issue: Slow Training
- Reduce hyperparameter grid size
- Use fewer CV splits
- Enable parallel processing (`n_jobs=-1`)
- Reduce feature count
- Use simpler models

### Issue: Memory Errors
- Process data in batches
- Reduce feature count
- Use sparse matrices for sparse data
- Increase system memory
- Use incremental learning

## Testing

Run unit tests:

```bash
pytest tests/ -v --cov=src
```

## Future Enhancements

- [ ] Add neural network support (TensorFlow/PyTorch)
- [ ] Implement automated feature selection
- [ ] Add ensemble methods
- [ ] Support for distributed training
- [ ] Real-time model monitoring
- [ ] A/B testing framework
- [ ] Model explainability (SHAP values)
- [ ] Automated data drift detection

## License

MIT License

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request
