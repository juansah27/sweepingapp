#!/usr/bin/env python3
"""
Script to create itemid_comparison view with smart SKU comparison
Handles cases where SKU lists have same items but different order
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

def normalize_sku_string(sku_string):
    """
    SQL function to normalize SKU string by sorting items
    Input: "NA18231210316,8994460553195"
    Output: "8994460553195,NA18231210316" (sorted)
    """
    return """
    CREATE OR REPLACE FUNCTION normalize_sku(sku_text TEXT)
    RETURNS TEXT AS $$
    DECLARE
        sku_array TEXT[];
        sorted_skus TEXT;
    BEGIN
        -- Handle NULL or empty string
        IF sku_text IS NULL OR sku_text = '' THEN
            RETURN '';
        END IF;
        
        -- Split by comma, trim whitespace, and sort
        sku_array := string_to_array(sku_text, ',');
        sku_array := ARRAY(
            SELECT TRIM(unnest) 
            FROM unnest(sku_array) 
            WHERE TRIM(unnest) != ''
            ORDER BY TRIM(unnest)
        );
        
        -- Rejoin with comma
        sorted_skus := array_to_string(sku_array, ',');
        
        RETURN sorted_skus;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
    """

def create_itemid_comparison_view():
    """Create itemid_comparison view with smart comparison logic"""
    
    # Get database connection
    database_url = get_database_url()
    logger.info(f"Connecting to database...")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()
            
            try:
                logger.info("Creating normalize_sku function...")
                conn.execute(text(normalize_sku_string()))
                
                logger.info("Creating itemid_comparison view...")
                conn.execute(text("""
                    CREATE OR REPLACE VIEW itemid_comparison AS
                    SELECT 
                        "Id",
                        "OrderNumber",
                        "Marketplace",
                        "Brand",
                        "ItemId" as excel_itemid,
                        "ItemIdFlexo" as external_itemid,
                        normalize_sku("ItemId") as excel_itemid_normalized,
                        normalize_sku("ItemIdFlexo") as external_itemid_normalized,
                        "UploadDate",
                        "InterfaceStatus",
                        CASE 
                            -- Both have values - compare normalized versions
                            WHEN "ItemId" IS NOT NULL AND "ItemId" != '' 
                                AND "ItemIdFlexo" IS NOT NULL AND "ItemIdFlexo" != '' THEN
                                CASE 
                                    WHEN normalize_sku("ItemId") = normalize_sku("ItemIdFlexo") 
                                    THEN 'Match'
                                    ELSE 'Mismatch'
                                END
                            -- Excel has value, External is NULL/empty
                            WHEN ("ItemId" IS NOT NULL AND "ItemId" != '') 
                                AND ("ItemIdFlexo" IS NULL OR "ItemIdFlexo" = '') 
                            THEN 'Item Different'
                            -- Excel is NULL/empty, External has value
                            WHEN ("ItemId" IS NULL OR "ItemId" = '') 
                                AND ("ItemIdFlexo" IS NOT NULL AND "ItemIdFlexo" != '') 
                            THEN 'Item Missing'
                            -- Both NULL or empty
                            WHEN ("ItemId" IS NULL OR "ItemId" = '') 
                                AND ("ItemIdFlexo" IS NULL OR "ItemIdFlexo" = '') 
                            THEN 'Both Missing'
                            ELSE 'Unknown'
                        END as comparison_status
                    FROM uploaded_orders;
                """))
                
                # Grant permissions
                logger.info("Granting permissions...")
                conn.execute(text("GRANT SELECT ON itemid_comparison TO sweeping_user;"))
                
                # Commit transaction
                trans.commit()
                logger.info("✅ itemid_comparison view created successfully!")
                
                # Test the view
                logger.info("Testing view...")
                test_result = conn.execute(text("""
                    SELECT 
                        comparison_status, 
                        COUNT(*) as count
                    FROM itemid_comparison
                    GROUP BY comparison_status
                    ORDER BY count DESC;
                """)).fetchall()
                
                logger.info("\n📊 SKU Comparison Statistics:")
                for row in test_result:
                    logger.info(f"   {row[0]}: {row[1]} orders")
                
                # Test specific case
                test_case = conn.execute(text("""
                    SELECT 
                        "OrderNumber",
                        excel_itemid,
                        external_itemid,
                        excel_itemid_normalized,
                        external_itemid_normalized,
                        comparison_status
                    FROM itemid_comparison
                    WHERE "OrderNumber" = '2510010BFY8WU8'
                    LIMIT 1;
                """)).fetchone()
                
                if test_case:
                    logger.info("\n🔍 Test Case (Order: 2510010BFY8WU8):")
                    logger.info(f"   Excel: {test_case[1]}")
                    logger.info(f"   External: {test_case[2]}")
                    logger.info(f"   Excel (normalized): {test_case[3]}")
                    logger.info(f"   External (normalized): {test_case[4]}")
                    logger.info(f"   Status: {test_case[5]}")
                
            except Exception as e:
                trans.rollback()
                logger.error(f"❌ Error creating view: {e}")
                raise
                
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    logger.info("🚀 Creating itemid_comparison view...")
    create_itemid_comparison_view()
    logger.info("🎉 View creation completed!")

