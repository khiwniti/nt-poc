# Battery Simulator Service

A Python 3.11 + FastAPI service that generates realistic battery sensor data for testing, with **zero-code-change replaceability** for real hardware sensors.

## Key Features

- **Pluggable Backend**: Switch between simulator and hardware via configuration only
- **Realistic Simulation**: Physics-based battery behavior (voltage-SoC correlation, thermal dynamics)
- **Temporal Drift**: SoC decreases, SoH degrades over time
- **Deterministic Testing**: Seed-based reproducibility
- **RESTful API**: Health checks, sensor readings, batch operations
- **Production Ready**: Docker support, health monitoring, comprehensive tests

## Replaceability Design

**CRITICAL**: This service is designed so real hardware sensors can replace the simulator with ZERO code changes - only configuration.

### How It Works

1. **Abstract Interface** (`app/interfaces/sensor_interface.py`): Defines contract all backends must implement
2. **Pluggable Implementations**: `SimulatorSensor` and `HardwareSensor` both implement `SensorInterface`
3. **Factory Pattern** (`app/main.py`): Creates appropriate backend based on `SENSOR_BACKEND` config
4. **Configuration-Driven**: Single environment variable controls which implementation loads

### Switching Between Simulator and Hardware

```bash
# Use simulator (default)
SENSOR_BACKEND=simulator

# Use hardware
SENSOR_BACKEND=hardware
HARDWARE_CONNECTION_STRING=tcp://192.168.1.100:5000
```

**That's it!** Restart the service - no code changes required.

## Quick Start

### Local Development

```bash
# 1. Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env if needed (default uses simulator)

# 4. Start development server
uvicorn app.main:app --reload --port 8001

# 5. Test health endpoint
curl http://localhost:8001/api/health

# 6. Get sensor reading
curl http://localhost:8001/api/sensors/reading/test-battery-001
```

### Docker

```bash
# Build
docker build -t simulator .

# Run
docker run -p 8001:8001 simulator

# Health check
curl http://localhost:8001/api/health
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f simulator
```

## API Endpoints

### Health Check

```bash
GET /api/health
```

Returns service and sensor backend health status.

### Get Sensor Reading

```bash
GET /api/sensors/reading/{battery_system_id}
```

Returns current sensor data for a battery system:
- `voltage`: Battery voltage (V)
- `current`: Current flow (A, negative=discharge)
- `temperature`: Temperature (°C)
- `soc`: State of Charge (0-100%)
- `soh`: State of Health (0-100%)
- `power`: Power (W, calculated as V×I)

### Batch Readings

```bash
POST /api/sensors/readings/batch
Content-Type: application/json

{
  "battery_system_ids": ["BAT-001", "BAT-002", "BAT-003"]
}
```

Get readings for multiple batteries in one request.

### Get Metrics

```bash
GET /api/sensors/metrics/{battery_system_id}
```

Get aggregated metrics including statistics and health indicators.

### Sensor Status

```bash
GET /api/sensors/status
```

Get sensor backend type, configuration, and health.

## Configuration

All configuration via environment variables (see `.env.example`).

### Critical Settings

| Variable | Values | Description |
|----------|--------|-------------|
| `SENSOR_BACKEND` | `simulator`, `hardware` | **Controls which backend loads** |
| `SIMULATOR_SEED` | Integer or empty | Seed for deterministic behavior |
| `SIMULATOR_NOISE_LEVEL` | 0.0-1.0 | Noise level for readings |
| `SIMULATOR_DRIFT_ENABLED` | `true`, `false` | Enable temporal drift |
| `HARDWARE_CONNECTION_STRING` | Connection string | Hardware connection details |

### Simulator Configuration

When `SENSOR_BACKEND=simulator`:

```bash
SIMULATOR_SEED=42                    # Deterministic (empty = random)
SIMULATOR_NOISE_LEVEL=0.02           # 2% noise
SIMULATOR_DRIFT_ENABLED=true         # SoC decreases over time
SIMULATOR_SOC_DECAY_RATE=0.1         # 0.1% per minute
SIMULATOR_SOH_DECAY_RATE=0.0001      # 0.01% per cycle
```

### Hardware Configuration

When `SENSOR_BACKEND=hardware`:

```bash
HARDWARE_CONNECTION_STRING=tcp://192.168.1.100:5000
HARDWARE_TIMEOUT_MS=3000
HARDWARE_RETRY_ATTEMPTS=3
```

## Testing

```bash
# Run all tests with coverage
pytest tests/ -v --cov=app

# Run only unit tests
pytest tests/test_simulator.py -v

# Run only integration tests
pytest tests/test_api.py -v

# Generate HTML coverage report
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

Expected: >80% coverage

## Project Structure

```
services/simulator/
├── app/
│   ├── main.py                      # FastAPI app + factory pattern
│   ├── config.py                    # Configuration management
│   ├── interfaces/
│   │   └── sensor_interface.py     # Abstract interface
│   ├── implementations/
│   │   ├── simulator.py            # Simulator backend
│   │   └── hardware.py             # Hardware stub
│   ├── models/
│   │   ├── sensor_data.py          # Data models
│   │   └── responses.py            # API responses
│   └── api/
│       ├── health.py                # Health check
│       └── sensors.py               # Sensor endpoints
├── tests/
│   ├── conftest.py                  # Test fixtures
│   ├── test_simulator.py            # Unit tests
│   └── test_api.py                  # Integration tests
├── requirements.txt
├── Dockerfile
├── pytest.ini
└── README.md
```

## Simulator Behavior

### Realistic Features

1. **Voltage-SoC Correlation**: Voltage follows Li-ion discharge curve (3.0-4.2V)
2. **Thermal Dynamics**: Temperature increases with current flow (I²R heating)
3. **Temporal Drift**: SoC decreases over time, SoH degrades with cycles
4. **Configurable Noise**: Gaussian noise for robustness testing
5. **State Tracking**: Per-battery state for realistic behavior

### Example Reading

```json
{
  "battery_system_id": "BAT-001",
  "voltage": 3.72,
  "current": -10.5,
  "temperature": 25.3,
  "soc": 75.2,
  "soh": 95.8,
  "power": -39.06,
  "timestamp": "2024-01-10T12:00:00Z",
  "metadata": {"cycle_count": 145}
}
```

## Adding Real Hardware

To integrate real sensors:

1. **Implement `SensorInterface`** in `app/implementations/hardware.py`:
   ```python
   async def get_reading(self, battery_system_id: str) -> Dict[str, Any]:
       # Replace NotImplementedError with actual hardware communication
       # Example: Read from serial, Modbus, HTTP API, etc.
       data = await read_from_hardware(battery_system_id)
       return {
           "battery_system_id": battery_system_id,
           "voltage": data.voltage,
           "current": data.current,
           ...
       }
   ```

2. **Configure connection**:
   ```bash
   SENSOR_BACKEND=hardware
   HARDWARE_CONNECTION_STRING=your_connection_string
   ```

3. **Restart service** - that's it!

## Deployment

### Railway

Configured in `railway.toml`:

```toml
[[services]]
name = "simulator"
buildCommand = "pip install -r requirements.txt"
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/health"
```

### Environment Variables

Set in Railway dashboard or `.env`:
- `SENSOR_BACKEND`
- Hardware/simulator specific settings

## Development

### Code Style

```bash
# Format code
black app/ tests/

# Lint
flake8 app/ tests/

# Type check
mypy app/
```

### Adding Features

1. Follow interface-based design
2. Update both simulator and hardware implementations
3. Add tests
4. Update README

## Troubleshooting

### Service Won't Start

- Check `SENSOR_BACKEND` is valid (`simulator` or `hardware`)
- If `hardware`: Ensure `HARDWARE_CONNECTION_STRING` is set
- Check logs: `docker-compose logs -f simulator`

### Tests Failing

- Ensure test environment: `ENVIRONMENT=test SENSOR_BACKEND=simulator`
- Check Python version: `python --version` (should be 3.11+)
- Reinstall dependencies: `pip install -r requirements.txt`

### Health Check Failing

- Verify service is running: `curl http://localhost:8001/api/health`
- Check sensor backend initialized: Look for "Simulator ready" in logs
- Review configuration: `GET /api/sensors/status`

## License

[Your License]

## Contact

[Your Contact Info]
