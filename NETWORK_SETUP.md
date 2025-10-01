# 🌐 Network Configuration Setup

## Overview
This guide helps you configure the SweepingApps application for different network environments.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
python setup_network.py
```

### Option 2: Manual Setup
1. Copy `network_config.env` to `.env`
2. Update the values in `.env` file
3. Start the application

## Configuration Files

### `.env` File
The main configuration file containing:
- Database connection settings
- Network ports
- CORS origins
- Security keys

### `network_config.env`
Template file with default values for reference.

## Network Configuration

### Database Settings
```env
# SQL Server (External Database)
DB_SERVER=10.6.13.33,1433
DB_USERNAME=fservice
DB_PASSWORD=SophieHappy33

# PostgreSQL (Local Database)
POSTGRES_HOST=localhost
POSTGRES_USER=sweeping_user
POSTGRES_PASSWORD=sweeping_password
```

### Port Configuration
```env
BACKEND_PORT=8001
FRONTEND_PORT=3001
POSTGRES_PORT=5432
```

### CORS Configuration
```env
# For development (allow all)
ALLOWED_ORIGINS=*

# For production (specific origins)
ALLOWED_ORIGINS=http://localhost:3001,http://192.168.1.100:3001
```

## Common Network Scenarios

### 1. Local Development
- All services running on localhost
- Use default ports
- CORS: `*`

### 2. Cross-Device Access
- Update `ALLOWED_ORIGINS` with your local IP
- Ensure firewall allows connections
- Use your local IP instead of localhost

### 3. Production Deployment
- Use specific CORS origins
- Secure database credentials
- Use environment-specific ports

## Troubleshooting

### Database Connection Issues
1. Check if SQL Server is accessible from your network
2. Verify firewall settings
3. Test connection with database tools

### CORS Issues
1. Check `ALLOWED_ORIGINS` configuration
2. Ensure frontend URL is included
3. Check browser console for CORS errors

### Port Conflicts
1. Check if ports are already in use
2. Update port configuration in `.env`
3. Restart services after port changes

## Security Notes

### Development
- Use `ALLOWED_ORIGINS=*` for easy development
- Default credentials are acceptable

### Production
- Use specific CORS origins
- Change default passwords
- Use secure secret keys
- Enable HTTPS

## Starting the Application

### Windows
```bash
start_app.bat
```

### Manual Start
```bash
# Backend
cd backend
python main.py

# Frontend (in another terminal)
cd frontend
npm start
```

## Network Testing

### Test Backend
```bash
curl http://localhost:8001/api/health
```

### Test Frontend
Open browser: `http://localhost:3001`

### Test Cross-Device
Replace `localhost` with your local IP address.

## Support

If you encounter issues:
1. Check the logs in `backend/logs/`
2. Verify network connectivity
3. Check firewall settings
4. Ensure all services are running
