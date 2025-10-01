#!/bin/bash

# Monitoring and Maintenance Script for SweepingApps
# Usage: ./monitor.sh [status|logs|backup|update|restart]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

APP_DIR="/opt/sweepingapps"

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_status() {
    print_status "Checking application status..."
    echo ""
    
    # System resources
    echo "🖥️  System Resources:"
    echo "  Memory Usage: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
    echo "  Disk Usage: $(df -h / | awk 'NR==2{print $5}')"
    echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
    echo ""
    
    # Docker containers
    echo "🐳 Docker Containers:"
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        docker-compose ps
    else
        print_error "Application directory not found: $APP_DIR"
    fi
    echo ""
    
    # Service status
    echo "🔧 Service Status:"
    systemctl status sweepingapps.service --no-pager -l
    echo ""
    
    # Nginx status
    echo "🌐 Nginx Status:"
    systemctl status nginx --no-pager -l
    echo ""
    
    # Database connectivity
    echo "🗄️  Database Status:"
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        if docker-compose exec -T postgres pg_isready -U sweepingapps_user 2>/dev/null; then
            print_success "Database is ready"
        else
            print_error "Database is not ready"
        fi
    fi
    echo ""
}

show_logs() {
    local service=${1:-""}
    
    print_status "Showing application logs..."
    echo ""
    
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        if [ -n "$service" ]; then
            print_status "Logs for service: $service"
            docker-compose logs -f --tail=100 $service
        else
            print_status "All services logs (last 50 lines each):"
            docker-compose logs --tail=50
        fi
    else
        print_error "Application directory not found: $APP_DIR"
    fi
}

backup_data() {
    print_status "Creating backup..."
    
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        ./backup_db.sh
        print_success "Backup completed"
    else
        print_error "Application directory not found: $APP_DIR"
    fi
}

update_application() {
    print_status "Updating application..."
    
    if [ -d "$APP_DIR" ]; then
        cd $APP_DIR
        
        # Pull latest changes (if using git)
        if [ -d ".git" ]; then
            print_status "Pulling latest changes..."
            git pull origin main
        fi
        
        # Rebuild and restart
        print_status "Rebuilding containers..."
        docker-compose down
        docker-compose up --build -d
        
        # Clean up old images
        print_status "Cleaning up old images..."
        docker image prune -f
        
        print_success "Application updated successfully"
    else
        print_error "Application directory not found: $APP_DIR"
    fi
}

restart_application() {
    print_status "Restarting application..."
    
    systemctl restart sweepingapps.service
    print_success "Application restarted"
}

show_help() {
    echo "🔧 SweepingApps Monitoring & Maintenance Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status     - Show application and system status"
    echo "  logs       - Show application logs"
    echo "  logs [service] - Show logs for specific service (backend, frontend, postgres, redis)"
    echo "  backup     - Create database backup"
    echo "  update     - Update application"
    echo "  restart    - Restart application"
    echo "  help       - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 logs backend"
    echo "  $0 backup"
    echo "  $0 update"
    echo ""
}

# Main script logic
case "${1:-status}" in
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "backup")
        backup_data
        ;;
    "update")
        update_application
        ;;
    "restart")
        restart_application
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
