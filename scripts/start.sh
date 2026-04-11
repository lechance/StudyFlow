#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"


start_service() {
    cd "${COZE_WORKSPACE_PATH}"
    
    # Ensure data directory and database are writable
    chmod -R 777 /app/data 2>/dev/null || true
    if [ -d "data" ]; then
        chmod -R 777 data 2>/dev/null || true
    fi
    
    # Ensure studyflow-data directory is writable (production)
    chmod -R 777 /app/work/studyflow-data 2>/dev/null || true
    
    echo "Starting production service on port ${DEPLOY_RUN_PORT}..."
    # 使用 COZE_PROJECT_ENV=PROD 确保运行在生产模式
    COZE_PROJECT_ENV=PROD PORT=${DEPLOY_RUN_PORT} node dist/server.js
}

echo "Starting production service on port ${DEPLOY_RUN_PORT}..."
start_service
