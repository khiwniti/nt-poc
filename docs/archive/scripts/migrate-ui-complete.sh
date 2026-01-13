#!/bin/bash

# Complete UI Migration Script
# Migrates all files from "Facility 3D Manager New UI (3)" to services/frontend/src

SOURCE_DIR="/Users/khiwn/nt-poc/nt-poc/Facility 3D Manager New UI (3)"
TARGET_DIR="/Users/khiwn/nt-poc/nt-poc/services/frontend/src"

echo "🔄 Starting Complete UI Migration..."
echo "📁 Source: $SOURCE_DIR"
echo "📁 Target: $TARGET_DIR"
echo ""

# Create backup
echo "💾 Creating backup..."
BACKUP_DIR="/Users/khiwn/nt-poc/nt-poc/services/frontend/src-backup-$(date +%Y%m%d-%H%M%S)"
cp -r "$TARGET_DIR" "$BACKUP_DIR"
echo "✅ Backup created at: $BACKUP_DIR"
echo ""

# Copy main files
echo "📄 Copying main files..."

# App.tsx
cp "$SOURCE_DIR/App.tsx" "$TARGET_DIR/App.tsx"
echo "  ✅ App.tsx"

# index.tsx (main entry point)
if [ -f "$SOURCE_DIR/index.tsx" ]; then
    cp "$SOURCE_DIR/index.tsx" "$TARGET_DIR/main.tsx"
    echo "  ✅ index.tsx → main.tsx"
fi

# types.ts
cp "$SOURCE_DIR/types.ts" "$TARGET_DIR/types/facility-manager.ts"
echo "  ✅ types.ts → types/facility-manager.ts"

# constants.ts
cp "$SOURCE_DIR/constants.ts" "$TARGET_DIR/constants.ts"
echo "  ✅ constants.ts"

echo ""
echo "🧩 Copying components..."

# Copy all component directories
COMPONENT_DIRS=("ui" "Settings" "Chat" "Auth" "Dashboard" "Map" "Leases" "Inventory" "Maintenance" "Assets" "Reports" "Utility")

for dir in "${COMPONENT_DIRS[@]}"; do
    if [ -d "$SOURCE_DIR/components/$dir" ]; then
        echo "  📁 Copying components/$dir..."
        mkdir -p "$TARGET_DIR/components/$dir"
        cp -r "$SOURCE_DIR/components/$dir/"* "$TARGET_DIR/components/$dir/"
        echo "  ✅ components/$dir"
    fi
done

echo ""
echo "🔧 Copying services..."

# Copy services
mkdir -p "$TARGET_DIR/services"
if [ -d "$SOURCE_DIR/services" ]; then
    cp -r "$SOURCE_DIR/services/"* "$TARGET_DIR/services/"
    echo "  ✅ All services copied"
fi

echo ""
echo "⚙️  Copying configuration files..."

# Copy index.html to parent directory
cp "$SOURCE_DIR/index.html" "/Users/khiwn/nt-poc/nt-poc/services/frontend/index.html"
echo "  ✅ index.html"

# Copy vite.config.ts
cp "$SOURCE_DIR/vite.config.ts" "/Users/khiwn/nt-poc/nt-poc/services/frontend/vite.config.ts"
echo "  ✅ vite.config.ts"

# Copy tsconfig.json
cp "$SOURCE_DIR/tsconfig.json" "/Users/khiwn/nt-poc/nt-poc/services/frontend/tsconfig.json"
echo "  ✅ tsconfig.json"

echo ""
echo "🔄 Fixing import paths..."

# Fix imports in App.tsx
sed -i '' "s|from './types'|from './types/facility-manager'|g" "$TARGET_DIR/App.tsx"
echo "  ✅ Fixed App.tsx imports"

echo ""
echo "✨ Migration Summary:"
echo "  📄 Main files: App.tsx, main.tsx, types, constants"
echo "  🧩 Components: 12 directories copied"
echo "  🔧 Services: geminiService, weatherService"
echo "  ⚙️  Config: index.html, vite.config.ts, tsconfig.json"
echo "  💾 Backup: $BACKUP_DIR"
echo ""
echo "✅ Complete UI Migration Finished!"
echo ""
echo "Next steps:"
echo "  1. cd /Users/khiwn/nt-poc/nt-poc"
echo "  2. docker build -t facility-manager/frontend:dev -f services/frontend/Dockerfile.dev services/frontend"
echo "  3. kind load docker-image facility-manager/frontend:dev --name facility-manager"
echo "  4. kubectl rollout restart deployment/frontend -n facility-manager"
