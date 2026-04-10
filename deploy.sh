#!/bin/bash
# StudyFlow Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: production (default), development

set -e

# Configuration
PROJECT_NAME="studyflow"
DOMAIN=${COZE_PROJECT_DOMAIN_DEFAULT:-""}
PORT=${DEPLOY_RUN_PORT:-5000}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_info "Docker and Docker Compose are available."
}

create_data_dir() {
    if [ ! -d "./data" ]; then
        log_info "Creating data directory..."
        mkdir -p ./data
    fi
    
    # Ensure proper permissions
    chmod 755 ./data 2>/dev/null || true
    log_info "Data directory is ready."
}

build_image() {
    local environment=$1
    log_info "Building Docker image for $environment environment..."
    
    if [ "$environment" = "development" ]; then
        docker-compose -f docker-compose.dev.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    log_info "Build completed successfully."
}

start_container() {
    local environment=$1
    log_info "Starting container..."
    
    if [ "$environment" = "development" ]; then
        docker-compose -f docker-compose.dev.yml up -d
    else
        docker-compose up -d
    fi
    
    log_info "Container started successfully."
}

stop_container() {
    local environment=$1
    log_warn "Stopping container..."
    
    if [ "$environment" = "development" ]; then
        docker-compose -f docker-compose.dev.yml down
    else
        docker-compose down
    fi
    
    log_info "Container stopped."
}

show_status() {
    log_info "Container status:"
    docker-compose ps
    
    if [ -n "$DOMAIN" ]; then
        log_info "Application URL: https://$DOMAIN"
    else
        log_info "Application URL: http://localhost:$PORT"
    fi
}

show_logs() {
    local environment=${1:-"production"}
    log_info "Showing logs (Ctrl+C to exit)..."
    
    if [ "$environment" = "development" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Main script
main() {
    local action=${1:-"start"}
    local environment=${2:-"production"}
    
    echo "=========================================="
    echo "  StudyFlow Deployment Script"
    echo "=========================================="
    echo ""
    
    case $action in
        start)
            check_docker
            create_data_dir
            build_image $environment
            stop_container $environment 2>/dev/null || true
            start_container $environment
            sleep 2
            show_status
            ;;
        stop)
            stop_container $environment
            ;;
        restart)
            stop_container $environment
            start_container $environment
            show_status
            ;;
        rebuild)
            check_docker
            stop_container $environment
            build_image $environment
            start_container $environment
            show_status
            ;;
        logs)
            show_logs $environment
            ;;
        status)
            docker-compose ps
            show_status
            ;;
        clean)
            log_warn "This will remove all containers, images, and volumes!"
            read -p "Are you sure? [y/N] " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                docker-compose down -v --rmi all
                log_info "Clean completed."
            else
                log_info "Clean cancelled."
            fi
            ;;
        *)
            echo "Usage: $0 {start|stop|restart|rebuild|logs|status|clean} [environment]"
            echo ""
            echo "Commands:"
            echo "  start     - Build and start the application (default)"
            echo "  stop      - Stop the container"
            echo "  restart   - Restart the container"
            echo "  rebuild   - Rebuild and restart"
            echo "  logs      - Show container logs"
            echo "  status    - Show container status"
            echo "  clean     - Remove containers, images, and volumes"
            echo ""
            echo "Environments: production (default), development"
            echo ""
            echo "Examples:"
            echo "  $0 start              # Start production"
            echo "  $0 start development  # Start development"
            echo "  $0 rebuild            # Rebuild and restart production"
            echo "  $0 logs               # View production logs"
            exit 1
            ;;
    esac
}

main "$@"
