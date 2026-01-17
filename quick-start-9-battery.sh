#!/bin/bash
# 9-Battery Quick Start Script
# Sets up and verifies the complete 9-battery configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing_deps=0

    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not installed"
        missing_deps=1
    fi

    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not installed"
        missing_deps=1
    fi

    if command_exists python3; then
        PYTHON_VERSION=$(python3 --version)
        print_success "Python installed: $PYTHON_VERSION"
    else
        print_error "Python 3 not installed"
        missing_deps=1
    fi

    if command_exists psql; then
        PSQL_VERSION=$(psql --version)
        print_success "PostgreSQL client installed: $PSQL_VERSION"
    else
        print_warning "psql not found (optional for verification)"
    fi

    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker installed: $DOCKER_VERSION"
    else
        print_warning "Docker not found (optional for local development)"
    fi

    if [ $missing_deps -eq 1 ]; then
        print_error "Missing required dependencies. Please install them and try again."
        exit 1
    fi
}

# Setup database
setup_database() {
    print_header "Setting Up Database"

    cd services/backend

    # Check if database is accessible
    print_info "Checking database connection..."
    if npm run migrate:status > /dev/null 2>&1; then
        print_success "Database connection established"
    else
        print_error "Cannot connect to database. Make sure PostgreSQL is running."
        print_info "Start PostgreSQL: docker-compose up -d postgres"
        exit 1
    fi

    # Run migrations
    print_info "Running database migrations..."
    npm run migrate
    print_success "Migrations completed"

    # Seed database
    print_info "Seeding database with 9 batteries..."
    npm run seed:run
    print_success "Database seeded with 9 batteries across 3 facilities"

    cd ../..
}

# Setup simulator
setup_simulator() {
    print_header "Setting Up Simulator Service"

    cd services/simulator

    # Check if venv exists
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_info "Virtual environment already exists"
    fi

    # Activate venv and install dependencies
    print_info "Installing Python dependencies..."
    source venv/bin/activate
    pip install -q -r requirements.txt
    print_success "Python dependencies installed"

    # Check .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_info "Creating .env from .env.example..."
            cp .env.example .env
            print_success ".env file created"
        else
            print_warning ".env file not found. Using default configuration."
        fi
    else
        print_info ".env file exists"
    fi

    deactivate
    cd ../..
}

# Setup backend
setup_backend() {
    print_header "Setting Up Backend Service"

    cd services/backend

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_info "Dependencies already installed"
    fi

    # Check .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_info "Creating .env from .env.example..."
            cp .env.example .env
            print_success ".env file created"
            print_warning "Please update .env with your configuration"
        else
            print_warning ".env file not found. Using environment defaults."
        fi
    else
        print_info ".env file exists"
    fi

    cd ../..
}

# Setup frontend
setup_frontend() {
    print_header "Setting Up Frontend Service"

    cd services/frontend

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_info "Installing Node.js dependencies..."
        npm install
        print_success "Dependencies installed"
    else
        print_info "Dependencies already installed"
    fi

    # Check .env file
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            print_info "Creating .env from .env.example..."
            cp .env.example .env
            print_success ".env file created"
            print_warning "Please add your VITE_MAPBOX_TOKEN to .env"
        else
            print_warning ".env file not found"
        fi
    else
        print_info ".env file exists"
    fi

    cd ../..
}

# Start services
start_services() {
    print_header "Starting Services"

    print_info "Starting services in separate terminals..."
    print_info "You can stop them with: pkill -f 'uvicorn|tsx'"

    # Start simulator
    print_info "Starting simulator on port 8001..."
    cd services/simulator
    source venv/bin/activate
    nohup uvicorn app.main:app --reload --port 8001 > ../../logs/simulator.log 2>&1 &
    SIMULATOR_PID=$!
    deactivate
    cd ../..
    sleep 3

    # Check if simulator started
    if curl -s http://localhost:8001/api/health > /dev/null; then
        print_success "Simulator running (PID: $SIMULATOR_PID)"
    else
        print_error "Simulator failed to start. Check logs/simulator.log"
        exit 1
    fi

    # Start backend
    print_info "Starting backend on port 3000..."
    cd services/backend
    nohup npm run dev > ../../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ../..
    sleep 5

    # Check if backend started
    if curl -s http://localhost:3000/api/v1/health > /dev/null; then
        print_success "Backend running (PID: $BACKEND_PID)"
    else
        print_error "Backend failed to start. Check logs/backend.log"
        exit 1
    fi

    # Save PIDs
    echo $SIMULATOR_PID > .pids
    echo $BACKEND_PID >> .pids

    print_success "All services started successfully!"
    print_info "Simulator: http://localhost:8001/docs"
    print_info "Backend: http://localhost:3000/api/v1/health"
    print_info "Logs: tail -f logs/simulator.log logs/backend.log"
}

# Verify configuration
verify_configuration() {
    print_header "Verifying 9-Battery Configuration"

    cd services/backend

    print_info "Running verification script..."
    sleep 10  # Wait for sensor ingestion to run a few times

    if npm run verify:9-battery; then
        print_success "Configuration verification passed!"
    else
        print_warning "Some verification tests failed. Check output above."
    fi

    cd ../..
}

# Print next steps
print_next_steps() {
    print_header "Setup Complete!"

    echo -e "${GREEN}Your 9-battery system is now running!${NC}\n"

    echo -e "${BLUE}📊 Service URLs:${NC}"
    echo -e "  • Simulator API Docs: http://localhost:8001/docs"
    echo -e "  • Backend API:        http://localhost:3000/api/v1/"
    echo -e "  • Frontend (manual):  cd services/frontend && npm run dev\n"

    echo -e "${BLUE}📋 Battery Configuration:${NC}"
    echo -e "  • 9 batteries across 3 facilities"
    echo -e "  • Bangkok HQ:      3 batteries (Rack-based)"
    echo -e "  • Phuket DC:       3 batteries (Cabinet-based)"
    echo -e "  • Chiang Mai Ops:  3 batteries (Floor-mounted)\n"

    echo -e "${BLUE}🔍 Useful Commands:${NC}"
    echo -e "  • View logs:         tail -f logs/simulator.log logs/backend.log"
    echo -e "  • Check database:    psql -U postgres -d battery_management"
    echo -e "  • Verify config:     cd services/backend && npm run verify:9-battery"
    echo -e "  • Stop services:     pkill -f 'uvicorn|tsx'\n"

    echo -e "${BLUE}📖 Documentation:${NC}"
    echo -e "  • Configuration Guide:  9_BATTERY_CONFIGURATION_GUIDE.md"
    echo -e "  • Project README:       CLAUDE.md"
    echo -e "  • API Documentation:    http://localhost:8001/docs\n"

    echo -e "${YELLOW}⚠️  To start the frontend:${NC}"
    echo -e "  cd services/frontend"
    echo -e "  npm run dev"
    echo -e "  # Then open: http://localhost:5173\n"
}

# Stop services
stop_services() {
    print_header "Stopping Services"

    if [ -f ".pids" ]; then
        while IFS= read -r pid; do
            if ps -p $pid > /dev/null; then
                print_info "Stopping process $pid..."
                kill $pid
            fi
        done < .pids
        rm .pids
        print_success "Services stopped"
    else
        print_info "No running services found"
    fi
}

# Main script
main() {
    clear
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║          🔋 9-Battery Configuration Quick Start 🔋          ║"
    echo "║                                                              ║"
    echo "║  Sets up complete battery management system with:           ║"
    echo "║  • 9 batteries across 3 facilities                          ║"
    echo "║  • Real-time sensor simulation                              ║"
    echo "║  • Backend API with auto-ingestion                          ║"
    echo "║  • TimescaleDB with 3D layout support                       ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}\n"

    # Create logs directory
    mkdir -p logs

    # Parse arguments
    case "${1:-setup}" in
        setup)
            check_prerequisites
            setup_database
            setup_simulator
            setup_backend
            setup_frontend
            start_services
            verify_configuration
            print_next_steps
            ;;
        start)
            print_header "Starting Services Only"
            start_services
            print_success "Services started"
            ;;
        stop)
            stop_services
            ;;
        verify)
            verify_configuration
            ;;
        reset)
            print_warning "This will reset the database and restart services!"
            read -p "Are you sure? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                stop_services
                cd services/backend
                npm run migrate:rollback
                npm run migrate
                npm run seed:run
                cd ../..
                start_services
                verify_configuration
                print_success "System reset complete"
            else
                print_info "Reset cancelled"
            fi
            ;;
        *)
            echo "Usage: $0 {setup|start|stop|verify|reset}"
            echo ""
            echo "Commands:"
            echo "  setup   - Complete setup (default)"
            echo "  start   - Start services only"
            echo "  stop    - Stop all services"
            echo "  verify  - Run verification tests"
            echo "  reset   - Reset database and restart"
            exit 1
            ;;
    esac
}

# Run main
main "$@"
