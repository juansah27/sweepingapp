#!/bin/bash

# Colors
RED='\033[0;91m'
GREEN='\033[0;92m'
YELLOW='\033[0;93m'
BLUE='\033[0;94m'
MAGENTA='\033[0;95m'
CYAN='\033[0;96m'
WHITE='\033[0;97m'
RESET='\033[0m'

# Set terminal title
echo -ne "\033]0;Sweeping Apps - Universal Startup Script\007"

clear
echo -e "${CYAN}========================================"
echo -e "   SWEEPING APPS - UNIVERSAL STARTUP"
echo -e "========================================${RESET}"
echo

while true; do
    echo -e "${WHITE}Choose startup option:${RESET}"
    echo
    echo -e "${GREEN}1.${RESET} ${WHITE}Full Startup (Recommended) - All services with cross-device access${RESET}"
    echo -e "${GREEN}2.${RESET} ${WHITE}Backend Only - Start backend server only${RESET}"
    echo -e "${GREEN}3.${RESET} ${WHITE}Frontend Only - Start frontend server only${RESET}"
    echo -e "${GREEN}4.${RESET} ${WHITE}Setup Firewall - Configure Linux firewall for cross-device access${RESET}"
    echo -e "${GREEN}5.${RESET} ${WHITE}Stop All Services - Stop all running services${RESET}"
    echo -e "${GREEN}6.${RESET} ${WHITE}Exit${RESET}"
    echo

    read -p "Enter your choice (1-6): " choice

    case $choice in
        1) full_startup ;;
        2) backend_only ;;
        3) frontend_only ;;
        4) setup_firewall ;;
        5) stop_all ;;
        6) exit_script ;;
        *) echo && echo -e "${RED}❌ Invalid choice. Please enter 1-6.${RESET}" && echo ;;
    esac
done

# Full startup function
full_startup() {
    echo
    echo -e "${BLUE}🚀 Starting Full Sweeping Apps Setup...${RESET}"
    echo

    # Check if Python is installed
    if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
        echo -e "${RED}❌ Python is not installed or not in PATH${RESET}"
        echo "Please install Python 3.8+ and try again"
        read -p "Press Enter to continue..."
        return 1
    fi

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed or not in PATH${RESET}"
        echo "Please install Node.js 16+ and try again"
        read -p "Press Enter to continue..."
        return 1
    fi

    # Detect network IP dynamically
    echo -e "${YELLOW}🔍 Detecting network IP address...${RESET}"
    DETECTED_IP=""
    
    # Try different methods to get IP
    DETECTED_IP=$(hostname -I | awk '{print $1}' | grep -E '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)')
    
    if [ -z "$DETECTED_IP" ]; then
        DETECTED_IP=$(ip route get 1 | awk '{print $7}' | head -1)
    fi
    
    if [ -z "$DETECTED_IP" ] || [ "$DETECTED_IP" = "127.0.0.1" ]; then
        echo -e "${RED}❌ Could not detect network IP address${RESET}"
        echo -e "${YELLOW}⚠️ Please check your network connection${RESET}"
        echo -e "${YELLOW}⚠️ Using localhost as fallback${RESET}"
        DETECTED_IP="localhost"
    else
        echo -e "${GREEN}✅ Detected network IP: $DETECTED_IP${RESET}"
    fi

    echo
    echo -e "${BLUE}📋 Configuration:${RESET}"
    echo -e "${WHITE}   Frontend: http://$DETECTED_IP:3001${RESET}"
    echo -e "${WHITE}   Backend:  http://$DETECTED_IP:8001${RESET}"
    echo -e "${WHITE}   Database: PostgreSQL on port 5432${RESET}"
    echo

    # Update .env files with detected IP
    echo -e "${YELLOW}🔧 Updating environment files...${RESET}"

    # Frontend .env
    cat > frontend/.env << EOF
# Frontend Environment Configuration
REACT_APP_API_URL=http://$DETECTED_IP:8001
REACT_APP_FRONTEND_URL=http://$DETECTED_IP:3001
GENERATE_SOURCEMAP=false
PORT=3001
HOST=0.0.0.0
EOF

    echo -e "${GREEN}✅ Frontend .env updated${RESET}"

    # Backend .env
    if [ -f ".env" ]; then
        echo -e "${YELLOW}🔧 Updating backend .env...${RESET}"
        sed -i "s/ALLOWED_ORIGINS=.*/ALLOWED_ORIGINS=*/" .env
        echo -e "${GREEN}✅ Backend .env updated${RESET}"
    else
        echo -e "${YELLOW}📝 Creating backend .env...${RESET}"
        cat > .env << EOF
# Backend Environment Configuration
ALLOWED_ORIGINS=*
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=sweeping_apps
POSTGRES_USER=sweeping_user
POSTGRES_PASSWORD=sweeping_password
DB_SERVER=10.6.13.33,1433
DB_NAME=Flexo_db
DB_USERNAME=fservice
DB_PASSWORD=SophieHappy33
EOF
        echo -e "${GREEN}✅ Backend .env created${RESET}"
    fi

    # Update package.json proxy (if exists)
    if [ -f "frontend/package.json" ]; then
        echo -e "${YELLOW}🔧 Updating package.json proxy...${RESET}"
        sed -i "s|\"proxy\":[^,]*|\"proxy\": \"http://$DETECTED_IP:8001\"|" frontend/package.json
        echo -e "${GREEN}✅ Package.json proxy updated to: http://$DETECTED_IP:8001${RESET}"
    fi

    # Kill existing processes
    echo -e "${YELLOW}🔄 Stopping existing processes...${RESET}"
    pkill -f python >/dev/null 2>&1
    pkill -f node >/dev/null 2>&1

    # Start PostgreSQL
    echo -e "${YELLOW}🐘 Starting PostgreSQL...${RESET}"
    nohup docker-compose up postgres > docker-compose.log 2>&1 &
    sleep 5

    # Start Backend
    echo -e "${YELLOW}🚀 Starting Backend (Port 8001)...${RESET}"
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt >/dev/null 2>&1
    nohup python main.py > ../backend.log 2>&1 &
    cd ..

    sleep 3

    # Start Frontend
    echo -e "${YELLOW}🌐 Starting Frontend (Port 3001)...${RESET}"
    cd frontend
    nohup npm start > ../frontend.log 2>&1 &
    cd ..

    echo
    echo -e "${GREEN}✅ All services started!${RESET}"
    echo
    echo -e "${CYAN}🌐 Access URLs:${RESET}"
    echo -e "${WHITE}   Local:     http://localhost:3001${RESET}"
    echo -e "${WHITE}   Network:   http://$DETECTED_IP:3001${RESET}"
    echo
    echo -e "${BLUE}🔑 Login Credentials:${RESET}"
    echo -e "${WHITE}   Username: ibnu${RESET}"
    echo -e "${WHITE}   Password: Ibnu123456${RESET}"
    echo
    echo -e "${YELLOW}📱 For other devices on the same network:${RESET}"
    echo -e "${WHITE}   Use: http://$DETECTED_IP:3001${RESET}"
    echo
    echo -e "${MAGENTA}💡 Note: Make sure to run option 4 (Setup Firewall)${RESET}"
    echo -e "${MAGENTA}   if you haven't already!${RESET}"
    echo

    read -p "Press Enter to continue..."
}

# Backend only function
backend_only() {
    echo
    echo -e "${BLUE}🚀 Starting Backend Server Only...${RESET}"
    echo

    PROJECT_DIR=$(pwd)
    cd backend

    if [ ! -d "venv" ]; then
        echo -e "${RED}❌ Virtual environment not found${RESET}"
        echo -e "${YELLOW}Creating virtual environment...${RESET}"
        python3 -m venv venv
    fi

    echo -e "${YELLOW}📦 Activating virtual environment...${RESET}"
    source venv/bin/activate

    echo -e "${YELLOW}📦 Checking dependencies...${RESET}"
    pip install -r requirements.txt >/dev/null 2>&1

    echo -e "${GREEN}🚀 Starting FastAPI backend...${RESET}"
    echo -e "${BLUE}Backend will be accessible at: http://$DETECTED_IP:8001${RESET}"
    echo

    python main.py

    echo
    echo -e "${YELLOW}⚠️ Backend stopped. Press Enter to exit...${RESET}"
    read -p ""
}

# Frontend only function
frontend_only() {
    echo
    echo -e "${BLUE}🚀 Starting Frontend Server Only...${RESET}"
    echo

    PROJECT_DIR=$(pwd)
    cd frontend

    # Detect IP for frontend-only mode
    echo -e "${YELLOW}🔍 Detecting network IP for frontend...${RESET}"
    FRONTEND_IP=$(hostname -I | awk '{print $1}' | grep -E '^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)')
    
    if [ -z "$FRONTEND_IP" ]; then
        FRONTEND_IP=$(ip route get 1 | awk '{print $7}' | head -1)
    fi
    
    if [ -z "$FRONTEND_IP" ] || [ "$FRONTEND_IP" = "127.0.0.1" ]; then
        FRONTEND_IP="localhost"
        echo -e "${YELLOW}⚠️ Using localhost as fallback${RESET}"
    else
        echo -e "${GREEN}✅ Detected IP: $FRONTEND_IP${RESET}"
    fi

    # Create .env file with detected IP
    echo -e "${YELLOW}📝 Creating .env file with detected IP...${RESET}"
    cat > .env << EOF
# Frontend Environment Configuration
REACT_APP_API_URL=http://$FRONTEND_IP:8001
REACT_APP_FRONTEND_URL=http://$FRONTEND_IP:3001
GENERATE_SOURCEMAP=false
PORT=3001
HOST=0.0.0.0
BROWSER=none
EOF

    echo -e "${GREEN}✅ .env file created with IP: $FRONTEND_IP${RESET}"

    # Update package.json proxy (if exists)
    if [ -f "package.json" ]; then
        echo -e "${YELLOW}🔧 Updating package.json proxy...${RESET}"
        sed -i "s|\"proxy\":[^,]*|\"proxy\": \"http://$FRONTEND_IP:8001\"|" package.json
        echo -e "${GREEN}✅ Package.json proxy updated${RESET}"
    fi

    echo
    echo -e "${GREEN}🚀 Starting React development server...${RESET}"
    echo -e "${BLUE}This will use the detected IP: $FRONTEND_IP${RESET}"
    echo

    npm start

    echo
    echo -e "${YELLOW}⚠️ Frontend stopped. Press Enter to exit...${RESET}"
    read -p ""
}

# Setup firewall function
setup_firewall() {
    echo
    echo -e "${BLUE}🔧 Setting up Linux Firewall...${RESET}"
    echo
    echo "This script will add firewall rules for:"
    echo "- Frontend: Port 3001"
    echo "- Backend: Port 8001"
    echo "- PostgreSQL: Port 5432"
    echo

    # Check for ufw or iptables
    if command -v ufw &> /dev/null; then
        echo "Using UFW (Uncomplicated Firewall)..."
        
        # Frontend port 3001
        if sudo ufw allow 3001; then
            echo -e "${GREEN}✅ Frontend port 3001 rule added${RESET}"
        else
            echo -e "${RED}❌ Failed to add frontend port 3001 rule${RESET}"
        fi
        
        # Backend port 8001
        if sudo ufw allow 8001; then
            echo -e "${GREEN}✅ Backend port 8001 rule added${RESET}"
        else
            echo -e "${RED}❌ Failed to add backend port 8001 rule${RESET}"
        fi
        
        # PostgreSQL port 5432
        if sudo ufw allow 5432; then
            echo -e "${GREEN}✅ PostgreSQL port 5432 rule added${RESET}"
        else
            echo -e "${RED}❌ Failed to add PostgreSQL port 5432 rule${RESET}"
        fi
    elif command -v iptables &> /dev/null; then
        echo "Using iptables..."
        
        # Add iptables rules (requires sudo)
        sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 8001 -j ACCEPT
        sudo iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
        
        echo -e "${GREEN}✅ iptables rules added${RESET}"
    else
        echo -e "${RED}❌ No firewall management tool found (ufw or iptables)${RESET}"
    fi

    echo
    echo -e "${GREEN}✅ Firewall setup complete!${RESET}"
    echo

    # Detect current IP for URLs
    echo -e "${YELLOW}🔍 Detecting current IP for URLs...${RESET}"
    FIREWALL_IP=$(hostname -I | awk '{print $1}')
    
    if [ -z "$FIREWALL_IP" ] || [ "$FIREWALL_IP" = "127.0.0.1" ]; then
        FIREWALL_IP="localhost"
    fi

    echo "New URLs for cross-device access:"
    echo "- Frontend: http://$FIREWALL_IP:3001"
    echo "- Backend: http://$FIREWALL_IP:8001"
    echo

    read -p "Press Enter to continue..."
}

# Stop all services function
stop_all() {
    echo
    echo -e "${BLUE}🛑 Stopping all services...${RESET}"
    echo

    # Stop Python processes
    echo -e "${YELLOW}🔄 Stopping Python processes...${RESET}"
    pkill -f python >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Python processes stopped${RESET}"
    else
        echo -e "${YELLOW}⚠️ No Python processes found${RESET}"
    fi

    # Stop Node.js processes
    echo -e "${YELLOW}🔄 Stopping Node.js processes...${RESET}"
    pkill -f node >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Node.js processes stopped${RESET}"
    else
        echo -e "${YELLOW}⚠️ No Node.js processes found${RESET}"
    fi

    # Stop Docker containers
    echo -e "${YELLOW}🔄 Stopping Docker containers...${RESET}"
    docker-compose down >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Docker containers stopped${RESET}"
    else
        echo -e "${YELLOW}⚠️ No Docker containers found${RESET}"
    fi

    echo
    echo -e "${GREEN}✅ All services stopped!${RESET}"
    echo

    read -p "Press Enter to continue..."
}

# Exit function
exit_script() {
    echo
    echo -e "${GREEN}👋 Thank you for using Sweeping Apps!${RESET}"
    echo
    exit 0
}
