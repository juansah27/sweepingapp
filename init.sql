-- Sweeping Apps Database Initialization Script
-- This script runs when PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS marketplace;
-- CREATE SCHEMA IF NOT EXISTS logs;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE sweeping_apps TO sweeping_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO sweeping_user;

-- Create indexes for better performance (will be created when tables are created by SQLAlchemy)
-- These are just examples, actual indexes will be created by the application

-- Log the initialization
DO $$
BEGIN
    RAISE NOTICE 'Sweeping Apps database initialized successfully!';
    RAISE NOTICE 'Database: sweeping_apps';
    RAISE NOTICE 'User: sweeping_user';
    RAISE NOTICE 'Timezone: UTC';
    RAISE NOTICE 'Extensions: uuid-ossp, pg_trgm';
END $$;

