# T136 Quick Reference - MLOps Service

## ✅ All Acceptance Criteria Met

- [x] Python 3.11 environment setup
- [x] FastAPI application structure  
- [x] Dependencies: tensorflow, scikit-learn, pandas, numpy
- [x] Dockerfile with GPU support optional
- [x] Health check endpoint /health
- [x] Service runs on port 8001

## 📁 Service Location
```
services/mlops/
```

## 🚀 Quick Commands

### Start Service (Local)
```bash
cd services/mlops
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

### Start Service (Docker CPU)
```bash
cd services/mlops
docker build -t mlops-service .
docker run -p 8001:8001 mlops-service
```

### Start Service (Docker GPU)
```bash
cd services/mlops
docker build -f Dockerfile.gpu -t mlops-service:gpu .
docker run --gpus all -p 8001:8001 mlops-service:gpu
```

### Run Tests
```bash
cd services/mlops
pytest tests/ -v
```

## 📡 Endpoints

### Health Check
```bash
curl http://localhost:8001/health
```

### API Docs
```
http://localhost:8001/docs
```

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| Python | 3.11+ | Runtime |
| FastAPI | 0.109.0 | Web framework |
| TensorFlow | 2.15.0 | Deep learning |
| scikit-learn | 1.4.0 | ML algorithms |
| pandas | 2.2.0 | Data manipulation |
| numpy | 1.26.3 | Numerical computing |

## 📂 Files Created

```
services/mlops/
├── Dockerfile              # CPU deployment
├── Dockerfile.gpu          # GPU deployment
├── requirements.txt        # Dependencies
├── README.md              # Documentation
├── .env.example           # Config template
├── .gitignore
├── src/
│   ├── main.py            # FastAPI app
│   ├── config.py          # Settings
│   ├── api/routes.py      # Endpoints
│   ├── models/            # Model management
│   └── utils/             # Utilities
└── tests/
    ├── test_health.py     # Tests
    └── conftest.py        # Pytest config
```

## ✅ Test Results
```
tests/test_health.py::test_health_check PASSED
tests/test_health.py::test_root_endpoint PASSED

2 passed in 0.19s
```

## 🔧 Configuration

Environment variables (`.env`):
```bash
ENVIRONMENT=development
PORT=8001
CORS_ORIGINS=["http://localhost:3000"]
MODELS_DIR=models
LOG_LEVEL=INFO
```

## 📊 Health Check Response
```json
{
  "status": "healthy",
  "service": "mlops",
  "timestamp": "2026-01-09T13:20:15Z",
  "version": "1.0.0",
  "python_version": "3.11.0",
  "platform": "Linux-5.15.0"
}
```

---

**Status**: ✅ Complete and tested
**Date**: January 9, 2026
