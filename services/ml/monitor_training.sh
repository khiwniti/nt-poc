#!/bin/bash
# Monitor LSTM RUL model training progress

echo "=== LSTM RUL Training Monitor ==="
echo ""

# Check if training process is running
TRAIN_PID=$(ps aux | grep "train_rul_model.py" | grep -v grep | awk '{print $2}')

if [ -z "$TRAIN_PID" ]; then
    echo "Status: Training process NOT running"
    echo ""

    # Check if training completed successfully
    if grep -q "TRAINING COMPLETE" training.log 2>/dev/null; then
        echo "✅ Training completed successfully!"
        echo ""

        # Show final metrics
        echo "=== Final Test Metrics ==="
        grep -A 8 "Final Test Metrics:" training.log | tail -8
        echo ""

        # Check if model file exists
        if [ -f "models/rul_lstm_model.h5" ]; then
            MODEL_SIZE=$(ls -lh models/rul_lstm_model.h5 | awk '{print $5}')
            echo "Model saved: models/rul_lstm_model.h5 ($MODEL_SIZE)"
        else
            echo "⚠️  Model file not found!"
        fi
    else
        echo "❌ Training stopped without completion"
        echo ""
        echo "Last 20 lines of log:"
        tail -20 training.log
    fi
else
    echo "Status: Training process RUNNING (PID: $TRAIN_PID)"
    echo ""

    # Get current epoch
    CURRENT_EPOCH=$(tail -500 training.log 2>/dev/null | grep "^Epoch" | tail -1)
    echo "Current progress: $CURRENT_EPOCH"
    echo ""

    # Show recent validation metrics
    echo "=== Recent Validation Metrics ==="
    tail -500 training.log 2>/dev/null | grep "val_loss:" | tail -3
    echo ""

    # Show learning rate reductions
    LR_REDUCTIONS=$(grep -c "ReduceLROnPlateau reducing learning rate" training.log 2>/dev/null)
    echo "Learning rate reductions: $LR_REDUCTIONS"
    echo ""

    # Estimate progress
    LOG_SIZE=$(ls -lh training.log 2>/dev/null | awk '{print $5}')
    echo "Training log size: $LOG_SIZE"
    echo ""

    # Show estimated time remaining (rough estimate)
    ELAPSED_EPOCHS=$(grep -c "^Epoch" training.log 2>/dev/null)
    if [ "$ELAPSED_EPOCHS" -gt 0 ]; then
        echo "Epochs completed: $ELAPSED_EPOCHS/100"
        PERCENT=$((ELAPSED_EPOCHS * 100 / 100))
        echo "Progress: ${PERCENT}%"
    fi
fi

echo ""
echo "=== Commands ==="
echo "Watch live: tail -f training.log"
echo "Check process: ps aux | grep train_rul_model"
echo "Stop training: kill $TRAIN_PID"
