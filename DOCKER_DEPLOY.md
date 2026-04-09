# Docker Deployment Guide

This guide explains how to deploy StudyFlow using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### 2. Build and Run with Docker

```bash
# Build the image
docker build -t studyflow .

# Run the container
docker run -d \
  --name studyflow-app \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  studyflow
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `production` |
| `COZE_PROJECT_ENV` | Project environment | `PROD` |

### Data Persistence

The SQLite database is stored in the `./data` directory. This directory is mounted as a volume to persist data across container restarts.

## Production Deployment

### Using docker-compose (Recommended)

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Using Docker directly

```bash
# Pull latest changes
git pull

# Rebuild image
docker build -t studyflow .

# Stop and remove old container
docker stop studyflow-app
docker rm studyflow-app

# Start new container
docker run -d \
  --name studyflow-app \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  studyflow
```

## Troubleshooting

### Container fails to start

Check the logs:
```bash
docker-compose logs
```

### Database issues

Ensure the data directory has proper permissions:
```bash
chmod 755 data
```

### Port already in use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "5001:5000"  # Map external port 5001 to internal 5000
```

## Development with Docker

For local development with hot reloading:

```bash
docker-compose -f docker-compose.dev.yml up
```

See `docker-compose.dev.yml` for development configuration.
