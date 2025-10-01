#!/bin/bash

# Script to upload SweepingApps to Ubuntu Server
# Usage: ./upload-to-server.sh <server-ip> <username>

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
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <server-ip> <username>"
    print_status "Example: $0 192.168.1.100 ubuntu"
    exit 1
fi

SERVER_IP=$1
USERNAME=$2
REMOTE_DIR="/opt/sweepingapps"

print_status "Uploading SweepingApps to $USERNAME@$SERVER_IP..."

# Create remote directory
print_status "Creating remote directory..."
ssh $USERNAME@$SERVER_IP "sudo mkdir -p $REMOTE_DIR && sudo chown $USERNAME:$USERNAME $REMOTE_DIR"

# Upload application files
print_status "Uploading application files..."
rsync -avz --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.env' \
    --exclude='docker.env' \
    --exclude='logs' \
    --exclude='backup' \
    --exclude='*.log' \
    . $USERNAME@$SERVER_IP:$REMOTE_DIR/

print_success "Files uploaded successfully"

# Set proper permissions
print_status "Setting permissions..."
ssh $USERNAME@$SERVER_IP "sudo chown -R $USERNAME:$USERNAME $REMOTE_DIR && chmod +x $REMOTE_DIR/ubuntu-deploy.sh"

print_success "Upload completed!"
echo ""
echo "🚀 Next steps:"
echo "1. SSH to your server: ssh $USERNAME@$SERVER_IP"
echo "2. Run deployment script: sudo $REMOTE_DIR/ubuntu-deploy.sh"
echo "3. Access application at: http://$SERVER_IP"
echo ""
print_warning "Make sure you have SSH access configured to your server!"
