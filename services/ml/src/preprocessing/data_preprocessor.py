"""
Data preprocessing pipeline for sensor data.
Includes normalization, outlier removal, and data cleaning.
"""

import numpy as np
import pandas as pd
from typing import Tuple, Optional, List, Dict, Any
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from scipy import stats
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataPreprocessor:
    """
    Handles data preprocessing including normalization and outlier removal.
    """

    def __init__(
        self,
        scaling_method: str = 'standard',
        outlier_method: str = 'iqr',
        outlier_threshold: float = 1.5,
        fill_method: str = 'forward'
    ):
        """
        Initialize the data preprocessor.

        Args:
            scaling_method: Normalization method ('standard', 'minmax', 'robust')
            outlier_method: Outlier detection method ('iqr', 'zscore', 'isolation_forest')
            outlier_threshold: Threshold for outlier detection (IQR multiplier or z-score)
            fill_method: Method to fill missing values ('forward', 'backward', 'mean', 'median')
        """
        self.scaling_method = scaling_method
        self.outlier_method = outlier_method
        self.outlier_threshold = outlier_threshold
        self.fill_method = fill_method

        # Initialize scaler based on method
        self.scaler = self._get_scaler(scaling_method)
        self.is_fitted = False

        # Store preprocessing statistics
        self.stats: Dict[str, Any] = {}

    def _get_scaler(self, method: str):
        """Get the appropriate scaler based on method."""
        scalers = {
            'standard': StandardScaler(),
            'minmax': MinMaxScaler(),
            'robust': RobustScaler()
        }

        if method not in scalers:
            raise ValueError(f"Unknown scaling method: {method}. Choose from {list(scalers.keys())}")

        return scalers[method]

    def handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset.

        Args:
            df: Input dataframe

        Returns:
            DataFrame with missing values handled
        """
        df_copy = df.copy()

        # Log missing value statistics
        missing_counts = df_copy.isnull().sum()
        if missing_counts.sum() > 0:
            logger.info(f"Missing values found:\n{missing_counts[missing_counts > 0]}")

        # Apply filling method
        numeric_columns = df_copy.select_dtypes(include=[np.number]).columns

        if self.fill_method == 'forward':
            df_copy[numeric_columns] = df_copy[numeric_columns].fillna(method='ffill')
        elif self.fill_method == 'backward':
            df_copy[numeric_columns] = df_copy[numeric_columns].fillna(method='bfill')
        elif self.fill_method == 'mean':
            df_copy[numeric_columns] = df_copy[numeric_columns].fillna(df_copy[numeric_columns].mean())
        elif self.fill_method == 'median':
            df_copy[numeric_columns] = df_copy[numeric_columns].fillna(df_copy[numeric_columns].median())
        else:
            raise ValueError(f"Unknown fill method: {self.fill_method}")

        # Fill any remaining NaN values with 0
        df_copy = df_copy.fillna(0)

        return df_copy

    def remove_outliers_iqr(self, df: pd.DataFrame, columns: Optional[List[str]] = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Remove outliers using the IQR method.

        Args:
            df: Input dataframe
            columns: Columns to check for outliers (None = all numeric columns)

        Returns:
            Tuple of (cleaned dataframe, outliers dataframe)
        """
        df_copy = df.copy()

        if columns is None:
            columns = df_copy.select_dtypes(include=[np.number]).columns.tolist()

        outlier_mask = pd.Series([False] * len(df_copy), index=df_copy.index)

        for col in columns:
            Q1 = df_copy[col].quantile(0.25)
            Q3 = df_copy[col].quantile(0.75)
            IQR = Q3 - Q1

            lower_bound = Q1 - self.outlier_threshold * IQR
            upper_bound = Q3 + self.outlier_threshold * IQR

            col_outliers = (df_copy[col] < lower_bound) | (df_copy[col] > upper_bound)
            outlier_mask = outlier_mask | col_outliers

            # Store bounds for logging
            self.stats[f'{col}_bounds'] = {'lower': lower_bound, 'upper': upper_bound, 'IQR': IQR}

        outliers = df_copy[outlier_mask]
        cleaned = df_copy[~outlier_mask]

        if len(outliers) > 0:
            logger.info(f"Removed {len(outliers)} outliers ({len(outliers)/len(df_copy)*100:.2f}%)")

        return cleaned, outliers

    def remove_outliers_zscore(self, df: pd.DataFrame, columns: Optional[List[str]] = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Remove outliers using the Z-score method.

        Args:
            df: Input dataframe
            columns: Columns to check for outliers (None = all numeric columns)

        Returns:
            Tuple of (cleaned dataframe, outliers dataframe)
        """
        df_copy = df.copy()

        if columns is None:
            columns = df_copy.select_dtypes(include=[np.number]).columns.tolist()

        outlier_mask = pd.Series([False] * len(df_copy), index=df_copy.index)

        for col in columns:
            z_scores = np.abs(stats.zscore(df_copy[col], nan_policy='omit'))
            col_outliers = z_scores > self.outlier_threshold
            outlier_mask = outlier_mask | col_outliers

        outliers = df_copy[outlier_mask]
        cleaned = df_copy[~outlier_mask]

        if len(outliers) > 0:
            logger.info(f"Removed {len(outliers)} outliers ({len(outliers)/len(df_copy)*100:.2f}%)")

        return cleaned, outliers

    def remove_outliers(self, df: pd.DataFrame, columns: Optional[List[str]] = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Remove outliers using the configured method.

        Args:
            df: Input dataframe
            columns: Columns to check for outliers

        Returns:
            Tuple of (cleaned dataframe, outliers dataframe)
        """
        if self.outlier_method == 'iqr':
            return self.remove_outliers_iqr(df, columns)
        elif self.outlier_method == 'zscore':
            return self.remove_outliers_zscore(df, columns)
        else:
            raise ValueError(f"Unknown outlier method: {self.outlier_method}")

    def normalize(self, df: pd.DataFrame, columns: Optional[List[str]] = None, fit: bool = True) -> pd.DataFrame:
        """
        Normalize numeric columns using the configured scaling method.

        Args:
            df: Input dataframe
            columns: Columns to normalize (None = all numeric columns)
            fit: Whether to fit the scaler (True for training, False for inference)

        Returns:
            Normalized dataframe
        """
        df_copy = df.copy()

        if columns is None:
            columns = df_copy.select_dtypes(include=[np.number]).columns.tolist()

        if fit:
            df_copy[columns] = self.scaler.fit_transform(df_copy[columns])
            self.is_fitted = True
            logger.info(f"Fitted {self.scaling_method} scaler on {len(columns)} columns")
        else:
            if not self.is_fitted:
                raise ValueError("Scaler not fitted. Call normalize with fit=True first.")
            df_copy[columns] = self.scaler.transform(df_copy[columns])

        return df_copy

    def preprocess(
        self,
        df: pd.DataFrame,
        fit: bool = True,
        remove_outliers: bool = True,
        normalize: bool = True,
        columns: Optional[List[str]] = None
    ) -> Tuple[pd.DataFrame, Optional[pd.DataFrame]]:
        """
        Complete preprocessing pipeline.

        Args:
            df: Input dataframe
            fit: Whether to fit scalers (True for training, False for inference)
            remove_outliers: Whether to remove outliers
            normalize: Whether to normalize data
            columns: Columns to process (None = all numeric columns)

        Returns:
            Tuple of (processed dataframe, outliers dataframe or None)
        """
        logger.info(f"Starting preprocessing pipeline on {len(df)} rows")

        # Step 1: Handle missing values
        df_processed = self.handle_missing_values(df)

        # Step 2: Remove outliers (only during training)
        outliers = None
        if remove_outliers and fit:
            df_processed, outliers = self.remove_outliers(df_processed, columns)

        # Step 3: Normalize
        if normalize:
            df_processed = self.normalize(df_processed, columns, fit=fit)

        logger.info(f"Preprocessing complete. Output: {len(df_processed)} rows")

        return df_processed, outliers

    def get_stats(self) -> Dict[str, Any]:
        """Get preprocessing statistics."""
        return {
            'scaling_method': self.scaling_method,
            'outlier_method': self.outlier_method,
            'outlier_threshold': self.outlier_threshold,
            'fill_method': self.fill_method,
            'is_fitted': self.is_fitted,
            **self.stats
        }
