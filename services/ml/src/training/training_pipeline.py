"""
Model training pipeline with temporal train/test split,
hyperparameter tuning, versioning, and metrics logging.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple, List, Union
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import json
import logging
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TemporalTrainTestSplit:
    """
    Handles train/test splitting for time-series data with temporal ordering.
    """

    def __init__(self, test_size: float = 0.2, gap: int = 0):
        """
        Initialize temporal split.

        Args:
            test_size: Proportion of data for test set (default 0.2 = 20%)
            gap: Number of samples to skip between train and test (prevents data leakage)
        """
        self.test_size = test_size
        self.gap = gap

    def split(
        self,
        X: Union[pd.DataFrame, np.ndarray],
        y: Union[pd.Series, np.ndarray],
        timestamp_col: Optional[str] = None
    ) -> Tuple[Any, Any, Any, Any]:
        """
        Split data maintaining temporal order.

        Args:
            X: Features
            y: Target variable
            timestamp_col: Name of timestamp column for sorting (if X is DataFrame)

        Returns:
            Tuple of (X_train, X_test, y_train, y_test)
        """
        n_samples = len(X)
        split_idx = int(n_samples * (1 - self.test_size))

        # Sort by timestamp if provided
        if isinstance(X, pd.DataFrame) and timestamp_col and timestamp_col in X.columns:
            sorted_indices = X.sort_values(timestamp_col).index
            X = X.loc[sorted_indices]
            if isinstance(y, pd.Series):
                y = y.loc[sorted_indices]
            elif isinstance(y, np.ndarray):
                y = y[sorted_indices]

        # Apply gap between train and test
        train_end = split_idx - self.gap
        test_start = split_idx

        if isinstance(X, pd.DataFrame):
            X_train = X.iloc[:train_end]
            X_test = X.iloc[test_start:]
        else:
            X_train = X[:train_end]
            X_test = X[test_start:]

        if isinstance(y, pd.Series):
            y_train = y.iloc[:train_end]
            y_test = y.iloc[test_start:]
        else:
            y_train = y[:train_end]
            y_test = y[test_start:]

        logger.info(f"Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")
        logger.info(f"Split ratio: {len(X_train)/n_samples:.2%} train / {len(X_test)/n_samples:.2%} test")

        return X_train, X_test, y_train, y_test


class HyperparameterTuner:
    """
    Handles hyperparameter tuning using grid search with cross-validation.
    """

    def __init__(
        self,
        model,
        param_grid: Dict[str, List[Any]],
        cv_splits: int = 5,
        scoring: str = 'neg_mean_squared_error',
        n_jobs: int = -1
    ):
        """
        Initialize hyperparameter tuner.

        Args:
            model: Scikit-learn compatible model
            param_grid: Dictionary of hyperparameters to search
            cv_splits: Number of cross-validation splits
            scoring: Scoring metric for optimization
            n_jobs: Number of parallel jobs (-1 = all cores)
        """
        self.model = model
        self.param_grid = param_grid
        self.cv_splits = cv_splits
        self.scoring = scoring
        self.n_jobs = n_jobs
        self.best_params = None
        self.best_score = None
        self.cv_results = None

    def tune(
        self,
        X_train: Union[pd.DataFrame, np.ndarray],
        y_train: Union[pd.Series, np.ndarray],
        use_time_series_cv: bool = True
    ) -> Any:
        """
        Perform grid search to find best hyperparameters.

        Args:
            X_train: Training features
            y_train: Training target
            use_time_series_cv: Use TimeSeriesSplit for temporal data

        Returns:
            Best model with optimal hyperparameters
        """
        # Setup cross-validation
        cv = TimeSeriesSplit(n_splits=self.cv_splits) if use_time_series_cv else self.cv_splits

        logger.info(f"Starting grid search with {len(self.param_grid)} parameter combinations")

        # Perform grid search
        grid_search = GridSearchCV(
            estimator=self.model,
            param_grid=self.param_grid,
            cv=cv,
            scoring=self.scoring,
            n_jobs=self.n_jobs,
            verbose=1,
            return_train_score=True
        )

        grid_search.fit(X_train, y_train)

        self.best_params = grid_search.best_params_
        self.best_score = grid_search.best_score_
        self.cv_results = pd.DataFrame(grid_search.cv_results_)

        logger.info(f"Best parameters: {self.best_params}")
        logger.info(f"Best CV score: {self.best_score:.4f}")

        return grid_search.best_estimator_

    def get_results_summary(self) -> pd.DataFrame:
        """Get summary of grid search results."""
        if self.cv_results is None:
            return pd.DataFrame()

        summary = self.cv_results[[
            'params', 'mean_test_score', 'std_test_score',
            'mean_train_score', 'std_train_score', 'rank_test_score'
        ]].sort_values('rank_test_score')

        return summary


class MetricsLogger:
    """
    Handles training metrics logging and storage.
    """

    def __init__(self, log_dir: str = 'logs'):
        """
        Initialize metrics logger.

        Args:
            log_dir: Directory to store log files
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.metrics: Dict[str, Any] = {}

    def log_training_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        stage: str = 'train',
        additional_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """
        Calculate and log training metrics.

        Args:
            y_true: True target values
            y_pred: Predicted target values
            stage: Training stage ('train' or 'test')
            additional_metrics: Additional custom metrics

        Returns:
            Dictionary of computed metrics
        """
        metrics = {
            f'{stage}_mse': mean_squared_error(y_true, y_pred),
            f'{stage}_rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
            f'{stage}_mae': mean_absolute_error(y_true, y_pred),
            f'{stage}_r2': r2_score(y_true, y_pred)
        }

        if additional_metrics:
            for key, value in additional_metrics.items():
                metrics[f'{stage}_{key}'] = value

        self.metrics.update(metrics)

        logger.info(f"{stage.upper()} Metrics:")
        for key, value in metrics.items():
            logger.info(f"  {key}: {value:.4f}")

        return metrics

    def log_model_info(self, model_info: Dict[str, Any]):
        """Log model configuration and metadata."""
        self.metrics.update(model_info)

    def save_logs(self, filename: Optional[str] = None):
        """
        Save metrics to JSON file.

        Args:
            filename: Log filename (default: metrics_{timestamp}.json)
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'metrics_{timestamp}.json'

        log_path = self.log_dir / filename

        with open(log_path, 'w') as f:
            json.dump(self.metrics, f, indent=2, default=str)

        logger.info(f"Metrics saved to {log_path}")

        return str(log_path)

    def get_metrics(self) -> Dict[str, Any]:
        """Get all logged metrics."""
        return self.metrics


class ModelVersioning:
    """
    Handles model versioning with timestamps and metadata.
    """

    def __init__(self, models_dir: str = 'data/models'):
        """
        Initialize model versioning.

        Args:
            models_dir: Directory to store model versions
        """
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(parents=True, exist_ok=True)

    def save_model(
        self,
        model: Any,
        metadata: Dict[str, Any],
        version: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Save model with version and metadata.

        Args:
            model: Trained model object
            metadata: Model metadata (hyperparameters, metrics, etc.)
            version: Version string (default: timestamp)

        Returns:
            Tuple of (model_path, metadata_path)
        """
        if version is None:
            version = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save model
        model_filename = f'model_{version}.joblib'
        model_path = self.models_dir / model_filename
        joblib.dump(model, model_path)

        # Save metadata
        metadata['version'] = version
        metadata['saved_at'] = datetime.now().isoformat()
        metadata['model_file'] = model_filename

        metadata_filename = f'model_{version}_metadata.json'
        metadata_path = self.models_dir / metadata_filename

        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2, default=str)

        logger.info(f"Model saved: {model_path}")
        logger.info(f"Metadata saved: {metadata_path}")

        return str(model_path), str(metadata_path)

    def load_model(self, version: str) -> Tuple[Any, Dict[str, Any]]:
        """
        Load model and metadata by version.

        Args:
            version: Version string

        Returns:
            Tuple of (model, metadata)
        """
        model_path = self.models_dir / f'model_{version}.joblib'
        metadata_path = self.models_dir / f'model_{version}_metadata.json'

        if not model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")

        model = joblib.load(model_path)

        metadata = {}
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

        logger.info(f"Model loaded: {model_path}")

        return model, metadata

    def list_versions(self) -> List[Dict[str, Any]]:
        """
        List all available model versions.

        Returns:
            List of version metadata dictionaries
        """
        versions = []

        for metadata_file in sorted(self.models_dir.glob('model_*_metadata.json')):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
                versions.append(metadata)

        return versions

    def get_latest_version(self) -> Optional[str]:
        """Get the latest model version."""
        versions = self.list_versions()
        if not versions:
            return None

        return versions[-1]['version']


class TrainingPipeline:
    """
    Complete training pipeline integrating all components.
    """

    def __init__(
        self,
        model,
        param_grid: Optional[Dict[str, List[Any]]] = None,
        test_size: float = 0.2,
        cv_splits: int = 5,
        models_dir: str = 'data/models',
        logs_dir: str = 'logs'
    ):
        """
        Initialize training pipeline.

        Args:
            model: Scikit-learn compatible model
            param_grid: Hyperparameter grid for tuning (None = skip tuning)
            test_size: Test set proportion
            cv_splits: Cross-validation splits
            models_dir: Directory for model storage
            logs_dir: Directory for logs
        """
        self.model = model
        self.param_grid = param_grid
        self.splitter = TemporalTrainTestSplit(test_size=test_size)
        self.tuner = None
        self.versioning = ModelVersioning(models_dir=models_dir)
        self.metrics_logger = MetricsLogger(log_dir=logs_dir)
        self.cv_splits = cv_splits

        self.best_model = None
        self.X_train = None
        self.X_test = None
        self.y_train = None
        self.y_test = None

    def train(
        self,
        X: Union[pd.DataFrame, np.ndarray],
        y: Union[pd.Series, np.ndarray],
        timestamp_col: Optional[str] = None,
        perform_tuning: bool = True
    ) -> Any:
        """
        Execute complete training pipeline.

        Args:
            X: Features
            y: Target variable
            timestamp_col: Timestamp column for temporal ordering
            perform_tuning: Whether to perform hyperparameter tuning

        Returns:
            Trained model
        """
        logger.info("=" * 60)
        logger.info("Starting Training Pipeline")
        logger.info("=" * 60)

        # Step 1: Train/test split
        logger.info("\n[1/5] Splitting data...")
        self.X_train, self.X_test, self.y_train, self.y_test = self.splitter.split(
            X, y, timestamp_col=timestamp_col
        )

        # Step 2: Hyperparameter tuning (optional)
        if perform_tuning and self.param_grid:
            logger.info("\n[2/5] Tuning hyperparameters...")
            self.tuner = HyperparameterTuner(
                model=self.model,
                param_grid=self.param_grid,
                cv_splits=self.cv_splits
            )
            self.best_model = self.tuner.tune(self.X_train, self.y_train)
        else:
            logger.info("\n[2/5] Skipping hyperparameter tuning...")
            self.best_model = self.model
            self.best_model.fit(self.X_train, self.y_train)

        # Step 3: Evaluate on train and test sets
        logger.info("\n[3/5] Evaluating model...")
        y_train_pred = self.best_model.predict(self.X_train)
        y_test_pred = self.best_model.predict(self.X_test)

        train_metrics = self.metrics_logger.log_training_metrics(
            self.y_train, y_train_pred, stage='train'
        )
        test_metrics = self.metrics_logger.log_training_metrics(
            self.y_test, y_test_pred, stage='test'
        )

        # Step 4: Log model info
        logger.info("\n[4/5] Logging model information...")
        model_info = {
            'model_type': type(self.best_model).__name__,
            'n_features': X.shape[1],
            'n_train_samples': len(self.X_train),
            'n_test_samples': len(self.X_test),
            'test_size': self.splitter.test_size
        }

        if self.tuner:
            model_info['best_params'] = self.tuner.best_params
            model_info['best_cv_score'] = self.tuner.best_score

        self.metrics_logger.log_model_info(model_info)

        # Step 5: Save model and logs
        logger.info("\n[5/5] Saving model and logs...")
        version = datetime.now().strftime('%Y%m%d_%H%M%S')

        metadata = {
            **model_info,
            **train_metrics,
            **test_metrics
        }

        self.versioning.save_model(self.best_model, metadata, version=version)
        self.metrics_logger.save_logs(filename=f'metrics_{version}.json')

        logger.info("\n" + "=" * 60)
        logger.info("Training Pipeline Complete")
        logger.info("=" * 60)

        return self.best_model

    def get_metrics(self) -> Dict[str, Any]:
        """Get all training metrics."""
        return self.metrics_logger.get_metrics()

    def get_best_model(self) -> Any:
        """Get the best trained model."""
        return self.best_model
