# 🐧 Ubuntu Server Setup Guide

Panduan lengkap untuk menjalankan SweepingApps di Ubuntu Server.

## 📋 Prerequisites

### 1. System Requirements
- **OS**: Ubuntu 20.04 LTS atau lebih baru
- **RAM**: Minimal 4GB (Recommended: 8GB+)
- **Storage**: Minimal 20GB free space
- **CPU**: 2 cores minimum

### 2. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

## 🐳 Install Docker & Docker Compose

### 1. Install Docker
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc -y

# Install prerequisites
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release -y

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional, untuk menghindari sudo)
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Install Docker Compose (Standalone)
```bash
# Download latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## 📁 Clone & Setup Application

### 1. Clone Repository
```bash
# Clone aplikasi
git clone <repository-url> sweepingapps
cd sweepingapps

# Atau jika menggunakan file transfer
# Upload folder aplikasi ke server menggunakan SCP/SFTP
```

### 2. Setup Environment Files
```bash
# Copy environment template
cp docker.env.example docker.env

# Edit environment variables
nano docker.env
```

**Isi `docker.env` dengan konfigurasi server:**
```env
# Database Configuration
POSTGRES_DB=sweepingapps
POSTGRES_USER=sweepingapps_user
POSTGRES_PASSWORD=your_secure_password_here

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# Application Configuration
SECRET_KEY=your_secret_key_here
DEBUG=False
ENVIRONMENT=production

# Server Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8001
FRONTEND_PORT=3000

# Network Configuration (sesuaikan dengan IP server)
BACKEND_URL=http://your-server-ip:8001
FRONTEND_URL=http://your-server-ip:3000

# Marketplace Apps Control
MARKETPLACE_APPS_ENABLED=false
AUTO_RUN_MARKETPLACE_APPS=false
```

### 3. Setup Network Configuration
```bash
# Edit network config
nano network_config.env
```

**Isi `network_config.env`:**
```env
# Server IP Configuration
SERVER_IP=your-server-ip
BACKEND_PORT=8001
FRONTEND_PORT=3000
```

## 🔧 Configure Firewall

### 1. Setup UFW Firewall
```bash
# Install UFW
sudo apt install ufw -y

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow application ports
sudo ufw allow 3000  # Frontend
sudo ufw allow 8001  # Backend

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Alternative: Configure iptables
```bash
# Allow necessary ports
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT    # SSH
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT    # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT   # HTTPS
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT  # Frontend
sudo iptables -A INPUT -p tcp --dport 8001 -j ACCEPT  # Backend

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

## 🚀 Deploy Application

### 1. Build and Start Services
```bash
# Build and start all services
docker-compose up --build -d

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f
```

### 2. Initialize Database
```bash
# Wait for database to be ready
sleep 30

# Run database initialization
docker-compose exec backend python -c "
from database_config import engine
from sqlalchemy import text
import time

# Wait for database connection
max_retries = 30
for i in range(max_retries):
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        print('Database connected successfully!')
        break
    except Exception as e:
        print(f'Attempt {i+1}: Database not ready yet...')
        time.sleep(2)
else:
    print('Failed to connect to database after 30 attempts')
"

# Create database views and initial data
docker-compose exec backend python -c "
from database_config import engine
from sqlalchemy import text

# Create views
views_sql = '''
-- Create clean_orders view
CREATE OR REPLACE VIEW clean_orders AS
SELECT DISTINCT ON (\"OrderNumber\") 
    \"Id\", \"Marketplace\", \"Brand\", \"OrderNumber\", \"OrderStatus\", \"AWB\", \"Transporter\", 
    \"OrderDate\", \"SLA\", \"Batch\", \"PIC\", \"UploadDate\", \"Remarks\", \"InterfaceStatus\", \"TaskId\", 
    \"OrderNumberFlexo\", \"OrderStatusFlexo\"
FROM uploaded_orders
ORDER BY \"OrderNumber\", \"UploadDate\" DESC;

-- Create dashboard views
CREATE OR REPLACE VIEW dashboard_not_interfaced_orders AS
SELECT 
    \"Id\" as id,
    \"Marketplace\" as marketplace,
    \"Brand\" as brand,
    CASE 
        WHEN \"OrderNumberFlexo\" IS NOT NULL AND \"OrderNumberFlexo\" != '' 
        THEN \"OrderNumberFlexo\" 
        ELSE \"OrderNumber\" 
    END as order_number,
    \"OrderStatus\" as order_status,
    \"AWB\" as awb,
    \"Transporter\" as transporter,
    \"OrderDate\" as order_date,
    \"SLA\" as sla,
    \"Batch\" as batch,
    \"PIC\" as pic,
    \"UploadDate\" as upload_date,
    \"Remarks\" as remark,
    \"InterfaceStatus\" as interface_status,
    \"TaskId\" as task_id,
    \"OrderNumberFlexo\" as order_number_flexo,
    \"OrderStatusFlexo\" as order_status_flexo
FROM uploaded_orders
WHERE \"InterfaceStatus\" != 'Interface'
ORDER BY \"UploadDate\" DESC;
'''

with engine.connect() as conn:
    conn.execute(text(views_sql))
    conn.commit()
    print('Database views created successfully!')
"
```

## 🌐 Configure Nginx (Optional but Recommended)

### 1. Install Nginx
```bash
sudo apt install nginx -y
```

### 2. Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/sweepingapps
```

**Isi konfigurasi Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com your-server-ip;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Other backend endpoints
    location ~ ^/(orders|refresh-interface-status|marketplace-status|brand-accounts)/ {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Enable Site
```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/sweepingapps /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔐 Setup SSL with Let's Encrypt (Optional)

### 1. Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obtain SSL Certificate
```bash
# Replace your-domain.com with your actual domain
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Maintenance

### 1. Check Application Status
```bash
# Check containers
docker-compose ps

# Check logs
docker-compose logs -f

# Check specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 2. Backup Database
```bash
# Create backup script
nano backup_db.sh
```

**Isi `backup_db.sh`:**
```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U sweepingapps_user sweepingapps > $BACKUP_DIR/sweepingapps_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "sweepingapps_*.sql" -mtime +7 -delete

echo "Backup completed: sweepingapps_$DATE.sql"
```

```bash
# Make executable
chmod +x backup_db.sh

# Add to crontab for daily backup
crontab -e
# Add this line:
# 0 2 * * * /home/ubuntu/sweepingapps/backup_db.sh
```

### 3. Update Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d

# Clean up old images
docker image prune -f
```

## 🔧 Troubleshooting

### 1. Common Issues

**Port Already in Use:**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :8001
sudo netstat -tulpn | grep :3000

# Kill process if needed
sudo kill -9 <PID>
```

**Database Connection Issues:**
```bash
# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Check database status
docker-compose exec postgres pg_isready -U sweepingapps_user
```

**Memory Issues:**
```bash
# Check memory usage
free -h
docker stats

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 2. Performance Optimization

**Increase Docker Resources:**
```bash
# Edit Docker daemon config
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

**Restart Docker:**
```bash
sudo systemctl restart docker
```

## 🌍 Access Application

### 1. Local Access
```bash
# Frontend
http://your-server-ip:3000

# Backend API
http://your-server-ip:8001/api/

# Direct access (if Nginx configured)
http://your-domain.com
```

### 2. Create Admin User
```bash
# Access application and register admin user through UI
# Or use API:
curl -X POST http://your-server-ip:8001/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@yourcompany.com",
    "password": "your_secure_password",
    "role": "superuser"
  }'
```

## 📝 Post-Deployment Checklist

- [ ] All containers running (`docker-compose ps`)
- [ ] Database initialized and views created
- [ ] Application accessible via browser
- [ ] Admin user created
- [ ] Firewall configured
- [ ] Nginx configured (optional)
- [ ] SSL certificate installed (optional)
- [ ] Backup script configured
- [ ] Monitoring setup

## 🆘 Support

Jika mengalami masalah:
1. Check logs: `docker-compose logs -f`
2. Verify configuration files
3. Check firewall settings
4. Ensure ports are available
5. Verify database connectivity

---

**🎉 Selamat! Aplikasi SweepingApps sudah berhasil di-deploy di Ubuntu Server!**
