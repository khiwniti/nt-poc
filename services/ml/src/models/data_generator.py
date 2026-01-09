"""
Generate synthetic battery degradation data for RUL prediction training.

Simulates battery degradation curves with realistic patterns:
- State of Charge (SoC): 0-100%
- State of Health (SoH): Degrades from 100% to 70%
- Temperature: 15-45°C with seasonal variations
- Voltage: 3.0-4.2V correlates with SoC
- Cycle count: Increases over time
- RUL: Days until SoH drops below 70%
"""

import numpy as np
import pandas as pd
from typing import Tuple, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BatteryDegradationGenerator:
    """Generate synthetic battery degradation sequences"""
    
    def __init__(self, seed: int = 42):
        """
        Initialize generator.
        
        Args:
            seed: Random seed for reproducibility
        """
        np.random.seed(seed)
        self.seed = seed
        
    def generate_battery_lifecycle(
        self,
        total_days: int = 1095,  # ~3 years
        initial_soh: float = 100.0,
        failure_threshold: float = 70.0,
        daily_readings: int = 1
    ) -> pd.DataFrame:
        """
        Generate a single battery's lifecycle data.
        
        Args:
            total_days: Total days to simulate
            initial_soh: Initial State of Health (%)
            failure_threshold: SoH threshold for replacement (%)
            daily_readings: Number of readings per day
            
        Returns:
            DataFrame with battery lifecycle data
        """
        n_points = total_days * daily_readings
        
        # Time series
        days = np.linspace(0, total_days, n_points)
        
        # State of Health (SoH) - exponential degradation
        degradation_rate = np.random.uniform(0.008, 0.012)  # % per day
        noise_soh = np.random.normal(0, 0.5, n_points)
        soh = initial_soh - (degradation_rate * days) + noise_soh
        soh = np.clip(soh, failure_threshold, 100.0)
        
        # State of Charge (SoC) - random daily cycles
        base_soc = np.random.uniform(40, 90, n_points)
        soc_cycles = 20 * np.sin(2 * np.pi * days / 1)  # Daily charging cycles
        soc = base_soc + soc_cycles + np.random.normal(0, 5, n_points)
        soc = np.clip(soc, 0, 100)
        
        # Temperature - seasonal variation
        avg_temp = np.random.uniform(20, 30)
        seasonal = 8 * np.sin(2 * np.pi * days / 365)  # Yearly cycle
        temp = avg_temp + seasonal + np.random.normal(0, 2, n_points)
        temp = np.clip(temp, 15, 45)
        
        # Voltage - correlates with SoC
        voltage = 3.0 + (soc / 100) * 1.2 + np.random.normal(0, 0.05, n_points)
        voltage = np.clip(voltage, 3.0, 4.2)
        
        # Cycle count - increases with time
        cycles = (days * np.random.uniform(0.5, 1.5)).astype(int)
        
        # RUL - calculate remaining days until failure
        failure_day = total_days
        for i, s in enumerate(soh):
            if s <= failure_threshold:
                failure_day = days[i]
                break
        
        rul = np.maximum(0, failure_day - days)
        
        df = pd.DataFrame({
            'day': days,
            'soc': soc,
            'soh': soh,
            'temperature': temp,
            'voltage': voltage,
            'cycles': cycles,
            'rul': rul
        })
        
        return df
    
    def generate_dataset(
        self,
        n_batteries: int = 500,
        total_days: int = 1095,
        daily_readings: int = 1
    ) -> pd.DataFrame:
        """
        Generate dataset with multiple battery lifecycles.
        
        Args:
            n_batteries: Number of batteries to simulate
            total_days: Days per battery lifecycle
            daily_readings: Readings per day
            
        Returns:
            Combined DataFrame with all batteries
        """
        logger.info(f"Generating dataset with {n_batteries} batteries...")
        
        all_data = []
        
        for battery_id in range(n_batteries):
            if (battery_id + 1) % 50 == 0:
                logger.info(f"  Generated {battery_id + 1}/{n_batteries} batteries")
            
            # Vary initial conditions
            initial_soh = np.random.uniform(98, 100)
            failure_threshold = np.random.uniform(68, 72)
            
            df = self.generate_battery_lifecycle(
                total_days=total_days,
                initial_soh=initial_soh,
                failure_threshold=failure_threshold,
                daily_readings=daily_readings
            )
            
            df['battery_id'] = battery_id
            all_data.append(df)
        
        combined = pd.concat(all_data, ignore_index=True)
        
        logger.info(f"Generated {len(combined)} total data points")
        logger.info(f"Features: {combined.columns.tolist()}")
        
        return combined
    
    def create_sequences(
        self,
        df: pd.DataFrame,
        sequence_length: int = 10,
        feature_cols: List[str] = None
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create LSTM sequences from time series data.
        
        Args:
            df: DataFrame with battery data
            sequence_length: Number of time steps per sequence
            feature_cols: Feature columns to use
            
        Returns:
            Tuple of (X sequences, y targets)
        """
        if feature_cols is None:
            feature_cols = ['soc', 'soh', 'temperature', 'voltage', 'cycles']
        
        X_sequences = []
        y_targets = []
        
        # Group by battery
        for battery_id in df['battery_id'].unique():
            battery_data = df[df['battery_id'] == battery_id].sort_values('day')
            
            features = battery_data[feature_cols].values
            targets = battery_data['rul'].values
            
            # Create sequences
            for i in range(len(features) - sequence_length):
                X_sequences.append(features[i:i + sequence_length])
                y_targets.append(targets[i + sequence_length])
        
        X = np.array(X_sequences)
        y = np.array(y_targets)
        
        logger.info(f"Created {len(X)} sequences")
        logger.info(f"Sequence shape: {X.shape}")
        logger.info(f"Target shape: {y.shape}")
        
        return X, y
    
    def split_data(
        self,
        X: np.ndarray,
        y: np.ndarray,
        train_ratio: float = 0.7,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Split data into train/val/test sets.
        
        Args:
            X: Input sequences
            y: Target values
            train_ratio: Proportion for training
            val_ratio: Proportion for validation
            test_ratio: Proportion for testing
            
        Returns:
            Tuple of (X_train, X_val, X_test, y_train, y_val, y_test)
        """
        n_samples = len(X)
        
        train_end = int(n_samples * train_ratio)
        val_end = int(n_samples * (train_ratio + val_ratio))
        
        X_train = X[:train_end]
        X_val = X[train_end:val_end]
        X_test = X[val_end:]
        
        y_train = y[:train_end]
        y_val = y[train_end:val_end]
        y_test = y[val_end:]
        
        logger.info(f"Train: {len(X_train)} samples")
        logger.info(f"Val: {len(X_val)} samples")
        logger.info(f"Test: {len(X_test)} samples")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
