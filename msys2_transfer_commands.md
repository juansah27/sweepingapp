# MSYS2 Transfer Commands untuk SweepingApps

## 🔧 Setup MSYS2

### Install MSYS2
1. Download dari https://www.msys2.org/
2. Install dan restart MSYS2
3. Buka MSYS2 UCRT64 environment

### Install Required Tools
```bash
# Update MSYS2 first
pacman -Syu

# Install essential tools
pacman -S openssh rsync git curl tar gzip
```

## 🚀 Transfer Commands

### Method 1: RSYNC (Recommended)
```bash
# Navigate to project directory
cd /c/Users/Ladyqiu/Documents/Juan/SweepingApps

# Basic transfer - exclude unnecessary files
rsync -avz --progress \
    --exclude='node_modules/' \
    --exclude='venv/' \
    --exclude='__pycache__/' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='logs/' \
    --exclude='.git/' \
    ./ \
    user@linux-server-ip:/home/user/sweepingapps/
```

### Method 2: SCP Transfer
```bash
# Transfer individual folder
scp -r backend/ user@linux-server:/home/user/sweepingapps/
scp -r frontend/ user@linux-server:/home/user/sweepingapps/

# Transfer config files
scp docker-compose.yml docker.env Dockerfile.* user@linux-server:/home/user/sweepingapps/
scp backend/requirements.txt user@linux-server:/home/user/sweepingapps/backend/
```

### Method 3: Archive Transfer
```bash
# Create compressed archive
tar -czf sweepingapps.tar.gz \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    .

# Transfer archive
scp sweepingapps.tar.gz user@linux-server:/home/user/

# Extract on Linux (via SSH)
ssh user@linux-server "cd /home/user && tar -xzf sweepingapps.tar.gz -C /home/user/sweepingapps/"
```

## 🐧 Linux Server Setup (After Transfer)

### Quick Setup Commands
```bash
# 1. Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install python3 python3-pip python3-venv nodejs npm docker docker-compose git postgresql

# 2. Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. Create database
sudo -u postgres psql << EOF
CREATE DATABASE sweeping_apps;
CREATE USER sweeping_user WITH PASSWORD 'sweeping_password';
GRANT ALL PRIVILEGES ON DATABASE sweeping_apps TO sweeping_user;
\q
EOF

# 4. Setup backend
cd ~/sweepingapps/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 5. Setup frontend  
cd ../frontend
npm install

# 6. Configure environment
cat > ../.env << EOF
PRODUCTION=true
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sweeping_apps
POSTGRES_USER=sweeping_user
POSTGRES_PASSWORD=sweeping_password
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=*
WORKERS=4
EOF

cat > frontend/.env << EOF
REACT_APP_API_URL=http://$(hostname -I | awk '{print $1}'):8001
REACT_APP_FRONTEND_URL=http://$(hostname -I | awk '{print $1}'):3001
GENERATE_SOURCEMAP=false
PORT=3001
HOST=0.0.0.0
EOF
```

## 🚀 Start Services

### Manual Start
```bash
# Terminal 1: Database
sudo systemctl start postgresql

# Terminal 2: Backend
cd ~/sweepingapps/backend
source venv/bin/activate
python main.py &

# Terminal 3: Frontend  
cd ../frontend
npm start &
```

### Docker Start (Alternative)
```bash
cd ~/sweepingapps
sudo docker-compose up -d
```

## ✅ Testing

### Check Services
```bash
# Test backend API
curl http://localhost:8001/health

# Test frontend
curl http://localhost:3001

# Test from external machine
curl http://server-ip:8001/health
curl http://server-ip:3001
```

### Access URLs
- Frontend: http://server-ip:3001
- Backend: http://server-ip:8001 
- Login: ibnu / Ibnu123456

## 🔍 Troubleshooting

### Common Issues
```bash
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub

# Check file permissions
ssh user@server "ls -la ~/sweepingapps/"

# Check service status
ssh user@server "sudo systemctl status postgresql"

# Check ports
ssh user@server "sudo netstat -tulpn | grep :3001"
ssh user@server "sudo netstat -tulpn | grep :8001"
```
