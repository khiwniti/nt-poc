"""
LSTM RUL Model Training Script with Enhanced Features

This script trains an LSTM model for battery RUL prediction using:
- Enhanced feature engineering (9 derived features)
- Huber loss for robustness
- Comprehensive evaluation metrics

Expected performance:
- MAE: 7-8 days (vs 12 days baseline)
- R²: 0.90-0.92 (vs 0.85 baseline)
- Training time: 2-3 hours on 500 batteries × 1095 days

Usage:
    python src/training/train_rul_model.py
"""

import logging
import sys
from pathlib import Path
import numpy as np

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.models.data_generator import BatteryDegradationGenerator
from src.models.rul_lstm import RULLSTMModel

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Enhanced feature list (base + derived)
ENHANCED_FEATURES = [
    # Base features (5)
    'soc', 'soh', 'temperature', 'voltage', 'cycles',
    # Derived features (5 most important)
    'soh_delta', 'soh_rate_5d', 'temp_stress', 'cycles_per_day', 'soc_volatility'
]

# Training configuration
CONFIG = {
    'n_batteries': 500,
    'total_days': 1095,  # ~3 years
    'daily_readings': 1,
    'sequence_length': 10,
    'n_features': len(ENHANCED_FEATURES),
    'lstm_units': 64,
    'dropout_rate': 0.2,
    'epochs': 100,
    'batch_size': 32,
    'patience': 15,
    'model_save_path': 'models/rul_lstm_model.h5'
}


def main():
    """Main training pipeline"""

    logger.info("=" * 60)
    logger.info("LSTM RUL Model Training - Enhanced Features")
    logger.info("=" * 60)
    logger.info(f"Configuration: {CONFIG}")

    # Step 1: Generate synthetic battery data
    logger.info("\n[1/6] Generating synthetic battery dataset...")
    generator = BatteryDegradationGenerator(seed=42)
    df = generator.generate_dataset(
        n_batteries=CONFIG['n_batteries'],
        total_days=CONFIG['total_days'],
        daily_readings=CONFIG['daily_readings']
    )
    logger.info(f"Generated {len(df)} data points")

    # Step 2: Create enhanced features
    logger.info("\n[2/6] Creating enhanced features...")
    df = generator.create_enhanced_features(df)
    logger.info(f"Enhanced features added: {ENHANCED_FEATURES}")
    logger.info(f"Dataset shape: {df.shape}")

    # Step 3: Create sequences for LSTM
    logger.info("\n[3/6] Creating LSTM sequences...")
    X, y = generator.create_sequences(
        df,
        sequence_length=CONFIG['sequence_length'],
        feature_cols=ENHANCED_FEATURES
    )
    logger.info(f"Sequence shape: X={X.shape}, y={y.shape}")

    # Step 4: Split into train/val/test sets
    logger.info("\n[4/6] Splitting data...")
    X_train, X_val, X_test, y_train, y_val, y_test = generator.split_data(
        X, y,
        train_ratio=0.7,
        val_ratio=0.15,
        test_ratio=0.15
    )

    # Step 5: Build and train model
    logger.info("\n[5/6] Building and training LSTM model...")
    model = RULLSTMModel(
        sequence_length=CONFIG['sequence_length'],
        n_features=CONFIG['n_features'],
        lstm_units=CONFIG['lstm_units'],
        dropout_rate=CONFIG['dropout_rate']
    )

    model.build_model()

    logger.info("Starting training...")
    history = model.train(
        X_train, y_train,
        X_val, y_val,
        epochs=CONFIG['epochs'],
        batch_size=CONFIG['batch_size'],
        patience=CONFIG['patience'],
        verbose=1
    )

    # Step 6: Evaluate on test set
    logger.info("\n[6/6] Evaluating model on test set...")
    metrics = model.evaluate(X_test, y_test)

    # Save model
    model_path = CONFIG['model_save_path']
    Path(model_path).parent.mkdir(parents=True, exist_ok=True)
    model.save(model_path)

    # Print final summary
    logger.info("\n" + "=" * 60)
    logger.info("TRAINING COMPLETE!")
    logger.info("=" * 60)
    logger.info(f"Model saved to: {model_path}")
    logger.info("\nFinal Test Metrics:")
    logger.info(f"  MAE: {metrics['mae']:.2f} days")
    logger.info(f"  RMSE: {metrics['rmse']:.2f} days")
    logger.info(f"  MAPE: {metrics['mape']:.2f}%")
    logger.info(f"  R² Score: {metrics['r2']:.4f}")
    logger.info(f"  Within 10 days: {metrics['within_10_days_pct']:.1f}%")
    logger.info(f"  Within 30 days: {metrics['within_30_days_pct']:.1f}%")
    logger.info(f"  Critical phase MAE: {metrics['critical_phase_mae']:.2f} days")
    logger.info("\nNext Steps:")
    logger.info("1. Deploy model: docker cp models/rul_lstm_model.h5 mlops-service:/app/models/")
    logger.info("2. Restart service: docker restart mlops-service")
    logger.info("3. Test prediction: curl -X POST http://localhost:8000/ml/predict-rul ...")
    logger.info("=" * 60)

    return metrics


if __name__ == '__main__':
    try:
        metrics = main()
        sys.exit(0)
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        sys.exit(1)
