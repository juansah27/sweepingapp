#!/bin/bash

# SSL Setup Script for SweepingApps
# Usage: ./setup-ssl.sh <domain-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Usage: $0 <domain-name>"
    print_status "Example: $0 yourdomain.com"
    exit 1
fi

DOMAIN=$1
APP_DIR="/opt/sweepingapps"

print_status "Setting up SSL for domain: $DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root or with sudo"
    exit 1
fi

# Install Certbot
print_status "Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    apt update
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot installed"
else
    print_warning "Certbot already installed"
fi

# Update Nginx configuration for domain
print_status "Updating Nginx configuration for domain..."
cat > /etc/nginx/sites-available/sweepingapps << EOF
server {
    listen 80;
    server_name $DOMAIN;

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

# Test Nginx configuration
nginx -t
systemctl reload nginx
print_success "Nginx configuration updated"

# Obtain SSL certificate
print_status "Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Setup auto-renewal
print_status "Setting up auto-renewal..."
crontab -l 2>/dev/null | grep -v certbot || true > /tmp/crontab_backup
echo "0 12 * * * /usr/bin/certbot renew --quiet" >> /tmp/crontab_backup
crontab /tmp/crontab_backup
rm /tmp/crontab_backup

print_success "SSL setup completed!"
echo ""
echo "🔐 SSL Configuration Summary:"
echo "  Domain: $DOMAIN"
echo "  Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "  Auto-renewal: Enabled"
echo ""
echo "🌐 Access URLs:"
echo "  HTTPS: https://$DOMAIN"
echo "  HTTP: http://$DOMAIN (redirects to HTTPS)"
echo ""
echo "📋 SSL Management Commands:"
echo "  Test renewal: certbot renew --dry-run"
echo "  Check status: certbot certificates"
echo "  Manual renewal: certbot renew"
echo ""
print_success "SSL setup completed successfully!"
