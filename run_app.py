#!/usr/bin/env python3
"""
Application Runner Script
Starts the SweepingApps application with proper configuration.
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path

def check_requirements():
    """Check if required files exist"""
    required_files = [
        '.env',
        'backend/main.py',
        'frontend/package.json'
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    # Check Python dependencies
    try:
        import fastapi
        import sqlalchemy
        import pandas
        import psycopg2
        import pyodbc
        print("✅ Python dependencies OK")
    except ImportError as e:
        print(f"❌ Missing Python dependency: {e}")
        return False
    
    # Check Node.js dependencies
    frontend_path = Path("frontend")
    if frontend_path.exists():
        try:
            result = subprocess.run(
                ["npm", "list", "--depth=0"],
                cwd=frontend_path,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print("✅ Node.js dependencies OK")
            else:
                print("⚠️  Node.js dependencies may need installation")
                print("💡 Run: cd frontend && npm install")
        except FileNotFoundError:
            print("❌ npm not found. Please install Node.js")
            return False
    
    return True

def start_backend():
    """Start the backend server"""
    print("🔧 Starting backend server...")
    
    backend_path = Path("backend")
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return None
    
    try:
        # Start backend process
        process = subprocess.Popen(
            [sys.executable, "main.py"],
            cwd=backend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait a moment for startup
        time.sleep(3)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Backend server started")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Backend server failed to start")
            print(f"Error: {stderr.decode()}")
            return None
            
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return None

def start_frontend():
    """Start the frontend server"""
    print("🎨 Starting frontend server...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return None
    
    try:
        # Start frontend process
        process = subprocess.Popen(
            ["npm", "start"],
            cwd=frontend_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait a moment for startup
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Frontend server started")
            return process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Frontend server failed to start")
            print(f"Error: {stderr.decode()}")
            return None
            
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return None

def main():
    """Main function"""
    print("🚀 SweepingApps Application Runner")
    print("=" * 50)
    
    # Check requirements
    if not check_requirements():
        print("\n💡 Run: python setup_network.py")
        return
    
    # Check dependencies
    if not check_dependencies():
        print("\n💡 Install missing dependencies and try again")
        return
    
    print()
    
    # Start backend
    backend_process = start_backend()
    if not backend_process:
        return
    
    # Start frontend
    frontend_process = start_frontend()
    if not frontend_process:
        backend_process.terminate()
        return
    
    print("\n✅ Application started successfully!")
    print("🌐 Backend: http://localhost:8001")
    print("🎨 Frontend: http://localhost:3001")
    print("\n💡 Press Ctrl+C to stop the application")
    
    try:
        # Wait for processes
        while True:
            time.sleep(1)
            
            # Check if processes are still running
            if backend_process.poll() is not None:
                print("❌ Backend server stopped")
                break
            
            if frontend_process.poll() is not None:
                print("❌ Frontend server stopped")
                break
                
    except KeyboardInterrupt:
        print("\n🛑 Stopping application...")
        
        # Terminate processes
        if backend_process:
            backend_process.terminate()
        if frontend_process:
            frontend_process.terminate()
        
        print("✅ Application stopped")

if __name__ == "__main__":
    main()