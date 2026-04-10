# StudyFlow - Dockerfile
FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Run build
RUN pnpm next build

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Create data directory
RUN mkdir -p /app/data /app/public && chmod 777 /app/data

# Copy everything needed for Next.js production server
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Create a writable database file if it doesn't exist
RUN if [ ! -f /app/data/study.db ]; then \
        touch /app/data/study.db && \
        chmod 666 /app/data/study.db; \
    fi

# Always ensure data directory is writable
RUN chmod -R 777 /app/data
