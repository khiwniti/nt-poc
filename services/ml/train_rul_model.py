"""
Train RUL LSTM model on synthetic battery degradation data.

This script:
1. Generates synthetic battery degradation curves
2. Creates LSTM sequences
3. Trains 2-layer LSTM model (64 units each)
4. Evaluates on test set (MAE <10 days, R² >0.85)
5. Saves model to .h5 format
"""

import sys
import os
import logging
from pathlib import Path

import numpy as np
import pandas as pd

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from models.rul_lstm import RULLSTMModel
from models.data_generator import BatteryDegradationGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def main():
    """Train RUL prediction model"""
    
    logger.info("=" * 70)
    logger.info("RUL LSTM Model Training Pipeline")
    logger.info("=" * 70)
    
    # Configuration
    SEQUENCE_LENGTH = 10
    N_FEATURES = 5  # SoC, SoH, temperature, voltage, cycle count
    LSTM_UNITS = 64
    N_BATTERIES = 500
    TOTAL_DAYS = 1095  # ~3 years
    EPOCHS = 100
    BATCH_SIZE = 32
    
    # Create output directories
    models_dir = Path('data/models')
    models_dir.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Generate synthetic data
    logger.info("\n[1/5] Generating synthetic battery degradation data...")
    generator = BatteryDegradationGenerator(seed=42)
    
    df = generator.generate_dataset(
        n_batteries=N_BATTERIES,
        total_days=TOTAL_DAYS,
        daily_readings=1
    )
    
    logger.info(f"  Dataset shape: {df.shape}")
    logger.info(f"  RUL range: {df['rul'].min():.1f} - {df['rul'].max():.1f} days")
    logger.info(f"  RUL mean: {df['rul'].mean():.1f} days")
    
    # Step 2: Create sequences
    logger.info("\n[2/5] Creating LSTM sequences...")
    X, y = generator.create_sequences(
        df=df,
        sequence_length=SEQUENCE_LENGTH,
        feature_cols=['soc', 'soh', 'temperature', 'voltage', 'cycles']
    )
    
    # Step 3: Split data
    logger.info("\n[3/5] Splitting data...")
    X_train, X_val, X_test, y_train, y_val, y_test = generator.split_data(
        X, y,
        train_ratio=0.7,
        val_ratio=0.15,
        test_ratio=0.15
    )
    
    # Step 4: Train model
    logger.info("\n[4/5] Training LSTM model...")
    model = RULLSTMModel(
        sequence_length=SEQUENCE_LENGTH,
        n_features=N_FEATURES,
        lstm_units=LSTM_UNITS,
        dropout_rate=0.2
    )
    
    history = model.train(
        X_train=X_train,
        y_train=y_train,
        X_val=X_val,
        y_val=y_val,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        patience=15,
        verbose=1
    )
    
    # Step 5: Evaluate model
    logger.info("\n[5/5] Evaluating model...")
    metrics = model.evaluate(X_test, y_test)
    
    logger.info("\n" + "=" * 70)
    logger.info("EVALUATION RESULTS")
    logger.info("=" * 70)
    logger.info(f"MAE:  {metrics['mae']:.2f} days  (target: <10 days)")
    logger.info(f"RMSE: {metrics['rmse']:.2f} days")
    logger.info(f"R²:   {metrics['r2']:.4f}  (target: >0.85)")
    logger.info("=" * 70)
    
    # Check acceptance criteria
    mae_pass = metrics['mae'] < 10
    r2_pass = metrics['r2'] > 0.85
    
    logger.info("\nACCEPTANCE CRITERIA:")
    logger.info(f"  ✓ MAE <10 days: {mae_pass} ({metrics['mae']:.2f})")
    logger.info(f"  ✓ R² >0.85: {r2_pass} ({metrics['r2']:.4f})")
    
    if mae_pass and r2_pass:
        logger.info("\n✓ ALL ACCEPTANCE CRITERIA MET!")
    else:
        logger.warning("\n✗ Some acceptance criteria not met. Consider retraining.")
    
    # Save model
    model_path = models_dir / 'rul_lstm_model.h5'
    model.save(str(model_path))
    
    # Save model metadata
    metadata = {
        'sequence_length': SEQUENCE_LENGTH,
        'n_features': N_FEATURES,
        'lstm_units': LSTM_UNITS,
        'n_batteries': N_BATTERIES,
        'total_days': TOTAL_DAYS,
        'feature_names': ['soc', 'soh', 'temperature', 'voltage', 'cycles'],
        'metrics': metrics,
        'acceptance_criteria_met': mae_pass and r2_pass
    }
    
    import json
    metadata_path = models_dir / 'rul_lstm_model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"\nModel saved to: {model_path}")
    logger.info(f"Metadata saved to: {metadata_path}")
    
    # Test prediction
    logger.info("\nTesting prediction on sample data...")
    sample_X = X_test[:5]
    sample_y_true = y_test[:5]
    sample_y_pred = model.predict(sample_X)
    
    logger.info("\nSample Predictions:")
    for i in range(len(sample_y_true)):
        logger.info(f"  True: {sample_y_true[i]:.1f} days | Pred: {sample_y_pred[i]:.1f} days | Error: {abs(sample_y_true[i] - sample_y_pred[i]):.1f} days")
    
    logger.info("\n" + "=" * 70)
    logger.info("Training Complete!")
    logger.info("=" * 70)


if __name__ == "__main__":
    main()
