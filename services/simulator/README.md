# Battery Simulator Service

Generates synthetic battery sensor data for ML training and testing.

## Purpose
Simulates realistic battery behavior patterns including:
- Voltage variations
- Current draw patterns
- Temperature fluctuations
- State of Charge (SoC) degradation
- State of Health (SoH) trends

## Installation
```bash
pip install -r requirements.txt
```

## Usage
```python
from src.generator import BatterySimulator
from datetime import datetime

sim = BatterySimulator(seed=42)
data = sim.generate_timeseries(
    start_time=datetime.now(),
    duration_hours=24,
    interval_minutes=15,
    battery_id="BAT001"
)

print(data.head())
```

## Testing
```bash
pytest tests/ -v
```

## Integration
Generated data can be used with ML and MLOps services for:
- Training anomaly detection models
- Testing prediction endpoints
- Validating data pipelines
