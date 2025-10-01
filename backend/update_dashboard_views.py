#!/usr/bin/env python3
"""
Script to update dashboard views with smart date handling
This script updates the existing views to handle cases where no data exists for current date
"""

import os
import sys
import logging
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_database_url():
    """Get database URL from environment variables"""
    postgres_host = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port = os.getenv("POSTGRES_PORT", "5432")
    postgres_db = os.getenv("POSTGRES_DB", "sweeping_apps")
    postgres_user = os.getenv("POSTGRES_USER", "sweeping_user")
    postgres_password = os.getenv("POSTGRES_PASSWORD", "sweeping_password")
    
    return f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"

def update_dashboard_views():
    """Update dashboard views with smart date handling"""
    
    # Get database connection
    database_url = get_database_url()
    logger.info(f"Connecting to database: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                logger.info("Updating dashboard views with smart date handling...")
                
                # 1. Update main dashboard statistics view
                logger.info("Updating dashboard_stats view...")
                conn.execute(text("""
                    CREATE OR REPLACE VIEW dashboard_stats AS
                    SELECT 
                        COUNT(*) as total_orders,
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interface_orders,
                        COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interface_orders,
                        ROUND(
                            COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                            NULLIF(COUNT(*), 0), 2
                        ) as interface_rate,
                        -- Today orders: show data from last 24 hours or last available date
                        COALESCE(
                            COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END),
                            COUNT(CASE WHEN "UploadDate" >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END)
                        ) as today_orders,
                        -- Recent orders: last 7 days or last 30 days if no recent data
                        COALESCE(
                            COUNT(CASE WHEN "UploadDate" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END),
                            COUNT(CASE WHEN "UploadDate" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)
                        ) as recent_orders,
                        COUNT(CASE WHEN "UploadDate" >= CURRENT_DATE - INTERVAL '1 day' THEN 1 END) as yesterday_orders,
                        COUNT(CASE WHEN "UploadDate" >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as last_30_days_orders,
                        -- Show last available date
                        MAX("UploadDate") as last_data_date,
                        CURRENT_TIMESTAMP as last_updated
                    FROM uploaded_orders;
                """))
                
                # 2. Update brand distribution view with smart date handling
                logger.info("Updating dashboard_brand_distribution view...")
                conn.execute(text("""
                    CREATE OR REPLACE VIEW dashboard_brand_distribution AS
                    WITH date_range AS (
                        SELECT 
                            CASE 
                                WHEN COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) > 0 
                                THEN CURRENT_DATE
                                ELSE MAX(DATE("UploadDate"))
                            END as effective_date
                        FROM uploaded_orders
                    )
                    SELECT 
                        "Brand" as brand,
                        COUNT(*) as count,
                        ROUND(
                            COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders), 2
                        ) as percentage,
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
                        COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count,
                        -- Show data from effective date (today if available, otherwise last available date)
                        COUNT(CASE WHEN DATE("UploadDate") = (SELECT effective_date FROM date_range) THEN 1 END) as today_count
                    FROM uploaded_orders 
                    WHERE "Brand" IS NOT NULL AND "Brand" != ''
                    GROUP BY "Brand" 
                    ORDER BY count DESC;
                """))
                
                # 3. Create a new view for data availability check
                logger.info("Creating dashboard_data_availability view...")
                conn.execute(text("""
                    CREATE OR REPLACE VIEW dashboard_data_availability AS
                    SELECT 
                        COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) as today_count,
                        MAX("UploadDate") as last_data_date,
                        MIN("UploadDate") as first_data_date,
                        COUNT(DISTINCT DATE("UploadDate")) as total_days_with_data,
                        CASE 
                            WHEN COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) > 0 
                            THEN 'today'
                            ELSE 'last_available'
                        END as effective_date_type,
                        CASE 
                            WHEN COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) > 0 
                            THEN CURRENT_DATE
                            ELSE MAX(DATE("UploadDate"))
                        END as effective_date
                    FROM uploaded_orders;
                """))
                
                # 4. Create a smart dashboard stats view that adapts to data availability
                logger.info("Creating dashboard_smart_stats view...")
                conn.execute(text("""
                    CREATE OR REPLACE VIEW dashboard_smart_stats AS
                    WITH data_availability AS (
                        SELECT 
                            COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) as today_count,
                            MAX("UploadDate") as last_data_date,
                            CASE 
                                WHEN COUNT(CASE WHEN DATE("UploadDate") = CURRENT_DATE THEN 1 END) > 0 
                                THEN CURRENT_DATE
                                ELSE MAX(DATE("UploadDate"))
                            END as effective_date
                        FROM uploaded_orders
                    )
                    SELECT 
                        COUNT(*) as total_orders,
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interface_orders,
                        COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interface_orders,
                        ROUND(
                            COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                            NULLIF(COUNT(*), 0), 2
                        ) as interface_rate,
                        -- Smart today orders: use effective date
                        COUNT(CASE WHEN DATE("UploadDate") = (SELECT effective_date FROM data_availability) THEN 1 END) as today_orders,
                        -- Smart recent orders: use effective date as reference
                        COUNT(CASE WHEN "UploadDate" >= (SELECT effective_date FROM data_availability) - INTERVAL '7 days' THEN 1 END) as recent_orders,
                        COUNT(CASE WHEN "UploadDate" >= (SELECT effective_date FROM data_availability) - INTERVAL '1 day' THEN 1 END) as yesterday_orders,
                        COUNT(CASE WHEN "UploadDate" >= (SELECT effective_date FROM data_availability) - INTERVAL '30 days' THEN 1 END) as last_30_days_orders,
                        -- Data availability info
                        (SELECT today_count FROM data_availability) as has_today_data,
                        (SELECT last_data_date FROM data_availability) as last_data_date,
                        (SELECT effective_date FROM data_availability) as effective_date,
                        CURRENT_TIMESTAMP as last_updated
                    FROM uploaded_orders;
                """))
                
                # Grant permissions on new views
                logger.info("Granting permissions on updated views...")
                conn.execute(text("GRANT SELECT ON dashboard_data_availability TO sweeping_user;"))
                conn.execute(text("GRANT SELECT ON dashboard_smart_stats TO sweeping_user;"))
                
                # Commit transaction
                trans.commit()
                logger.info("✅ Dashboard views updated successfully!")
                
                # Test the updated views
                logger.info("Testing updated views...")
                test_updated_views(conn)
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Error updating views: {e}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        sys.exit(1)

def test_updated_views(conn):
    """Test the updated views"""
    views_to_test = [
        "dashboard_stats",
        "dashboard_brand_distribution", 
        "dashboard_data_availability",
        "dashboard_smart_stats"
    ]
    
    for view_name in views_to_test:
        try:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {view_name}")).fetchone()
            count = result[0] if result else 0
            logger.info(f"✅ {view_name}: {count} records")
            
            # Test specific fields for smart stats
            if view_name == "dashboard_smart_stats":
                smart_result = conn.execute(text("""
                    SELECT has_today_data, last_data_date, effective_date 
                    FROM dashboard_smart_stats
                """)).fetchone()
                if smart_result:
                    logger.info(f"   📊 Has today data: {smart_result.has_today_data}")
                    logger.info(f"   📅 Last data date: {smart_result.last_data_date}")
                    logger.info(f"   🎯 Effective date: {smart_result.effective_date}")
                    
        except Exception as e:
            logger.error(f"❌ {view_name}: Error - {e}")

if __name__ == "__main__":
    logger.info("🚀 Starting dashboard views update...")
    update_dashboard_views()
    logger.info("🎉 Dashboard views update completed!")
