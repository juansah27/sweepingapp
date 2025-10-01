#!/bin/bash

# Ubuntu Server Deployment Script for SweepingApps
# Run this script as root or with sudo privileges

set -e  # Exit on any error

echo "🚀 Starting SweepingApps deployment on Ubuntu Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root or with sudo"
    exit 1
fi

# Get server IP
print_status "Detecting server IP..."
SERVER_IP=$(hostname -I | awk '{print $1}')
print_success "Server IP detected: $SERVER_IP"

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y
print_success "System updated successfully"

# Install prerequisites
print_status "Installing prerequisites..."
apt install -y apt-transport-https ca-certificates curl gnupg lsb-release software-properties-common ufw
print_success "Prerequisites installed"

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Remove old Docker versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    print_success "Docker installed successfully"
else
    print_warning "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_warning "Docker Compose already installed"
fi

# Install Nginx
print_status "Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx installed successfully"
else
    print_warning "Nginx already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 3000  # Frontend
ufw allow 8001  # Backend
print_success "Firewall configured"

# Create application directory
APP_DIR="/opt/sweepingapps"
print_status "Setting up application directory at $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR

# Check if application files exist
if [ ! -f "docker-compose.yml" ]; then
    print_error "Application files not found in $APP_DIR"
    print_status "Please copy your application files to $APP_DIR first"
    print_status "You can use:"
    print_status "  scp -r /path/to/sweepingapps/* user@$SERVER_IP:$APP_DIR/"
    exit 1
fi

# Setup environment files
print_status "Setting up environment configuration..."
if [ ! -f "docker.env" ]; then
    print_status "Creating docker.env file..."
    cat > docker.env << EOF
# Database Configuration
POSTGRES_DB=sweepingapps
POSTGRES_USER=sweepingapps_user
POSTGRES_PASSWORD=$(openssl rand -base64 32)

# Redis Configuration
REDIS_PASSWORD=$(openssl rand -base64 32)

# Application Configuration
SECRET_KEY=$(openssl rand -base64 64)
DEBUG=False
ENVIRONMENT=production

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8001
FRONTEND_PORT=3000

# Network Configuration
BACKEND_URL=http://$SERVER_IP:8001
FRONTEND_URL=http://$SERVER_IP:3000

# Marketplace Apps Control
MARKETPLACE_APPS_ENABLED=false
AUTO_RUN_MARKETPLACE_APPS=false
EOF
    print_success "Environment file created"
else
    print_warning "docker.env already exists"
fi

# Setup network configuration
if [ ! -f "network_config.env" ]; then
    print_status "Creating network_config.env file..."
    cat > network_config.env << EOF
# Server IP Configuration
SERVER_IP=$SERVER_IP
BACKEND_PORT=8001
FRONTEND_PORT=3000
EOF
    print_success "Network configuration file created"
else
    print_warning "network_config.env already exists"
fi

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cat > /etc/nginx/sites-available/sweepingapps << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Other backend endpoints
    location ~ ^/(orders|refresh-interface-status|marketplace-status|brand-accounts)/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/sweepingapps /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
print_success "Nginx configured"

# Build and start application
print_status "Building and starting application..."
docker-compose down 2>/dev/null || true
docker-compose up --build -d
print_success "Application started"

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check if services are running
print_status "Checking service status..."
if docker-compose ps | grep -q "Up"; then
    print_success "Services are running"
else
    print_error "Some services failed to start"
    docker-compose logs
    exit 1
fi

# Create backup script
print_status "Creating backup script..."
cat > $APP_DIR/backup_db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/sweepingapps/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U sweepingapps_user sweepingapps > $BACKUP_DIR/sweepingapps_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "sweepingapps_*.sql" -mtime +7 -delete

echo "Backup completed: sweepingapps_$DATE.sql"
EOF

chmod +x $APP_DIR/backup_db.sh
print_success "Backup script created"

# Create systemd service for auto-start
print_status "Creating systemd service..."
cat > /etc/systemd/system/sweepingapps.service << EOF
[Unit]
Description=SweepingApps Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sweepingapps.service
print_success "Systemd service created and enabled"

# Display deployment summary
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "  Server IP: $SERVER_IP"
echo "  Application Directory: $APP_DIR"
echo "  Frontend URL: http://$SERVER_IP:3000"
echo "  Backend URL: http://$SERVER_IP:8001"
echo "  Nginx URL: http://$SERVER_IP"
echo ""
echo "🔧 Management Commands:"
echo "  Start: systemctl start sweepingapps"
echo "  Stop: systemctl stop sweepingapps"
echo "  Status: systemctl status sweepingapps"
echo "  Logs: docker-compose -f $APP_DIR/docker-compose.yml logs -f"
echo "  Backup: $APP_DIR/backup_db.sh"
echo ""
echo "📝 Next Steps:"
echo "  1. Access the application at http://$SERVER_IP"
echo "  2. Create an admin user through the registration page"
echo "  3. Configure your domain (optional)"
echo "  4. Setup SSL certificate (optional)"
echo ""
echo "🔐 Important Files:"
echo "  Environment: $APP_DIR/docker.env"
echo "  Nginx Config: /etc/nginx/sites-available/sweepingapps"
echo "  Service Config: /etc/systemd/system/sweepingapps.service"
echo ""
print_success "SweepingApps deployment completed!"
