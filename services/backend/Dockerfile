# Backend Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from backend service directory
COPY services/backend/package*.json ./

# Install all dependencies (including dev for TypeScript compilation)
RUN npm install && \
    npm cache clean --force

# Copy source code and config from backend service directory
COPY services/backend/tsconfig.json ./
COPY services/backend/knexfile.ts ./
COPY services/backend/src/ ./src/

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/backend/package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy built code from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.ts ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "dist/index.js"]
