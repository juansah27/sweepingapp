# Sweeping Apps - Docker Setup

This guide will help you run the Sweeping Apps application using Docker containers.

## Prerequisites

- **Docker Desktop** installed and running
- **Docker Compose** (included with Docker Desktop)
- At least **4GB RAM** available for Docker
- **Ports 80, 8001, 5432** available on your system

## Quick Start

### 1. Clone and Navigate
```bash
cd SweepingApps
```

### 2. Configure Environment
```bash
# Copy the environment template
copy docker.env .env

# Edit .env file with your configuration
notepad .env
```

### 3. Start Services
```bash
# Windows
docker-start.bat

# Linux/Mac
docker-compose up --build -d
```

### 4. Access Application
- **Frontend**: http://localhost:80
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

## Configuration

### Environment Variables

Edit the `.env` file to configure your application:

```env
# Database Configuration
POSTGRES_DB=sweeping_apps
POSTGRES_USER=sweeping_user
POSTGRES_PASSWORD=sweeping_password

# Backend Configuration
SECRET_KEY=your-secret-key-change-this-in-production
DB_SERVER=10.6.13.33\newjda
DB_NAME=Flexo_db
DB_USERNAME=fservice
DB_PASSWORD=SophieHappy33
DB_TRUSTED_CONNECTION=no

# Application Configuration
AUTO_RUN_MARKETPLACE_APPS=true
```

### Network Configuration

For cross-device access, update the IP addresses in your `.env` file:

```env
# Replace with your actual network IP
FRONTEND_PORT=3001
BACKEND_PORT=8001
POSTGRES_PORT=5432
```

## Services

### 1. PostgreSQL Database
- **Port**: 5432
- **Database**: sweeping_apps
- **User**: sweeping_user
- **Password**: sweeping_password

### 2. Backend API
- **Port**: 8001
- **Health Check**: http://localhost:8001/health
- **API Docs**: http://localhost:8001/docs

### 3. Frontend (Nginx)
- **Port**: 80
- **Static Files**: Served by Nginx
- **API Proxy**: Routes /api/* to backend

### 4. Redis (Optional)
- **Port**: 6379
- **Purpose**: Caching and session storage

## Management Commands

### Windows Scripts
```bash
# Start all services
docker-start.bat

# Stop all services
docker-stop.bat

# View logs
docker-logs.bat
```

### Docker Compose Commands
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and start
docker-compose up --build -d

# Stop and remove volumes (WARNING: Deletes all data)
docker-compose down -v
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the ports
netstat -ano | findstr :80
netstat -ano | findstr :8001
netstat -ano | findstr :5432

# Stop conflicting services or change ports in docker-compose.yml
```

#### 2. Docker Not Running
```bash
# Start Docker Desktop
# Wait for it to fully start before running commands
```

#### 3. Permission Issues
```bash
# On Windows, run as Administrator
# On Linux/Mac, add user to docker group
sudo usermod -aG docker $USER
```

#### 4. Database Connection Issues
```bash
# Check if PostgreSQL container is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### 5. Backend API Issues
```bash
# Check backend logs
docker-compose logs backend

# Check if backend is healthy
curl http://localhost:8001/health

# Restart backend
docker-compose restart backend
```

### Health Checks

All services include health checks:

```bash
# Check service status
docker-compose ps

# Check health status
docker inspect sweeping-apps-backend | grep -A 10 Health
docker inspect sweeping-apps-postgres | grep -A 10 Health
```

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs postgres
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f backend
```

## Development

### Rebuilding After Code Changes

```bash
# Rebuild and restart specific service
docker-compose up --build -d backend

# Rebuild and restart all services
docker-compose up --build -d
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it sweeping-apps-postgres psql -U sweeping_user -d sweeping_apps

# Backup database
docker exec sweeping-apps-postgres pg_dump -U sweeping_user sweeping_apps > backup.sql

# Restore database
docker exec -i sweeping-apps-postgres psql -U sweeping_user -d sweeping_apps < backup.sql
```

### File Uploads

Uploaded files are stored in the backend container. To persist them:

```yaml
# Add to docker-compose.yml backend service
volumes:
  - ./uploads:/app/uploads
  - ./backend/logs:/app/logs
```

## Production Deployment

### Security Considerations

1. **Change default passwords** in `.env`
2. **Use strong SECRET_KEY**
3. **Enable HTTPS** with SSL certificates
4. **Configure firewall** rules
5. **Regular backups** of database

### Performance Optimization

1. **Increase worker processes** in Dockerfile.backend
2. **Configure Redis** for caching
3. **Use production PostgreSQL** settings
4. **Enable Nginx caching**

### Monitoring

```bash
# Monitor resource usage
docker stats

# Check container health
docker-compose ps

# Monitor logs
docker-compose logs -f
```

## Backup and Restore

### Database Backup
```bash
# Create backup
docker exec sweeping-apps-postgres pg_dump -U sweeping_user sweeping_apps > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i sweeping-apps-postgres psql -U sweeping_user -d sweeping_apps < backup_20231201_120000.sql
```

### Volume Backup
```bash
# Backup volumes
docker run --rm -v sweeping-apps_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore volumes
docker run --rm -v sweeping-apps_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## Support

For issues and questions:
1. Check the logs: `docker-compose logs`
2. Verify configuration: `docker-compose config`
3. Check service status: `docker-compose ps`
4. Review this documentation

## Port Summary

| Service | Internal Port | External Port | Purpose |
|---------|---------------|---------------|---------|
| Frontend | 80 | 80 | Web interface |
| Backend | 8001 | 8001 | API server |
| PostgreSQL | 5432 | 5432 | Database |
| Redis | 6379 | 6379 | Cache (optional) |
