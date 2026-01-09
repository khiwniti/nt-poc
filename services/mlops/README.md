# MLOps Service

Machine Learning Operations and Inference Service built with FastAPI, TensorFlow, and scikit-learn.

## Features

- ✅ Python 3.11 environment
- ✅ FastAPI web framework
- ✅ TensorFlow 2.15 for deep learning
- ✅ scikit-learn 1.4 for traditional ML
- ✅ pandas 2.2 for data manipulation
- ✅ Docker support with optional GPU acceleration
- ✅ Health check endpoint
- ✅ Service runs on port 8001

## Installation

### Local Development

1. **Create virtual environment**:
```bash
cd services/mlops
python3.11 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Run the service**:
```bash
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

### Docker Deployment

#### CPU-only (default)
```bash
cd services/mlops
docker build -t mlops-service:latest .
docker run -p 8001:8001 mlops-service:latest
```

#### GPU-enabled
```bash
cd services/mlops
docker build --build-arg USE_GPU=true -t mlops-service:gpu .
docker run --gpus all -p 8001:8001 mlops-service:gpu
```

## API Endpoints

### Health Check
```bash
GET /health
```

Returns service health status and system information.

**Response:**
```json
{
  "status": "healthy",
  "service": "mlops",
  "timestamp": "2024-01-09T20:00:00.000000",
  "version": "1.0.0",
  "python_version": "3.11.0",
  "platform": "Linux-5.15.0-x86_64"
}
```

### Root
```bash
GET /
```

Returns basic service information.

## Project Structure

```
services/mlops/
├── src/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py        # API endpoints
│   ├── models/
│   │   └── __init__.py      # Model management
│   └── utils/
│       └── __init__.py      # Utility functions
├── tests/                   # Test suite
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker configuration
└── README.md              # This file
```

## Dependencies

### Core ML Stack
- **TensorFlow 2.15.0**: Deep learning framework
- **scikit-learn 1.4.0**: Machine learning algorithms
- **pandas 2.2.0**: Data manipulation and analysis
- **numpy 1.26.3**: Numerical computing

### Web Framework
- **FastAPI 0.109.0**: Modern web framework
- **uvicorn 0.27.0**: ASGI server
- **pydantic 2.5.3**: Data validation

### Development Tools
- **pytest 7.4.3**: Testing framework
- **black 23.12.1**: Code formatting
- **flake8 7.0.0**: Linting
- **mypy 1.8.0**: Type checking

## Configuration

Configuration can be set via environment variables or `.env` file:

```env
# Application
APP_NAME=MLOps Service
ENVIRONMENT=development
PORT=8001

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Model paths
MODELS_DIR=models

# Logging
LOG_LEVEL=INFO
```

## Testing

Run tests with pytest:

```bash
cd services/mlops
pytest tests/ -v --cov=src
```

## Development

### Code Formatting
```bash
black src/
```

### Linting
```bash
flake8 src/
```

### Type Checking
```bash
mypy src/
```

## Production Deployment

### Using Docker Compose

```yaml
services:
  mlops:
    build:
      context: ./services/mlops
      args:
        USE_GPU: "false"  # Set to "true" for GPU support
    ports:
      - "8001:8001"
    environment:
      - ENVIRONMENT=production
      - LOG_LEVEL=INFO
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
```

### Environment Variables

For production, set the following environment variables:

- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `MODELS_DIR=/app/models`
- `CORS_ORIGINS=["https://yourdomain.com"]`

## GPU Support

The Dockerfile supports optional GPU acceleration:

1. **Build with GPU support**:
```bash
docker build --build-arg USE_GPU=true -t mlops-service:gpu .
```

2. **Run with GPU**:
```bash
docker run --gpus all -p 8001:8001 mlops-service:gpu
```

**Requirements:**
- NVIDIA GPU
- NVIDIA Docker runtime installed
- CUDA-compatible drivers

## Monitoring

The service includes health check endpoints for monitoring:

- **Kubernetes/Docker**: Use `/health` endpoint
- **Response time**: Typical response < 100ms
- **Status codes**: 200 (healthy), 503 (unhealthy)

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8001
lsof -i :8001
# Kill the process
kill -9 <PID>
```

### Import Errors
```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=/app:$PYTHONPATH
```

### GPU Not Detected
```bash
# Verify NVIDIA Docker runtime
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request
