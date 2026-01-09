"""
Feature engineering functions for sensor data.
Includes rolling statistics, deltas, and time-based features.
"""

import numpy as np
import pandas as pd
from typing import List, Optional, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Handles feature engineering for time-series sensor data.
    """

    def __init__(self):
        """Initialize the feature engineer."""
        self.feature_names: List[str] = []
        self.feature_config: Dict[str, Any] = {}

    def create_rolling_features(
        self,
        df: pd.DataFrame,
        columns: List[str],
        windows: List[int] = [5, 10, 30, 60],
        stats: List[str] = ['mean', 'std', 'min', 'max']
    ) -> pd.DataFrame:
        """
        Create rolling statistical features.

        Args:
            df: Input dataframe with temporal data
            columns: Columns to compute rolling stats for
            windows: Window sizes (in number of rows/time periods)
            stats: Statistical measures to compute

        Returns:
            DataFrame with added rolling features
        """
        df_copy = df.copy()

        for col in columns:
            for window in windows:
                for stat in stats:
                    feature_name = f'{col}_rolling_{window}_{stat}'

                    if stat == 'mean':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).mean()
                    elif stat == 'std':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).std()
                    elif stat == 'min':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).min()
                    elif stat == 'max':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).max()
                    elif stat == 'median':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).median()
                    elif stat == 'sum':
                        df_copy[feature_name] = df_copy[col].rolling(window=window, min_periods=1).sum()

                    self.feature_names.append(feature_name)

        logger.info(f"Created {len(columns) * len(windows) * len(stats)} rolling features")
        return df_copy

    def create_delta_features(
        self,
        df: pd.DataFrame,
        columns: List[str],
        periods: List[int] = [1, 5, 10]
    ) -> pd.DataFrame:
        """
        Create delta (difference) features.

        Args:
            df: Input dataframe
            columns: Columns to compute deltas for
            periods: Time periods for delta calculation

        Returns:
            DataFrame with added delta features
        """
        df_copy = df.copy()

        for col in columns:
            for period in periods:
                # Absolute difference
                feature_name = f'{col}_delta_{period}'
                df_copy[feature_name] = df_copy[col].diff(periods=period).fillna(0)
                self.feature_names.append(feature_name)

                # Percentage change
                pct_feature_name = f'{col}_pct_change_{period}'
                df_copy[pct_feature_name] = df_copy[col].pct_change(periods=period).fillna(0)
                # Replace inf values
                df_copy[pct_feature_name] = df_copy[pct_feature_name].replace([np.inf, -np.inf], 0)
                self.feature_names.append(pct_feature_name)

        logger.info(f"Created {len(columns) * len(periods) * 2} delta features")
        return df_copy

    def create_lag_features(
        self,
        df: pd.DataFrame,
        columns: List[str],
        lags: List[int] = [1, 5, 10, 30]
    ) -> pd.DataFrame:
        """
        Create lagged features for time series.

        Args:
            df: Input dataframe
            columns: Columns to create lags for
            lags: Lag periods

        Returns:
            DataFrame with added lag features
        """
        df_copy = df.copy()

        for col in columns:
            for lag in lags:
                feature_name = f'{col}_lag_{lag}'
                df_copy[feature_name] = df_copy[col].shift(lag).fillna(0)
                self.feature_names.append(feature_name)

        logger.info(f"Created {len(columns) * len(lags)} lag features")
        return df_copy

    def create_time_features(
        self,
        df: pd.DataFrame,
        timestamp_col: str = 'timestamp',
        include_features: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Create time-based features from timestamp.

        Args:
            df: Input dataframe
            timestamp_col: Name of timestamp column
            include_features: Specific features to include (None = all)

        Returns:
            DataFrame with added time features
        """
        df_copy = df.copy()

        if timestamp_col not in df_copy.columns:
            logger.warning(f"Timestamp column '{timestamp_col}' not found")
            return df_copy

        # Ensure timestamp is datetime
        if not pd.api.types.is_datetime64_any_dtype(df_copy[timestamp_col]):
            df_copy[timestamp_col] = pd.to_datetime(df_copy[timestamp_col])

        all_features = {
            'hour': lambda dt: dt.hour,
            'day_of_week': lambda dt: dt.dayofweek,
            'day_of_month': lambda dt: dt.day,
            'month': lambda dt: dt.month,
            'quarter': lambda dt: dt.quarter,
            'is_weekend': lambda dt: dt.dayofweek.isin([5, 6]).astype(int),
            'is_business_hours': lambda dt: ((dt.hour >= 9) & (dt.hour <= 17)).astype(int),
        }

        features_to_create = include_features if include_features else all_features.keys()

        for feature_name in features_to_create:
            if feature_name in all_features:
                df_copy[feature_name] = all_features[feature_name](df_copy[timestamp_col].dt)
                self.feature_names.append(feature_name)

        logger.info(f"Created {len(features_to_create)} time features")
        return df_copy

    def create_interaction_features(
        self,
        df: pd.DataFrame,
        column_pairs: List[tuple]
    ) -> pd.DataFrame:
        """
        Create interaction features between column pairs.

        Args:
            df: Input dataframe
            column_pairs: List of tuples of column names to interact

        Returns:
            DataFrame with added interaction features
        """
        df_copy = df.copy()

        for col1, col2 in column_pairs:
            if col1 in df_copy.columns and col2 in df_copy.columns:
                # Multiplication
                feature_name = f'{col1}_x_{col2}'
                df_copy[feature_name] = df_copy[col1] * df_copy[col2]
                self.feature_names.append(feature_name)

                # Division (avoid division by zero)
                feature_name = f'{col1}_div_{col2}'
                df_copy[feature_name] = df_copy[col1] / (df_copy[col2] + 1e-8)
                df_copy[feature_name] = df_copy[feature_name].replace([np.inf, -np.inf], 0)
                self.feature_names.append(feature_name)

        logger.info(f"Created {len(column_pairs) * 2} interaction features")
        return df_copy

    def create_aggregate_features(
        self,
        df: pd.DataFrame,
        columns: List[str],
        group_by: str,
        agg_functions: List[str] = ['mean', 'std', 'min', 'max']
    ) -> pd.DataFrame:
        """
        Create aggregate features grouped by a column.

        Args:
            df: Input dataframe
            columns: Columns to aggregate
            group_by: Column to group by
            agg_functions: Aggregation functions to apply

        Returns:
            DataFrame with added aggregate features
        """
        df_copy = df.copy()

        if group_by not in df_copy.columns:
            logger.warning(f"Group by column '{group_by}' not found")
            return df_copy

        for col in columns:
            if col in df_copy.columns:
                for func in agg_functions:
                    feature_name = f'{col}_{func}_by_{group_by}'
                    grouped = df_copy.groupby(group_by)[col].transform(func)
                    df_copy[feature_name] = grouped
                    self.feature_names.append(feature_name)

        logger.info(f"Created {len(columns) * len(agg_functions)} aggregate features")
        return df_copy

    def engineer_features(
        self,
        df: pd.DataFrame,
        config: Dict[str, Any]
    ) -> pd.DataFrame:
        """
        Apply all configured feature engineering steps.

        Args:
            df: Input dataframe
            config: Configuration dictionary with feature engineering parameters
                {
                    'rolling': {'columns': [...], 'windows': [...], 'stats': [...]},
                    'delta': {'columns': [...], 'periods': [...]},
                    'lag': {'columns': [...], 'lags': [...]},
                    'time': {'timestamp_col': '...', 'features': [...]},
                    'interaction': {'column_pairs': [(col1, col2), ...]},
                    'aggregate': {'columns': [...], 'group_by': '...', 'functions': [...]}
                }

        Returns:
            DataFrame with all engineered features
        """
        df_processed = df.copy()
        self.feature_config = config

        # Rolling features
        if 'rolling' in config:
            params = config['rolling']
            df_processed = self.create_rolling_features(
                df_processed,
                columns=params.get('columns', []),
                windows=params.get('windows', [5, 10, 30]),
                stats=params.get('stats', ['mean', 'std', 'min', 'max'])
            )

        # Delta features
        if 'delta' in config:
            params = config['delta']
            df_processed = self.create_delta_features(
                df_processed,
                columns=params.get('columns', []),
                periods=params.get('periods', [1, 5, 10])
            )

        # Lag features
        if 'lag' in config:
            params = config['lag']
            df_processed = self.create_lag_features(
                df_processed,
                columns=params.get('columns', []),
                lags=params.get('lags', [1, 5, 10])
            )

        # Time features
        if 'time' in config:
            params = config['time']
            df_processed = self.create_time_features(
                df_processed,
                timestamp_col=params.get('timestamp_col', 'timestamp'),
                include_features=params.get('features', None)
            )

        # Interaction features
        if 'interaction' in config:
            params = config['interaction']
            df_processed = self.create_interaction_features(
                df_processed,
                column_pairs=params.get('column_pairs', [])
            )

        # Aggregate features
        if 'aggregate' in config:
            params = config['aggregate']
            df_processed = self.create_aggregate_features(
                df_processed,
                columns=params.get('columns', []),
                group_by=params.get('group_by', ''),
                agg_functions=params.get('functions', ['mean', 'std'])
            )

        logger.info(f"Feature engineering complete. Created {len(self.feature_names)} features")
        return df_processed

    def get_feature_names(self) -> List[str]:
        """Get list of all created feature names."""
        return self.feature_names

    def get_feature_config(self) -> Dict[str, Any]:
        """Get feature engineering configuration."""
        return self.feature_config
