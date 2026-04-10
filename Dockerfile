# StudyFlow - Dockerfile
FROM node:20-slim

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

# Run build commands directly
RUN pnpm next build
RUN pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Create data directory with full permissions
RUN mkdir -p /app/data /app/public && chmod 777 /app/data

COPY --from=0 /app/.next/standalone ./
COPY --from=0 /app/.next/static ./.next/static
COPY --from=0 /app/public ./public
COPY --from=0 /app/package.json ./
COPY --from=0 /app/node_modules ./node_modules

# Create a writable database file if it doesn't exist
RUN if [ ! -f /app/data/study.db ]; then \
        touch /app/data/study.db && \
        chmod 666 /app/data/study.db; \
    fi

# Always ensure data directory is writable
RUN chmod -R 777 /app/data

# Note: Container runs as root by default to ensure write access to volumes

# Ensure data directory and database are always writable
RUN chmod -R 777 /app/data

# Run as root to allow writing to mounted volumes
# Do not use USER directive to avoid permission issues with volumes

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
