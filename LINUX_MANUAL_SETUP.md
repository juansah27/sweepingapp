# Guide: Manual Linux Setup untuk SweepingApps

## Prerequisites & System Requirements

### 1. Install Dependencies
```bash
# Update system packages
sudo apt update

# Install Python dependencies
sudo apt install python3 python3-pip python3-venv nodejs npm docker docker-compose git

# Verify installations
python3 --version  # Should be 3.8+
node --version     # Should be 16+
npm --version
docker --version
docker-compose --version
```

### 2. Install PostgreSQL (Alternative to Docker)
```bash
# Install PostgreSQL server
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

Dalam psql:
```sql
CREATE DATABASE sweeping_apps;
CREATE USER sweeping_user WITH PASSWORD 'sweeping_password';
GRANT ALL PRIVILEGES ON DATABASE sweeping_apps TO sweeping_user;
\q
```

## Step-by-Step Manual Setup

### Step 1: Clone/Get Project Files
```bash
# Jika dari Git repository
git clone <repository-url>
cd SweepingApps

# Atau jika sudah ada direktori
cd /path/to/SweepingApps
```

### Step 2: Database Setup

#### Option A: Using Docker (Recommended)
```bash
# Start PostgreSQL via Docker
cd /path/to/SweepingApps
docker-compose up postgres -d
```

#### Option B: Using Native PostgreSQL
```bash
# Create (.env in backend folder with postgresql connection)
# Database sudah dibut di Step Prerequisites
```

### Step 3: Backend Setup

```bash
# Navigate to backend
cd backend/

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
ALLOWED_ORIGINS=*
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sweeping_apps
POSTGRES_USER=sweeping_user
POSTGRES_PASSWORD=sweeping_password
SECRET_KEY=your-secret-key-here-$(date +%s)
EOF

# Start backend server
python main.py
```

Backend akan berjalan di: `http://localhost:8001`

### Step 4: Frontend Setup (Terminal Baru)

```bash
# Navigate to frontend (BAAH BARU/PANE/view TERPISAH)
cd /path/to/SweepingApps/frontend

# Install Node.js dependencies
npm install

# Configure environment
cat > .env << EOF
# Frontend Environment Configuration
REACT_APP_API_URL=http://localhost:8001
REACT_APP_FRONTEND_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
PORT=3001
HOST=0.0.0.0
EOF

# Start frontend development server
npm start
```

Frontend akan berjalan di: `http://localhost:3001`

## Network Access Setup (Linux)

Untuk mengakses dari device lain di jaringan, konfigurasi network access:

### 1. Ketahui IP Address
```bash
# Cari IP address server Linux
ip addr show | grep inet
# atau
hostname -I
# atau
ifconfig | grep inet
```

### 2. Update Frontend .env untuk Network
```bash
cd frontend/
# Update .env dengan IP yang sesuai
cat > .env << EOF
REACT_APP_API_URL=http://192.168.1.100:8001  # Ganti dengan IP Linux server
REACT_APP_FRONTEND_URL=http://192.168.1.100:3001
GENERATE_SOURCEMAP=false
PORT=3001
HOST=0.0.0.0
EOF
```

### 3. Update Backend CORS
Dalam backend, pastikan dalam main.py:
```python
ALLOWED_ORIGINS = "*"  # Untuk development, production sebaiknya specific IP
```

### 4. Linux Firewall Setup
```bash
# Buka ports yang diperlukan
sudo ufw allow 3001  # Frontend
sudo ufw allow 8001  # Backend
sudo ufw allow 5432  # PostgreSQL
sudo ufw allow ssh   # SSH access
sudo ufw enable
```

## Manual Startup - Tiga Terminal Sekaligus

### Terminal 1: Database
```bash
cd /path/to/SweepingApps
docker-compose up postgres
# Ctrl+C untuk stop
```

### Terminal 2: Backend
```bash
cd /path/to/SweepingApps/backend
source venv/bin/activate
python main.py
```

### Terminal 3: Frontend  
```bash
cd /path/to/SweepingApps/frontend
npm start
```

## Troubleshooting Linux

### Common Issues & Solutions

#### 1. Permission Issues
```bash
# Fix permission errors
sudo chown -R $USER:$USER /path/to/SweepingApps
chmod +x backend/main.py
```

#### 2. Python Virtual Environment
```bash
# Recreate virtual environment jika corrupted
rm -rf backend/venv
cd backend/
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 3. Node.js Modules
```bash
# Clear npm cache & reinstall
cd frontend/
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### 4. Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U sweeping_user -d sweeping_apps
# Masukkan password: sweeping_password

# Check PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

#### 5. Port Already in Use
```bash
# Find process using port
sudo lsof -i :3001
sudo lsof -i :8001
sudo lsof -i :5432

# Kill process
sudo kill -9 <PID>

# Atau ganti ports di .env files
```

#### 6. Network Access Issues
```bash
# Test port accessibility dari device lain
curl http://linux-server-ip:8001/health
curl http://linux-server-ip:3001

# Check firewall status
sudo ufw status

# Disable firewall temporarily untuk testing (CAREFUL!)
sudo ufw disable
# Test access dann enable kembali
sudo ufw enable
```

## Production Setup (Optional)

### 1. Systemd Service Files

#### Backend Service:
```bash
sudo tee /etc/systemd/system/sweeping-backend.service << EOF
[Unit]
Description=SweepingApps Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/SweepingApps/backend
Environment=PATH=/path/to/SweepingApps/backend/venv/bin
ExecStart=/path/to/SweepingApps/backend/venv/bin/python main.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable sweeping-backend
sudo systemctl start sweeping-backend
```

#### Frontend Building:
```bash
cd /path/to/SweepingApps/frontend
npm run build
# Serve static files with nginx
```

### 2. Nginx Reverse Proxy
```bash
# Install nginx
sudo apt install nginx

# Configure nginx
sudo tee /etc/nginx/sites-available/sweepingapps << EOF
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/SweepingApps/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/sweepingapps /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Quick Commands Reference

### Startup Commands:
```bash
# Quick start all services
cd /path/to/SweepingApps
docker-compose up postgres -d
cd backend && source venv/bin/activate && python main.py &
cd ../frontend && npm start &

# Stop services
pkill -f "python main.py"
pkill -f "npm start"
docker-compose down
```

### Development URLs:
- **Local Frontend**: `http://localhost:3001`
- **Local Backend**: `http://localhost:8001`
- **Network Access**: `http://your-server-ip:3001`
- **Default Login**: `ibnu` / `Ibnu123456`

### Database Credentials:
- **Host**: `localhost` (or server IP for remote)
- **Port**: `5432`
- **Database**: `sweeping_apps`
- **User**: `sweeping_user`
- **Password**: `sweeping_password`

Celebrate! 🎉 Aplikasi sekarang running di Linux system dengan manual setup.
