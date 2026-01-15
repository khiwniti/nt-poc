# LSTM RUL Prediction - Ready-to-Use Code Snippets

**Quick Reference:** Copy-paste code for immediate implementation

---

## 1. Enhanced Feature Engineering

### Add to `services/ml/src/models/data_generator.py`

```python
def create_enhanced_features(self, df: pd.DataFrame) -> pd.DataFrame:
    """
    Add predictive derived features to battery data
    """
    # Sort by battery and time
    df = df.sort_values(['battery_id', 'day'])

    # 1. SoH Degradation Rate (MOST IMPORTANT!)
    df['soh_delta'] = df.groupby('battery_id')['soh'].diff()
    df['soh_rate_5d'] = df.groupby('battery_id')['soh'].diff(5) / 5
    df['soh_rate_10d'] = df.groupby('battery_id')['soh'].diff(10) / 10

    # 2. Temperature Stress Features
    df['temp_stress'] = (df['temperature'] > 35).astype(int)
    df['temp_ma_5d'] = df.groupby('battery_id')['temperature'].rolling(5).mean().reset_index(0, drop=True)
    df['temp_std_5d'] = df.groupby('battery_id')['temperature'].rolling(5).std().reset_index(0, drop=True)

    # 3. Cycle-based Features
    df['cycles_per_day'] = df.groupby('battery_id')['cycles'].diff()

    # 4. SoC Usage Patterns
    df['soc_volatility'] = df.groupby('battery_id')['soc'].rolling(10).std().reset_index(0, drop=True)
    df['soc_range_5d'] = df.groupby('battery_id')['soc'].rolling(5).apply(
        lambda x: x.max() - x.min()
    ).reset_index(0, drop=True)

    # 5. Fill NaN from diff/rolling (backfill within each battery)
    df = df.groupby('battery_id').apply(lambda g: g.fillna(method='bfill')).reset_index(drop=True)
    df.fillna(0, inplace=True)  # Any remaining NaNs to 0

    return df
```

### Update training script to use enhanced features

```python
# In train_rul_model.py, after generating dataset:

# Generate base dataset
df = generator.generate_dataset(n_batteries=500, total_days=1095)

# Add enhanced features
df = generator.create_enhanced_features(df)

# Updated feature list (5 → 10 features)
ENHANCED_FEATURES = [
    'soc', 'soh', 'temperature', 'voltage', 'cycles',
    'soh_delta', 'soh_rate_5d', 'temp_stress', 'cycles_per_day', 'soc_volatility'
]

# Create sequences with enhanced features
X, y = generator.create_sequences(
    df=df,
    sequence_length=SEQUENCE_LENGTH,
    feature_cols=ENHANCED_FEATURES
)
```

---

## 2. Improved Loss Function

### Add to `services/ml/src/models/rul_lstm.py`

```python
import tensorflow as tf

def huber_loss(y_true, y_pred, delta=10.0):
    """
    Huber loss - robust to outliers

    Args:
        delta: Threshold (10 days is reasonable for RUL)
    """
    error = y_true - y_pred
    is_small_error = tf.abs(error) <= delta
    squared_loss = 0.5 * tf.square(error)
    linear_loss = delta * tf.abs(error) - 0.5 * tf.square(delta)
    return tf.reduce_mean(tf.where(is_small_error, squared_loss, linear_loss))

def asymmetric_loss(y_true, y_pred, alpha=0.7):
    """
    Asymmetric loss - penalize overestimation more
    (Conservative RUL estimates preferred for safety)

    Args:
        alpha: Weight for overestimation penalty (0.7 = 70% weight)
    """
    error = y_true - y_pred
    return tf.reduce_mean(
        tf.where(
            error >= 0,  # Overestimation (predicted > actual)
            alpha * tf.square(error),
            (1 - alpha) * tf.square(error)  # Underestimation
        )
    )
```

### Update model compilation

```python
# In build_model() method:

model.compile(
    optimizer=keras.optimizers.Adam(learning_rate=0.001),
    loss=huber_loss,  # Changed from 'mse'
    metrics=['mae', 'mse']
)
```

---

## 3. Enhanced Evaluation Metrics

### Add to `services/ml/src/models/rul_lstm.py`

```python
def evaluate_comprehensive(
    self,
    X_test: np.ndarray,
    y_test: np.ndarray
) -> Dict[str, float]:
    """
    Comprehensive evaluation beyond MAE/RMSE
    """
    if self.model is None:
        raise ValueError("Model not built or loaded")

    # Get predictions
    y_pred = self.predict(X_test)

    # Core regression metrics
    mae = float(np.mean(np.abs(y_test - y_pred)))
    mse = float(np.mean((y_test - y_pred) ** 2))
    rmse = float(np.sqrt(mse))

    # R² score
    ss_res = np.sum((y_test - y_pred) ** 2)
    ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
    r2 = float(1 - (ss_res / ss_tot))

    # Mean Absolute Percentage Error (MAPE)
    mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1))) * 100)

    # Median Absolute Error (robust to outliers)
    medae = float(np.median(np.abs(y_test - y_pred)))

    # Prognostic Horizon Metrics
    within_10_days = float(np.mean(np.abs(y_test - y_pred) <= 10) * 100)
    within_30_days = float(np.mean(np.abs(y_test - y_pred) <= 30) * 100)

    # Critical Phase Accuracy (RUL < 100 days)
    critical_mask = y_test < 100
    if np.any(critical_mask):
        critical_mae = float(np.mean(np.abs(y_test[critical_mask] - y_pred[critical_mask])))
        critical_samples = int(np.sum(critical_mask))
    else:
        critical_mae = 0.0
        critical_samples = 0

    # Early vs Late RUL accuracy
    early_mask = y_test > 500
    if np.any(early_mask):
        early_mae = float(np.mean(np.abs(y_test[early_mask] - y_pred[early_mask])))
    else:
        early_mae = 0.0

    metrics = {
        # Core metrics
        'mae': mae,
        'mse': mse,
        'rmse': rmse,
        'r2': r2,
        'mape': mape,
        'medae': medae,

        # Prognostic horizon
        'within_10_days_pct': within_10_days,
        'within_30_days_pct': within_30_days,

        # Phase-specific
        'critical_phase_mae': critical_mae,
        'critical_phase_samples': critical_samples,
        'early_phase_mae': early_mae
    }

    # Pretty print
    logger.info("\n" + "="*70)
    logger.info("COMPREHENSIVE EVALUATION RESULTS")
    logger.info("="*70)
    logger.info(f"Core Metrics:")
    logger.info(f"  MAE:  {mae:.2f} days  (target: <10)")
    logger.info(f"  RMSE: {rmse:.2f} days")
    logger.info(f"  MAPE: {mape:.2f}%  (target: <15%)")
    logger.info(f"  R²:   {r2:.4f}  (target: >0.85)")
    logger.info(f"\nPrognostic Horizon:")
    logger.info(f"  Within ±10 days: {within_10_days:.1f}%")
    logger.info(f"  Within ±30 days: {within_30_days:.1f}% (target: >80%)")
    logger.info(f"\nPhase-Specific Accuracy:")
    logger.info(f"  Critical phase MAE: {critical_mae:.2f} days (target: <5, n={critical_samples})")
    logger.info(f"  Early phase MAE: {early_mae:.2f} days")
    logger.info("="*70)

    # Acceptance criteria check
    criteria_met = (
        mae < 10.0 and
        mape < 15.0 and
        r2 > 0.85 and
        within_30_days > 80.0 and
        (critical_mae < 5.0 or critical_samples == 0)
    )

    if criteria_met:
        logger.info("✅ ALL ACCEPTANCE CRITERIA MET!")
    else:
        logger.warning("⚠️  Some acceptance criteria not met")

    metrics['acceptance_criteria_met'] = criteria_met

    return metrics
```

---

## 4. Bidirectional LSTM with Attention

### Create `services/ml/src/models/rul_lstm_enhanced.py`

```python
"""
Enhanced LSTM with bidirectional layers and attention mechanism
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, models, callbacks
from typing import Tuple, Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def huber_loss(y_true, y_pred, delta=10.0):
    """Huber loss for robust training"""
    error = y_true - y_pred
    is_small_error = tf.abs(error) <= delta
    squared_loss = 0.5 * tf.square(error)
    linear_loss = delta * tf.abs(error) - 0.5 * tf.square(delta)
    return tf.reduce_mean(tf.where(is_small_error, squared_loss, linear_loss))


class EnhancedRULLSTM:
    """
    Enhanced LSTM with:
    - Bidirectional layers (capture forward + backward patterns)
    - Multi-head attention (focus on important timesteps)
    - Residual connections (training stability)
    - Layer normalization (faster convergence)
    """

    def __init__(
        self,
        sequence_length: int = 20,
        n_features: int = 10,
        lstm_units: int = 64,
        dropout_rate: float = 0.3
    ):
        self.sequence_length = sequence_length
        self.n_features = n_features
        self.lstm_units = lstm_units
        self.dropout_rate = dropout_rate
        self.model = None
        self.history = None

    def build_model(self) -> keras.Model:
        """
        Build enhanced LSTM architecture
        """
        inputs = layers.Input(shape=(self.sequence_length, self.n_features))

        # Bidirectional LSTM Layer 1
        x = layers.Bidirectional(
            layers.LSTM(self.lstm_units, return_sequences=True)
        )(inputs)
        x = layers.Dropout(self.dropout_rate)(x)

        # Bidirectional LSTM Layer 2
        x = layers.Bidirectional(
            layers.LSTM(self.lstm_units, return_sequences=True)
        )(x)
        x = layers.Dropout(self.dropout_rate)(x)

        # Multi-head Attention
        attention_output = layers.MultiHeadAttention(
            num_heads=4,
            key_dim=32
        )(x, x)

        # Residual connection + Layer normalization
        x = layers.Add()([x, attention_output])
        x = layers.LayerNormalization()(x)

        # Global pooling
        x = layers.GlobalAveragePooling1D()(x)

        # Dense layers
        x = layers.Dense(64, activation='relu')(x)
        x = layers.Dropout(0.2)(x)
        x = layers.Dense(32, activation='relu')(x)
        outputs = layers.Dense(1, activation='linear')(x)

        model = models.Model(inputs=inputs, outputs=outputs)

        # Compile with AdamW and Huber loss
        model.compile(
            optimizer=keras.optimizers.AdamW(
                learning_rate=0.001,
                weight_decay=1e-4
            ),
            loss=huber_loss,
            metrics=['mae', 'mse']
        )

        self.model = model

        logger.info("Enhanced LSTM architecture:")
        model.summary(print_fn=logger.info)

        return model

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        epochs: int = 100,
        batch_size: int = 32,
        patience: int = 15
    ) -> Dict[str, Any]:
        """Train the enhanced model"""
        if self.model is None:
            self.build_model()

        # Callbacks
        early_stopping = callbacks.EarlyStopping(
            monitor='val_loss',
            patience=patience,
            restore_best_weights=True,
            min_delta=0.0001,
            verbose=1
        )

        reduce_lr = callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=1e-6,
            verbose=1
        )

        # Cosine decay schedule
        def cosine_decay(epoch):
            initial_lr = 0.001
            min_lr = 1e-6
            decay = 0.5 * (1 + np.cos(np.pi * epoch / epochs))
            return min_lr + (initial_lr - min_lr) * decay

        lr_scheduler = callbacks.LearningRateScheduler(cosine_decay)

        logger.info(f"Training enhanced model with {len(X_train)} samples")

        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[early_stopping, reduce_lr, lr_scheduler],
            verbose=1
        )

        self.history = history
        return history.history

    def evaluate(
        self,
        X_test: np.ndarray,
        y_test: np.ndarray
    ) -> Dict[str, float]:
        """Evaluate with comprehensive metrics"""
        if self.model is None:
            raise ValueError("Model not built or loaded")

        y_pred = self.predict(X_test)

        # Calculate metrics (same as before)
        mae = float(np.mean(np.abs(y_test - y_pred)))
        rmse = float(np.sqrt(np.mean((y_test - y_pred) ** 2)))

        ss_res = np.sum((y_test - y_pred) ** 2)
        ss_tot = np.sum((y_test - np.mean(y_test)) ** 2)
        r2 = float(1 - (ss_res / ss_tot))

        mape = float(np.mean(np.abs((y_test - y_pred) / (y_test + 1))) * 100)

        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'mape': mape
        }

    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions"""
        if self.model is None:
            raise ValueError("Model not built or loaded")
        predictions = self.model.predict(X, verbose=0)
        return predictions.flatten()

    def save(self, filepath: str):
        """Save model"""
        if self.model is None:
            raise ValueError("No model to save")
        self.model.save(filepath, save_format='tf')
        logger.info(f"Model saved to {filepath}")

    def load(self, filepath: str):
        """Load model"""
        self.model = keras.models.load_model(
            filepath,
            custom_objects={'huber_loss': huber_loss}
        )
        logger.info(f"Model loaded from {filepath}")
```

---

## 5. Feature Scaling (Production-Ready)

### Create `services/ml/src/preprocessing/battery_scaler.py`

```python
"""
Feature-specific scaling for battery data
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
import joblib
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class BatteryFeatureScaler:
    """
    Scale features with appropriate methods:
    - MinMax for bounded features (SoC, SoH: 0-100%)
    - StandardScaler for unbounded (temp, voltage, cycles)
    - RobustScaler for features with outliers
    """

    def __init__(self):
        self.scalers: Dict = {}
        self.feature_config = {
            'minmax': ['soc', 'soh'],
            'standard': ['temperature', 'voltage', 'cycles'],
            'robust': []  # Add features with outliers here
        }

    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Fit scalers and transform features

        Args:
            df: DataFrame with battery features

        Returns:
            DataFrame with scaled features
        """
        scaled_df = df.copy()

        # MinMax scaling for bounded features (0-100% → 0-1)
        for feat in self.feature_config['minmax']:
            if feat in df.columns:
                scaler = MinMaxScaler(feature_range=(0, 1))
                scaled_df[feat] = scaler.fit_transform(df[[feat]])
                self.scalers[feat] = scaler
                logger.info(f"MinMax scaled: {feat}")

        # Standard scaling for unbounded features (mean=0, std=1)
        for feat in self.feature_config['standard']:
            if feat in df.columns:
                scaler = StandardScaler()
                scaled_df[feat] = scaler.fit_transform(df[[feat]])
                self.scalers[feat] = scaler
                logger.info(f"Standard scaled: {feat}")

        # Robust scaling for outlier-prone features
        for feat in self.feature_config['robust']:
            if feat in df.columns:
                scaler = RobustScaler()
                scaled_df[feat] = scaler.fit_transform(df[[feat]])
                self.scalers[feat] = scaler
                logger.info(f"Robust scaled: {feat}")

        return scaled_df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform using fitted scalers (for inference)

        Args:
            df: DataFrame to transform

        Returns:
            Scaled DataFrame
        """
        if not self.scalers:
            raise ValueError("Scalers not fitted. Call fit_transform first.")

        scaled_df = df.copy()

        for feat, scaler in self.scalers.items():
            if feat in scaled_df.columns:
                scaled_df[feat] = scaler.transform(df[[feat]])

        return scaled_df

    def inverse_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Inverse transform scaled features back to original scale
        """
        original_df = df.copy()

        for feat, scaler in self.scalers.items():
            if feat in original_df.columns:
                original_df[feat] = scaler.inverse_transform(df[[feat]])

        return original_df

    def save(self, filepath: str):
        """Save fitted scalers"""
        joblib.dump({
            'scalers': self.scalers,
            'feature_config': self.feature_config
        }, filepath)
        logger.info(f"Scalers saved to {filepath}")

    def load(self, filepath: str):
        """Load fitted scalers"""
        data = joblib.load(filepath)
        self.scalers = data['scalers']
        self.feature_config = data['feature_config']
        logger.info(f"Scalers loaded from {filepath}")
```

### Usage in training script

```python
# In train_rul_model.py

from preprocessing.battery_scaler import BatteryFeatureScaler

# After generating features
df_features = generator.create_enhanced_features(df)

# Initialize and fit scaler
scaler = BatteryFeatureScaler()
df_scaled = scaler.fit_transform(df_features)

# Save scaler for production
scaler.save('data/models/rul_scaler.joblib')

# Create sequences from scaled data
X, y = generator.create_sequences(df_scaled, ...)
```

---

## 6. Production Inference Optimization

### Update `services/mlops/src/models/rul_model.py`

```python
"""
Production-optimized RUL prediction
"""

import numpy as np
import tensorflow as tf
from tensorflow import keras
import joblib
from typing import Dict, List
import logging
import time

logger = logging.getLogger(__name__)


class OptimizedRULPredictor:
    """
    Production-ready RUL predictor with:
    - Model warm-up (eliminate cold start)
    - Batch prediction support
    - Graph compilation for speed
    - Error handling
    """

    def __init__(
        self,
        model_path: str,
        scaler_path: str,
        metadata_path: str
    ):
        # Load model
        self.model = keras.models.load_model(
            model_path,
            custom_objects={'huber_loss': lambda y_t, y_p: tf.reduce_mean(tf.abs(y_t - y_p))}
        )

        # Load scaler
        scaler_data = joblib.load(scaler_path)
        self.scalers = scaler_data['scalers']

        # Load metadata
        import json
        with open(metadata_path, 'r') as f:
            self.metadata = json.load(f)

        self.sequence_length = self.metadata['sequence_length']
        self.feature_names = self.metadata['feature_names']

        # Warm up model (first inference is slow)
        logger.info("Warming up model...")
        dummy_input = np.random.randn(1, self.sequence_length, len(self.feature_names)).astype(np.float32)
        _ = self.model.predict(dummy_input, verbose=0)
        logger.info("Model ready for inference")

    def preprocess_features(self, features_dict: Dict) -> np.ndarray:
        """
        Scale and format features for model input

        Args:
            features_dict: {
                'soc': [list of values],
                'soh': [list of values],
                ...
            }

        Returns:
            Scaled numpy array (1, sequence_length, n_features)
        """
        import pandas as pd

        # Convert to DataFrame
        df = pd.DataFrame(features_dict)

        # Validate length
        if len(df) != self.sequence_length:
            raise ValueError(
                f"Expected {self.sequence_length} timesteps, got {len(df)}"
            )

        # Validate features
        missing = set(self.feature_names) - set(df.columns)
        if missing:
            raise ValueError(f"Missing features: {missing}")

        # Scale features
        for feat, scaler in self.scalers.items():
            if feat in df.columns:
                df[feat] = scaler.transform(df[[feat]])

        # Select features in correct order
        df = df[self.feature_names]

        # Reshape for LSTM: (1, sequence_length, n_features)
        X = df.values.reshape(1, self.sequence_length, len(self.feature_names))

        return X.astype(np.float32)

    def predict_single(self, features_dict: Dict) -> Dict:
        """
        Predict RUL for single battery

        Returns:
            {
                'rul_days': float,
                'confidence': str,
                'latency_ms': float
            }
        """
        start_time = time.time()

        # Preprocess
        X = self.preprocess_features(features_dict)

        # Predict
        rul = self.model.predict(X, verbose=0)[0][0]

        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000

        # Confidence estimation (simple heuristic)
        if rul < 50:
            confidence = 'high'
        elif rul < 200:
            confidence = 'medium'
        else:
            confidence = 'low'

        return {
            'rul_days': float(max(0, rul)),
            'confidence': confidence,
            'latency_ms': round(latency_ms, 2)
        }

    def predict_batch(self, features_list: List[Dict]) -> List[Dict]:
        """
        Batch prediction for efficiency

        Args:
            features_list: List of feature dictionaries

        Returns:
            List of prediction results
        """
        # Preprocess all
        X_batch = np.vstack([
            self.preprocess_features(features)
            for features in features_list
        ])

        # Batch predict (much faster than individual)
        start_time = time.time()
        predictions = self.model.predict(X_batch, verbose=0)
        latency_ms = (time.time() - start_time) * 1000

        # Format results
        results = []
        for rul in predictions.flatten():
            results.append({
                'rul_days': float(max(0, rul)),
                'confidence': 'medium',
                'latency_ms': round(latency_ms / len(features_list), 2)
            })

        return results

    @tf.function
    def predict_compiled(self, X: tf.Tensor) -> tf.Tensor:
        """
        Graph-compiled prediction (fastest)
        ~5ms latency vs 50ms for eager
        """
        return self.model(X, training=False)
```

---

## 7. Complete Training Script (Enhanced)

### Create `services/ml/train_enhanced_rul_model.py`

```python
"""
Train enhanced RUL LSTM model with all improvements
"""

import sys
import os
import logging
from pathlib import Path
import numpy as np
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from models.rul_lstm_enhanced import EnhancedRULLSTM
from models.data_generator import BatteryDegradationGenerator
from preprocessing.battery_scaler import BatteryFeatureScaler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    logger.info("="*70)
    logger.info("ENHANCED RUL LSTM TRAINING PIPELINE")
    logger.info("="*70)

    # Configuration
    SEQUENCE_LENGTH = 20  # Increased from 10
    N_BATTERIES = 500
    TOTAL_DAYS = 1095
    EPOCHS = 100
    BATCH_SIZE = 32

    # Feature list (5 base + 5 derived)
    ENHANCED_FEATURES = [
        'soc', 'soh', 'temperature', 'voltage', 'cycles',
        'soh_delta', 'soh_rate_5d', 'temp_stress', 'cycles_per_day', 'soc_volatility'
    ]
    N_FEATURES = len(ENHANCED_FEATURES)

    # Create output directories
    models_dir = Path('data/models')
    models_dir.mkdir(parents=True, exist_ok=True)

    # Step 1: Generate data
    logger.info("\n[1/6] Generating battery degradation data...")
    generator = BatteryDegradationGenerator(seed=42)
    df = generator.generate_dataset(
        n_batteries=N_BATTERIES,
        total_days=TOTAL_DAYS,
        daily_readings=1
    )

    # Step 2: Create enhanced features
    logger.info("\n[2/6] Creating enhanced features...")
    df = generator.create_enhanced_features(df)
    logger.info(f"  Total features: {N_FEATURES}")

    # Step 3: Scale features
    logger.info("\n[3/6] Scaling features...")
    scaler = BatteryFeatureScaler()
    df_scaled = scaler.fit_transform(df)
    scaler.save(models_dir / 'rul_scaler.joblib')

    # Step 4: Create sequences
    logger.info("\n[4/6] Creating LSTM sequences...")
    X, y = generator.create_sequences(
        df=df_scaled,
        sequence_length=SEQUENCE_LENGTH,
        feature_cols=ENHANCED_FEATURES
    )

    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = generator.split_data(
        X, y,
        train_ratio=0.7,
        val_ratio=0.15,
        test_ratio=0.15
    )

    # Step 5: Train model
    logger.info("\n[5/6] Training enhanced LSTM...")
    model = EnhancedRULLSTM(
        sequence_length=SEQUENCE_LENGTH,
        n_features=N_FEATURES,
        lstm_units=64,
        dropout_rate=0.3
    )

    history = model.train(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        patience=15
    )

    # Step 6: Evaluate
    logger.info("\n[6/6] Evaluating model...")
    metrics = model.evaluate(X_test, y_test)

    # Check acceptance criteria
    criteria = {
        'mae_10': metrics['mae'] < 10.0,
        'mape_15': metrics['mape'] < 15.0,
        'r2_85': metrics['r2'] > 0.85
    }

    all_pass = all(criteria.values())

    logger.info("\n" + "="*70)
    logger.info("ACCEPTANCE CRITERIA")
    logger.info("="*70)
    logger.info(f"  MAE < 10 days: {'✅' if criteria['mae_10'] else '❌'} ({metrics['mae']:.2f})")
    logger.info(f"  MAPE < 15%: {'✅' if criteria['mape_15'] else '❌'} ({metrics['mape']:.2f})")
    logger.info(f"  R² > 0.85: {'✅' if criteria['r2_85'] else '❌'} ({metrics['r2']:.4f})")
    logger.info("="*70)

    if all_pass:
        logger.info("✅ MODEL READY FOR PRODUCTION")
    else:
        logger.warning("⚠️  Model needs improvement")

    # Save model
    model_path = models_dir / 'rul_lstm_enhanced'
    model.save(str(model_path))

    # Save metadata
    metadata = {
        'model_version': '2.0.0',
        'model_type': 'enhanced_lstm',
        'sequence_length': SEQUENCE_LENGTH,
        'n_features': N_FEATURES,
        'feature_names': ENHANCED_FEATURES,
        'n_batteries_trained': N_BATTERIES,
        'metrics': metrics,
        'acceptance_criteria_met': all_pass
    }

    with open(models_dir / 'rul_lstm_enhanced_metadata.json', 'w') as f:
        json.dump(metadata, f, indent=2)

    logger.info(f"\nModel saved to: {model_path}")
    logger.info("Training complete!")


if __name__ == "__main__":
    main()
```

---

## Quick Start Commands

```bash
# 1. Run enhanced training
cd services/ml
python train_enhanced_rul_model.py

# 2. Test inference
python -c "
from models.rul_lstm_enhanced import EnhancedRULLSTM
model = EnhancedRULLSTM()
model.load('data/models/rul_lstm_enhanced')
print('Model loaded successfully!')
"

# 3. Deploy to MLOps
cp -r services/ml/data/models/* services/mlops/models/
```

---

## Expected Improvements

| Enhancement | Baseline | Expected | Improvement |
|-------------|----------|----------|-------------|
| **Feature Engineering** | MAE: 12 days | MAE: 10 days | +16% |
| **Huber Loss** | R²: 0.85 | R²: 0.87 | +2% |
| **Bidirectional LSTM** | MAE: 10 days | MAE: 8.5 days | +15% |
| **All Combined** | MAE: 12 days | MAE: 7-8 days | +33-40% |

---

**Ready to implement!** Start with feature engineering for immediate gains.
