#!/bin/bash
# Production Readiness Verification Script
# Verifies all services are properly configured for Railway deployment

set -e

echo "🔍 Production Readiness Verification"
echo "===================================="
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

check_file_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        return 0
    else
        echo -e "${RED}✗${NC} $1 missing '$2'"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

warn_file_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contains '$2'"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $1 missing '$2' (optional)"
        WARNINGS=$((WARNINGS + 1))
        return 1
    fi
}

echo "📦 Backend Service"
echo "=================="
check_file "services/backend/Dockerfile"
check_file "services/backend/railway.json"
check_file "services/backend/Procfile"
check_file "services/backend/scripts/start-production.sh"
check_file "services/backend/src/routes/chatbot.ts"
check_file "services/backend/src/services/mlopsClient.ts"
check_file "services/backend/.env.example"

echo ""
echo "🔧 Backend Configuration"
echo "----------------------"
check_file_content "services/backend/Dockerfile" "start-production.sh"
check_file_content "services/backend/Dockerfile" "migrations/"
check_file_content "services/backend/Dockerfile" "bash"
check_file_content "services/backend/railway.json" "DOCKERFILE"
check_file_content "services/backend/railway.json" "/api/v1/health"
check_file_content "services/backend/Procfile" "npm run migrate"
check_file_content "services/backend/scripts/start-production.sh" "npm run migrate"
check_file_content "services/backend/src/app.ts" "chatbot"
check_file_content "services/backend/.env.example" "MLOPS_SERVICE_URL"
check_file_content "services/backend/.env.example" "SIMULATOR_URL"

echo ""
echo "🎨 Frontend Service"
echo "=================="
check_file "services/frontend/Dockerfile"
check_file "services/frontend/railway.json"
check_file "services/frontend/src/services/geminiService.ts"
check_file "services/frontend/src/components/Chat/AIChatWidget.tsx"
check_file "services/frontend/.env.example"

echo ""
echo "🔧 Frontend Configuration"
echo "------------------------"
check_file_content "services/frontend/.env.example" "VITE_GEMINI_API_KEY"
check_file_content "services/frontend/.env.example" "VITE_API_BASE_URL"
check_file_content "services/frontend/src/services/geminiService.ts" "fetchChatbotContext"
check_file_content "services/frontend/src/services/geminiService.ts" "RAG"
check_file_content "services/frontend/src/components/Chat/AIChatWidget.tsx" "token"

echo ""
echo "🤖 MLOps Service"
echo "==============="
check_file "services/mlops/Dockerfile"
check_file "services/mlops/railway.json"
check_file "services/mlops/src/api/routes.py"

echo ""
echo "🔧 MLOps Configuration"
echo "---------------------"
check_file_content "services/mlops/railway.json" "DOCKERFILE"
check_file_content "services/mlops/railway.json" "/health"
check_file_content "services/mlops/src/api/routes.py" "/ml/predict-rul"

echo ""
echo "📡 Simulator Service"
echo "==================="
check_file "services/simulator/Dockerfile"
check_file "services/simulator/railway.json"

echo ""
echo "🔧 Simulator Configuration"
echo "-------------------------"
check_file_content "services/simulator/railway.json" "DOCKERFILE"
check_file_content "services/simulator/railway.json" "/api/health"

echo ""
echo "📚 Documentation"
echo "==============="
check_file "RAILWAY_DEPLOYMENT_GUIDE.md"
check_file "PRODUCTION_CHECKLIST.md"

echo ""
echo "🔧 Documentation Content"
echo "-----------------------"
check_file_content "RAILWAY_DEPLOYMENT_GUIDE.md" "Automatic Database Migrations"
check_file_content "RAILWAY_DEPLOYMENT_GUIDE.md" "RAG-Enabled AI Chatbot"
check_file_content "RAILWAY_DEPLOYMENT_GUIDE.md" "VITE_GEMINI_API_KEY"
check_file_content "PRODUCTION_CHECKLIST.md" "MLOPS_SERVICE_URL"

echo ""
echo "================================"
echo "📊 Verification Summary"
echo "================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo "Your codebase is production-ready for Railway deployment!"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH WARNINGS${NC}"
    echo "Warnings: $WARNINGS (optional features)"
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    exit 1
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Review PRODUCTION_CHECKLIST.md for environment variables"
echo "2. Follow RAILWAY_DEPLOYMENT_GUIDE.md for deployment"
echo "3. Ensure VITE_GEMINI_API_KEY is set for RAG chatbot"
echo "4. Deploy services in order: Database → Backend → MLOps → Simulator → Frontend"
echo ""
