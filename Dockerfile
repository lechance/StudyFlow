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

RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

RUN mkdir -p /app/data /app/public && \
    chown -R nextjs:nodejs /app && \
    chmod 777 /app/data

# Create a default database with proper permissions
RUN sqlite3 /app/data/study.db "SELECT 1;" 2>/dev/null || \
    (touch /app/data/study.db && \
     chown nextjs:nodejs /app/data/study.db && \
     chmod 666 /app/data/study.db)

COPY --from=0 /app/.next/standalone ./
COPY --from=0 /app/.next/static ./.next/static
COPY --from=0 /app/public ./public
COPY --from=0 /app/package.json ./
COPY --from=0 /app/node_modules ./node_modules

USER nextjs

# Ensure database directory and file are writable
RUN chmod 777 /app/data && chmod 666 /app/data/study.db

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "server.js"]
