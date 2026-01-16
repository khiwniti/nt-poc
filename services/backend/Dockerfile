# Backend Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from backend service directory
COPY services/backend/package*.json ./

# Install all dependencies (including dev for TypeScript compilation)
# Skip prepare script (husky) which isn't needed in Docker builds
RUN npm install --ignore-scripts && \
    npm cache clean --force

# Copy source code and config from backend service directory
COPY services/backend/tsconfig.json ./
COPY services/backend/knexfile.ts ./
COPY services/backend/src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Install bash and wget for startup script and health checks
RUN apk add --no-cache bash wget

WORKDIR /app

# Copy package files
COPY services/backend/package*.json ./

# Install only production dependencies
# Skip lifecycle scripts (husky, postinstall)
RUN npm install --omit=dev --ignore-scripts && \
    npm cache clean --force

# Copy built code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.ts ./

# Copy migration scripts and startup script
COPY services/backend/scripts/ ./scripts/
COPY services/backend/migrations/ ./migrations/

# Make startup script executable
RUN chmod +x scripts/start-production.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check - uses /api/v1/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start application with migration script
CMD ["bash", "scripts/start-production.sh"]
