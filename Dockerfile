# StudyFlow - Dockerfile
# Multi-stage build using Alpine Linux for minimal image size

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3, etc.)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    musl-dev \
    sqlite-dev \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Disable telemetry
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN pnpm next build

# Bundle custom server with tsup (optional - for advanced use)
RUN pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify || true

# ============================================
# Stage 2: Runtime
# ============================================
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create data directory with full permissions
RUN mkdir -p /app/data /app/public && chmod 777 /app/data

# Install pnpm globally for running commands
RUN npm install -g pnpm@9

# Copy Next.js build output
COPY --from=builder /app/.next ./.next

# Copy static files
COPY --from=builder /app/public ./public

# Copy source code (needed for some runtime operations)
COPY --from=builder /app/src ./src

# Copy package.json and node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy custom server (if built)
COPY --from=builder /app/dist ./dist 2>/dev/null || mkdir -p ./dist

# Create a writable database file if it doesn't exist
RUN if [ ! -f /app/data/study.db ]; then \
        touch /app/data/study.db && \
        chmod 666 /app/data/study.db; \
    fi

# Always ensure data directory is writable
RUN chmod -R 777 /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000 || exit 1

# Default command - uses Next.js production server
CMD ["pnpm", "next", "start", "-p", "5000", "-H", "0.0.0.0"]
