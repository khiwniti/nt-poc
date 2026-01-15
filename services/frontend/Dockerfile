# Frontend Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for optimized production image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from frontend service directory
COPY services/frontend/package*.json ./

# Install dependencies
RUN npm ci && \
    npm cache clean --force

# Copy source code from frontend service directory
COPY services/frontend/ .

# Build application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install serve for static file serving
RUN npm install -g serve && \
    npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:$PORT/ || exit 1

# Serve static files on Railway's PORT
CMD ["sh", "-c", "serve -s dist -l $PORT"]
