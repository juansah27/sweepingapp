#!/usr/bin/env python3
"""
Network Configuration Setup Script
This script helps configure the application for different network environments.
"""

import os
import socket
import subprocess
import sys

def get_local_ip():
    """Get the local IP address of the machine"""
    try:
        # Connect to a remote server to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception:
        return "127.0.0.1"

def get_network_info():
    """Get network information"""
    local_ip = get_local_ip()
    
    print("🌐 Network Configuration Setup")
    print("=" * 50)
    print(f"Local IP Address: {local_ip}")
    print()
    
    # Get user input
    print("Please provide the following information:")
    print()
    
    # Database configuration
    db_server = input(f"SQL Server IP (default: 10.6.13.33,1433): ").strip()
    if not db_server:
        db_server = "10.6.13.33,1433"
    
    db_username = input(f"SQL Server Username (default: fservice): ").strip()
    if not db_username:
        db_username = "fservice"
    
    db_password = input(f"SQL Server Password (default: SophieHappy33): ").strip()
    if not db_password:
        db_password = "SophieHappy33"
    
    # PostgreSQL configuration
    postgres_host = input(f"PostgreSQL Host (default: localhost): ").strip()
    if not postgres_host:
        postgres_host = "localhost"
    
    postgres_user = input(f"PostgreSQL Username (default: sweeping_user): ").strip()
    if not postgres_user:
        postgres_user = "sweeping_user"
    
    postgres_password = input(f"PostgreSQL Password (default: sweeping_password): ").strip()
    if not postgres_password:
        postgres_password = "sweeping_password"
    
    # Network configuration
    backend_port = input(f"Backend Port (default: 8001): ").strip()
    if not backend_port:
        backend_port = "8001"
    
    frontend_port = input(f"Frontend Port (default: 3001): ").strip()
    if not frontend_port:
        frontend_port = "3001"
    
    # CORS configuration
    print()
    print("CORS Configuration:")
    print("1. Allow all origins (*) - for development")
    print("2. Specify exact origins - for production")
    cors_choice = input("Choose option (1 or 2, default: 1): ").strip()
    
    if cors_choice == "2":
        cors_origins = input("Enter allowed origins (comma-separated): ").strip()
        if not cors_origins:
            cors_origins = "*"
    else:
        cors_origins = "*"
    
    return {
        'db_server': db_server,
        'db_username': db_username,
        'db_password': db_password,
        'postgres_host': postgres_host,
        'postgres_user': postgres_user,
        'postgres_password': postgres_password,
        'backend_port': backend_port,
        'frontend_port': frontend_port,
        'cors_origins': cors_origins,
        'local_ip': local_ip
    }

def create_env_file(config):
    """Create .env file with the configuration"""
    env_content = f"""# Database Configuration
POSTGRES_DB=sweeping_apps
POSTGRES_USER={config['postgres_user']}
POSTGRES_PASSWORD={config['postgres_password']}
POSTGRES_HOST={config['postgres_host']}
POSTGRES_PORT=5432

# Backend Configuration
SECRET_KEY=your-secret-key-change-this-in-production

# SQL Server Configuration (External Database)
DB_SERVER={config['db_server']}
DB_NAME=Flexo_db
DB_USERNAME={config['db_username']}
DB_PASSWORD={config['db_password']}
DB_TRUSTED_CONNECTION=no

# Application Configuration
AUTO_RUN_MARKETPLACE_APPS=false

# Network Configuration (for cross-device access)
FRONTEND_PORT={config['frontend_port']}
BACKEND_PORT={config['backend_port']}
POSTGRES_PORT=5432

# CORS Configuration
ALLOWED_ORIGINS={config['cors_origins']}

# Timezone Configuration
DEFAULT_TIMEZONE=Asia/Jakarta
"""
    
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("✅ .env file created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def test_database_connection(config):
    """Test database connections"""
    print("\n🔍 Testing database connections...")
    
    # Test PostgreSQL connection
    try:
        import psycopg2
        conn = psycopg2.connect(
            host=config['postgres_host'],
            port=5432,
            database='sweeping_apps',
            user=config['postgres_user'],
            password=config['postgres_password']
        )
        conn.close()
        print("✅ PostgreSQL connection successful!")
    except Exception as e:
        print(f"❌ PostgreSQL connection failed: {e}")
    
    # Test SQL Server connection
    try:
        import pyodbc
        conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={config['db_server']};DATABASE=Flexo_Db;UID={config['db_username']};PWD={config['db_password']};TrustServerCertificate=yes;Connection Timeout=30;"
        conn = pyodbc.connect(conn_str)
        conn.close()
        print("✅ SQL Server connection successful!")
    except Exception as e:
        print(f"❌ SQL Server connection failed: {e}")

def main():
    """Main function"""
    print("🚀 SweepingApps Network Configuration Setup")
    print("=" * 50)
    
    # Check if .env already exists
    if os.path.exists('.env'):
        overwrite = input("⚠️  .env file already exists. Overwrite? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("❌ Setup cancelled.")
            return
    
    # Get network configuration
    config = get_network_info()
    
    # Create .env file
    if create_env_file(config):
        print(f"\n📋 Configuration Summary:")
        print(f"   Local IP: {config['local_ip']}")
        print(f"   Backend Port: {config['backend_port']}")
        print(f"   Frontend Port: {config['frontend_port']}")
        print(f"   SQL Server: {config['db_server']}")
        print(f"   PostgreSQL: {config['postgres_host']}:5432")
        print(f"   CORS Origins: {config['cors_origins']}")
        
        # Test connections
        test_database_connection(config)
        
        print(f"\n🎉 Setup complete!")
        print(f"   Backend URL: http://{config['local_ip']}:{config['backend_port']}")
        print(f"   Frontend URL: http://{config['local_ip']}:{config['frontend_port']}")
        print(f"\n💡 Next steps:")
        print(f"   1. Start PostgreSQL database")
        print(f"   2. Run: python backend/main.py")
        print(f"   3. Run: npm start (in frontend directory)")
    else:
        print("❌ Setup failed!")

if __name__ == "__main__":
    main()
