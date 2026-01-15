# LINE Bot Service Dockerfile
# Built from repository root with service-specific paths
# Multi-stage build for optimized production image

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files from line-bot service directory
COPY services/line-bot/package*.json ./

# Install dependencies (skip lifecycle scripts like husky)
RUN npm ci --ignore-scripts

# Copy source code from line-bot service directory
COPY services/line-bot/ .

# Build TypeScript
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/line-bot/package*.json ./

# Install production dependencies only (skip lifecycle scripts)
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["node", "dist/index.js"]
