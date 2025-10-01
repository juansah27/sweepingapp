# Database Configuration
# This file contains the database connection settings

import os
from dotenv import load_dotenv

load_dotenv()

# SQL Server Configuration (existing)
DB_SERVER = os.getenv("DB_SERVER", "10.6.13.33,1433")
DB_NAME = os.getenv("DB_NAME", "Flexo_db")
DB_USERNAME = os.getenv("DB_USERNAME", "fservice")
DB_PASSWORD = os.getenv("DB_PASSWORD", "SophieHappy33")
DB_TRUSTED_CONNECTION = os.getenv("DB_TRUSTED_CONNECTION", "no")

# PostgreSQL Configuration (new)
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "sweeping_apps")
POSTGRES_USER = os.getenv("POSTGRES_USER", "sweeping_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "sweeping_password")

# Connection strings
FLEXO_DB_CONNECTION_STRING = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE=Flexo_Db;UID={DB_USERNAME};PWD={DB_PASSWORD};TrustServerCertificate=yes;Connection Timeout=30;"
WMSPROD_DB_CONNECTION_STRING = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE=WMSPROD;UID={DB_USERNAME};PWD={DB_PASSWORD};TrustServerCertificate=yes;Connection Timeout=30;"

# PostgreSQL connection string (pooling parameters are set in create_engine, not in URL)
POSTGRES_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
