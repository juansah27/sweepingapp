#!/bin/bash
# Setup HTTPS for Sweeping Apps with Self-Signed Certificate
# For internal network use (IP-based access)

set -e

echo "🔒 Setting up HTTPS for Sweeping Apps..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Create SSL directory
echo "📁 Creating SSL directory..."
mkdir -p ssl

# Get server IP
echo "🔍 Detecting server IP..."
SERVER_IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}✅ Server IP: $SERVER_IP${NC}"
echo ""

# Generate self-signed certificate
echo "🔐 Generating self-signed SSL certificate..."
echo ""
echo -e "${YELLOW}Note: Self-signed certificates will show browser warning on first visit.${NC}"
echo -e "${YELLOW}Users need to click 'Advanced' > 'Proceed anyway' once.${NC}"
echo ""

sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/privkey.pem \
  -out ssl/fullchain.pem \
  -subj "/C=ID/ST=Jakarta/L=Jakarta/O=SweepingApps/OU=IT/CN=$SERVER_IP" \
  2>/dev/null

# Set permissions
sudo chown -R $USER:$USER ssl
chmod 644 ssl/fullchain.pem
chmod 600 ssl/privkey.pem

echo -e "${GREEN}✅ SSL certificate generated!${NC}"
echo "   Certificate: ssl/fullchain.pem"
echo "   Private Key: ssl/privkey.pem"
echo "   Valid for: 365 days"
echo ""

# Update nginx.conf to support both HTTP and HTTPS
echo "🔧 Updating nginx.conf for HTTPS..."
cat > nginx.conf << 'NGINX_EOF'
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /tmp/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # HTTP Server (redirect to HTTPS)
    server {
        listen 80;
        server_name _;
        
        # Redirect to HTTPS
        return 301 https://$host$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name _;
        root /usr/share/nginx/html;
        index index.html index.htm;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Additional security headers for HTTPS
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Handle React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # API proxy to backend
        location /api/ {
            proxy_pass http://backend:8001/api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Proxy for non-/api backend endpoints
        location ~ ^/(orders|refresh-interface-status|marketplace-status|brand-accounts)/ {
            proxy_pass http://backend:8001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 30s;
            proxy_send_timeout 30s;
            proxy_read_timeout 30s;
        }

        # Static assets caching
        location ~* \.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # JavaScript and CSS files - moderate cache for production
        location ~* \.(js|css)$ {
            expires 1d;
            add_header Cache-Control "public, max-age=86400";
            try_files $uri =404;
        }

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Error pages
        error_page 404 /index.html;
        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
}
NGINX_EOF

echo -e "${GREEN}✅ nginx.conf updated with HTTPS support!${NC}"
echo ""

# Update docker-compose.yml to mount SSL certificates
echo "🔧 Updating Dockerfile.frontend for SSL..."
if [ -f "Dockerfile.frontend" ]; then
    echo "   Dockerfile.frontend exists, will mount SSL via docker-compose"
fi

echo ""
echo -e "${GREEN}✅ HTTPS Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Update docker-compose.yml frontend service with SSL volume mount"
echo "   2. Restart frontend container"
echo "   3. Open firewall for port 443"
echo "   4. Access via HTTPS"
echo ""
echo "🔥 Quick Commands:"
echo ""
echo "# Update docker-compose (already prepared in script below)"
echo "# Just run the docker commands:"
echo ""
echo "docker compose down"
echo "docker compose up --build -d"
echo ""
echo "# Open firewall"
echo "sudo ufw allow 443/tcp"
echo ""
echo "# Access application"
echo "https://$SERVER_IP"
echo ""
echo -e "${YELLOW}⚠️  Browser will show security warning (self-signed cert)${NC}"
echo -e "${YELLOW}   Click 'Advanced' > 'Proceed to $SERVER_IP (unsafe)' - Safe for internal network${NC}"
echo ""

