# NT-POC Battery Management System

Monorepo containing 5 microservices for battery monitoring, ML-powered predictive maintenance, and data simulation.

## Services

- **backend** - Node.js/Express API server with TimescaleDB
- **frontend** - React/Vite dashboard with real-time monitoring
- **ml** - Python ML model training for anomaly detection and RUL prediction
- **mlops** - FastAPI ML prediction service
- **simulator** - Python battery data generator for testing and training

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 7.0.0
- **Python** >= 3.9
- **PostgreSQL** >= 14 (with TimescaleDB extension)

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies for all workspaces
npm install

# Install Python dependencies (requires virtual environments)
cd services/ml
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
deactivate

cd ../mlops
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

cd ../simulator
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

cd ../..
```

### 2. Setup Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Run migrations
cd services/backend
npm run migrate
cd ../..
```

### 3. Run Development Servers

```bash
# Start backend and frontend concurrently
npm run dev

# Or run individually
npm run dev:backend   # Backend on http://localhost:3001
npm run dev:frontend  # Frontend on http://localhost:5173
```

## Monorepo Structure

```
nt-poc/
├── package.json              # Root workspace configuration
├── services/
│   ├── backend/              # Express API (@nt-poc/backend)
│   │   ├── src/              # TypeScript source code
│   │   ├── migrations/       # Database migrations
│   │   └── tests/            # Backend tests
│   ├── frontend/             # React app (@nt-poc/frontend)
│   │   ├── src/              # React components
│   │   ├── e2e/              # Playwright E2E tests
│   │   └── tests/            # Vitest unit tests
│   ├── ml/                   # Python ML training
│   │   ├── src/              # ML model code
│   │   └── tests/            # Python tests
│   ├── mlops/                # FastAPI ML serving
│   │   ├── src/              # API endpoints
│   │   └── tests/            # API tests
│   └── simulator/            # Battery data generator
│       ├── src/              # Simulation code
│       └── tests/            # Generator tests
├── infrastructure/           # Docker, nginx configs
└── tests/                    # Shared test utilities
```

## npm Scripts

### Development
- `npm run dev` - Start backend and frontend concurrently
- `npm run dev:backend` - Start backend only
- `npm run dev:frontend` - Start frontend only

### Build & Test
- `npm run build` - Build all Node.js services
- `npm test` - Run tests for all services
- `npm run lint` - Lint all services
- `npm run typecheck` - Type check all services
- `npm run quality` - Run all quality checks (typecheck + lint + format check)

### Maintenance
- `npm run clean` - Clean all build artifacts and node_modules

## Service Documentation

- [Backend Documentation](services/backend/README.md) - API endpoints, database schema
- [Frontend Documentation](services/frontend/README.md) - Component architecture, E2E tests
- [ML Service Documentation](services/ml/README.md) - Model training, evaluation
- [MLOps Documentation](services/mlops/README.md) - Prediction API, model serving
- [Simulator Documentation](services/simulator/README.md) - Data generation, usage patterns

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes
Edit code in the relevant service directory.

### 3. Run Tests
```bash
npm test                    # Run all tests
cd services/backend && npm test  # Run backend tests only
```

### 4. Quality Checks
```bash
npm run quality  # TypeScript + ESLint + Prettier
```

### 5. Commit Changes
```bash
git add .
git commit -m "feat: add your feature"
```

Use conventional commit format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

### 6. Create Pull Request
Push your branch and create a PR for review.

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL 14 with TimescaleDB extension
- **ORM**: Knex.js
- **Testing**: Vitest
- **API Client**: Supertest

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **State**: React Query (TanStack Query)
- **Routing**: React Router
- **Charts**: Recharts
- **Testing**: Vitest + Playwright
- **Accessibility**: axe-core

### ML Services (Python)
- **ML Training**: TensorFlow, scikit-learn, SHAP
- **API**: FastAPI
- **Data**: NumPy, pandas
- **Testing**: pytest

### Simulator (Python)
- **Core**: NumPy, pandas, scipy
- **Testing**: pytest

## Environment Variables

### Backend
Create `services/backend/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/battery_db
NODE_ENV=development
PORT=3001
```

### Frontend
Create `services/frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

### MLOps
Create `services/mlops/.env`:
```env
MODEL_PATH=../ml/models/
PYTHONPATH=src
```

## Database Setup

### Using Docker Compose
```bash
docker-compose up -d postgres
```

### Manual Setup
1. Install PostgreSQL 14+ with TimescaleDB extension
2. Create database: `createdb battery_db`
3. Run migrations: `cd services/backend && npm run migrate`

## Troubleshooting

### npm install fails
- Ensure Node.js >= 18.0.0: `node --version`
- Clean install: `rm -rf node_modules package-lock.json && npm install`

### Database connection fails
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in services/backend/.env
- Check PostgreSQL logs: `docker-compose logs postgres`

### Python dependencies fail
- Use virtual environments (see Quick Start section)
- Ensure Python >= 3.9: `python3 --version`
- Upgrade pip: `pip install --upgrade pip`

### Port already in use
- Backend (3001): `lsof -ti:3001 | xargs kill`
- Frontend (5173): `lsof -ti:5173 | xargs kill`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Follow the development workflow
4. Submit a pull request

## License

Private project - All rights reserved
