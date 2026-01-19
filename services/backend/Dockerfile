# Backend Service Dockerfile
# Multi-stage build for optimized production image

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/backend/package*.json ./
COPY services/backend/tsconfig.json ./
COPY services/backend/knexfile.js ./

# Install ALL dependencies (including devDependencies for build)
RUN npm install --ignore-scripts && npm cache clean --force

# Copy source code
COPY services/backend/src ./src
COPY services/backend/scripts ./scripts
COPY services/backend/migrations ./migrations
COPY services/backend/seeds ./seeds

# Build TypeScript
RUN npm run build

# Debug: List built files
RUN echo "=== Listing dist directory ===" && ls -la dist/ || echo "dist/ not found"

# ============================================================================
# Production image
# ============================================================================
FROM node:20-alpine

WORKDIR /app

# Install bash and wget for healthchecks and startup script
RUN apk add --no-cache bash wget

# Copy package files
COPY services/backend/package*.json ./

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force

# Copy built files from builder stage (rootDir="./src" so dist contains compiled src/)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.js ./knexfile.js

# Copy runtime files
COPY services/backend/migrations/ ./migrations/

# Copy all scripts from builder stage (needed for migrations and startup)
COPY --from=builder /app/scripts ./scripts

# Make scripts executable
RUN chmod +x scripts/*.sh scripts/*.ts

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start command (runs migrations via start-production.sh then starts server)
CMD ["bash", "scripts/start-production.sh"]