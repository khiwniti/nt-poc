#!/bin/bash
# T192 Implementation Verification Script

echo "🔍 T192: Mapbox GL JS Integration - Verification"
echo "================================================"
echo ""

# Check files exist
echo "📁 Checking files..."
files=(
  "services/frontend/src/components/FacilityMap.tsx"
  "services/frontend/src/utils/facilityHealth.ts"
  "services/frontend/src/utils/__tests__/facilityHealth.test.ts"
  "services/frontend/src/components/__tests__/FacilityMap.test.tsx"
  "services/frontend/e2e/mapbox-integration.spec.ts"
  "T192_README.md"
  "T192_IMPLEMENTATION_COMPLETE.md"
  "T192_QUICK_REFERENCE.md"
  "T192_ACCEPTANCE_CHECKLIST.md"
  "T192_FILES_MANIFEST.md"
  "T192_COMMIT_MESSAGE.txt"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
    all_exist=false
  fi
done
echo ""

# Check dependencies
echo "📦 Checking dependencies..."
if grep -q '"mapbox-gl"' services/frontend/package.json; then
  echo "  ✅ mapbox-gl installed"
else
  echo "  ❌ mapbox-gl NOT installed"
  all_exist=false
fi

if grep -q '"@types/mapbox-gl"' services/frontend/package.json; then
  echo "  ✅ @types/mapbox-gl installed"
else
  echo "  ❌ @types/mapbox-gl NOT installed"
  all_exist=false
fi

if ! grep -q '"leaflet"' services/frontend/package.json; then
  echo "  ✅ leaflet removed"
else
  echo "  ❌ leaflet still present"
  all_exist=false
fi
echo ""

# Run tests
echo "🧪 Running tests..."
cd services/frontend
npm test -- --run src/components/__tests__/FacilityMap.test.tsx src/utils/__tests__/facilityHealth.test.ts > /tmp/t192-test-output.txt 2>&1
if [ $? -eq 0 ]; then
  echo "  ✅ All tests passing"
  grep "Test Files" /tmp/t192-test-output.txt | head -1
  grep "Tests" /tmp/t192-test-output.txt | head -1
else
  echo "  ❌ Tests failed"
  cat /tmp/t192-test-output.txt
  all_exist=false
fi
cd ../..
echo ""

# Check environment config
echo "⚙️  Checking configuration..."
if grep -q "VITE_MAPBOX_API_KEY" services/frontend/.env.example; then
  echo "  ✅ VITE_MAPBOX_API_KEY documented in .env.example"
else
  echo "  ❌ VITE_MAPBOX_API_KEY not in .env.example"
  all_exist=false
fi
echo ""

# Summary
echo "================================================"
if [ "$all_exist" = true ]; then
  echo "✅ T192 Implementation VERIFIED"
  echo ""
  echo "Next steps:"
  echo "1. Set VITE_MAPBOX_API_KEY in production"
  echo "2. Run manual QA testing"
  echo "3. Test on mobile devices"
  echo "4. Deploy to staging/production"
  echo ""
  echo "📚 Documentation:"
  echo "   - T192_README.md (overview)"
  echo "   - T192_QUICK_REFERENCE.md (commands)"
  echo "   - T192_IMPLEMENTATION_COMPLETE.md (details)"
  echo ""
  echo "🚀 Ready for deployment!"
  exit 0
else
  echo "❌ T192 Implementation INCOMPLETE"
  echo "   Please review the failures above"
  exit 1
fi
