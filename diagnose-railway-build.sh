#!/bin/bash
# Railway Build Diagnostics Script
# Run this to check for common build issues

set -e

echo "=================================="
echo "Railway Build Diagnostics"
echo "=================================="
echo ""

# Check Node.js services
echo "📦 Checking Node.js Services..."
echo ""

for service in backend frontend line-bot; do
    echo "  Checking services/$service..."
    
    # Check package.json exists
    if [ ! -f "services/$service/package.json" ]; then
        echo "    ❌ ERROR: Missing package.json"
        continue
    fi
    echo "    ✅ package.json exists"
    
    # Check tsconfig.json exists
    if [ ! -f "services/$service/tsconfig.json" ]; then
        echo "    ❌ ERROR: Missing tsconfig.json"
        continue
    fi
    echo "    ✅ tsconfig.json exists"
    
    # Check build script exists
    if ! grep -q '"build"' "services/$service/package.json"; then
        echo "    ❌ ERROR: Missing 'build' script in package.json"
        continue
    fi
    echo "    ✅ build script exists"
    
    # Check start script exists
    if ! grep -q '"start"' "services/$service/package.json"; then
        echo "    ❌ WARNING: Missing 'start' script in package.json"
    else
        echo "    ✅ start script exists"
    fi
    
    echo ""
done

# Check Python services
echo "🐍 Checking Python Services..."
echo ""

for service in mlops simulator; do
    echo "  Checking services/$service..."
    
    # Check requirements.txt exists
    if [ ! -f "services/$service/requirements.txt" ]; then
        echo "    ❌ ERROR: Missing requirements.txt"
        continue
    fi
    echo "    ✅ requirements.txt exists"
    
    # Check main file exists
    if [ ! -f "services/$service/src/main.py" ] && [ ! -f "services/$service/app/main.py" ]; then
        echo "    ❌ ERROR: Missing main.py"
        continue
    fi
    echo "    ✅ main.py exists"
    
    echo ""
done

# Check railway.toml configuration
echo "🚂 Checking railway.toml..."
echo ""

if [ ! -f "railway.toml" ]; then
    echo "  ❌ ERROR: Missing railway.toml"
else
    echo "  ✅ railway.toml exists"
    
    # Check if all services are defined
    for service in backend frontend mlops simulator line-bot; do
        if grep -q "name = \"$service\"" railway.toml; then
            echo "  ✅ Service '$service' configured"
        else
            echo "  ❌ ERROR: Service '$service' not found in railway.toml"
        fi
    done
fi

echo ""
echo "=================================="
echo "Diagnosis Complete"
echo "=================================="
echo ""
echo "If you see errors above, they may cause Railway build failures."
echo ""
echo "Common fixes:"
echo "1. Ensure all services have required build files (package.json, tsconfig.json, requirements.txt)"
echo "2. Ensure build and start scripts are defined in package.json"
echo "3. Ensure Python services have src/main.py or app/main.py"
echo "4. Check Railway dashboard logs for specific error messages"
echo ""
