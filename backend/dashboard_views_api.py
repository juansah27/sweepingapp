"""
Optimized Dashboard API using Database Views
This module provides high-performance dashboard endpoints using pre-computed views
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

# Import database and utility functions
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import get_db, get_current_user, get_wib_now
except ImportError:
    # For direct execution or if modules don't exist
    def get_db():
        # Create database session directly
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        import os
        
        # Database connection
        postgres_host = os.getenv("POSTGRES_HOST", "localhost")
        postgres_port = os.getenv("POSTGRES_PORT", "5432")
        postgres_db = os.getenv("POSTGRES_DB", "sweeping_apps")
        postgres_user = os.getenv("POSTGRES_USER", "sweeping_user")
        postgres_password = os.getenv("POSTGRES_PASSWORD", "sweeping_password")
        
        database_url = f"postgresql://{postgres_user}:{postgres_password}@{postgres_host}:{postgres_port}/{postgres_db}"
        engine = create_engine(database_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        return SessionLocal()
    
    def get_current_user():
        # Mock current user - replace with actual implementation
        return "admin"
    
    def get_wib_now():
        from datetime import datetime
        import pytz
        wib = pytz.timezone('Asia/Jakarta')
        return datetime.now(wib)

logger = logging.getLogger(__name__)

# Create router for dashboard views API
router = APIRouter(prefix="/api/dashboard", tags=["dashboard-views"])

@router.get("/stats")
def get_dashboard_stats_optimized(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get dashboard statistics using optimized views
    Shows exact data for the specified date range without fallback
    """
    try:
        # Parse date filters
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                from datetime import datetime
                # Handle different date formats
                if '+' in start_date:
                    start_datetime = datetime.fromisoformat(start_date)
                elif 'Z' in start_date:
                    start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    # Handle dates without timezone (assume WIB timezone)
                    start_datetime = datetime.fromisoformat(start_date)
                    import pytz
                    wib = pytz.timezone('Asia/Jakarta')
                    start_datetime = wib.localize(start_datetime)
            except ValueError as e:
                logger.error(f"Error parsing start_date: {start_date}, error: {e}")
                pass
        
        if end_date:
            try:
                from datetime import datetime
                # Handle different date formats
                if '+' in end_date:
                    end_datetime = datetime.fromisoformat(end_date)
                elif 'Z' in end_date:
                    end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    # Handle dates without timezone (assume WIB timezone)
                    end_datetime = datetime.fromisoformat(end_date)
                    import pytz
                    wib = pytz.timezone('Asia/Jakarta')
                    end_datetime = wib.localize(end_datetime)
            except ValueError as e:
                logger.error(f"Error parsing end_date: {end_date}, error: {e}")
                pass
        
        # Build dynamic query based on date filters
        if start_datetime and end_datetime:
            # Convert to naive datetime for database comparison (database stores data without timezone)
            import pytz
            
            # Convert datetime to naive datetime (remove timezone info)
            if start_datetime.tzinfo is not None:
                # Convert to WIB first, then remove timezone info
                wib = pytz.timezone('Asia/Jakarta')
                start_datetime = start_datetime.astimezone(wib).replace(tzinfo=None)
                
            if end_datetime.tzinfo is not None:
                # Convert to WIB first, then remove timezone info
                wib = pytz.timezone('Asia/Jakarta')
                end_datetime = end_datetime.astimezone(wib).replace(tzinfo=None)
            
            # Use date-filtered query
            stats_query = text("""
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interface_orders,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interface_orders,
                    ROUND(
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as interface_rate,
                    COUNT(*) as today_orders,
                    COUNT(*) as recent_orders,
                    COUNT(*) as yesterday_orders,
                    COUNT(*) as last_30_days_orders,
                    MAX("UploadDate") as last_data_date,
                    CURRENT_TIMESTAMP as last_updated
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
            """)
            
            result = db.execute(stats_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            })
        else:
            # Use the dashboard_stats view for main statistics (no date filter)
            stats_query = text("""
                SELECT 
                    total_orders,
                    interface_orders,
                    not_interface_orders,
                    interface_rate,
                    today_orders,
                    recent_orders,
                    yesterday_orders,
                    last_30_days_orders,
                    last_data_date,
                    last_updated
                FROM dashboard_stats
            """)
            
            result = db.execute(stats_query)
        
        stats_result = result.fetchone()
        
        if not stats_result:
            raise HTTPException(status_code=404, detail="Dashboard statistics not found")
        
        # Get brand distribution (with date filter if provided)
        if start_datetime and end_datetime:
            brand_query = text("""
                SELECT 
                    "Brand" as brand,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date), 2) as percentage,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "Brand" IS NOT NULL AND "Brand" != ''
                GROUP BY "Brand"
                ORDER BY count DESC
                LIMIT 20
            """)
            brand_results = db.execute(brand_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
            
            marketplace_query = text("""
                SELECT 
                    "Marketplace" as marketplace,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date), 2) as percentage,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "Marketplace" IS NOT NULL AND "Marketplace" != ''
                GROUP BY "Marketplace"
                ORDER BY count DESC
                LIMIT 20
            """)
            marketplace_results = db.execute(marketplace_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            # Use views when no date filter
            brand_query = text("""
                SELECT brand, count, percentage, interfaced_count, not_interfaced_count
                FROM dashboard_brand_distribution
                LIMIT 20
            """)
            brand_results = db.execute(brand_query).fetchall()
            
            marketplace_query = text("""
                SELECT marketplace, count, percentage, interfaced_count, not_interfaced_count
                FROM dashboard_marketplace_distribution
                LIMIT 20
            """)
            marketplace_results = db.execute(marketplace_query).fetchall()
        
        # Get daily orders for the last 7 days
        daily_query = text("""
            SELECT date, count, interfaced_count, not_interfaced_count, interface_rate
            FROM dashboard_daily_evolution
            WHERE date >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY date DESC
        """)
        daily_results = db.execute(daily_query).fetchall()
        
        result = {
            "total_orders": stats_result.total_orders,
            "filtered_orders": stats_result.total_orders,  # For compatibility
            "interface_orders": stats_result.interface_orders,
            "not_interface_orders": stats_result.not_interface_orders,
            "interface_rate": float(stats_result.interface_rate) if stats_result.interface_rate is not None else 0.0,
            "recent_orders": stats_result.recent_orders,
            "today_orders": stats_result.today_orders,
            "yesterday_orders": stats_result.yesterday_orders,
            "last_30_days_orders": stats_result.last_30_days_orders,
            "upload_success_rate": 100.0,  # Assume 100% for now
            "last_data_date": stats_result.last_data_date.isoformat() if stats_result.last_data_date else None,
            "marketplace_distribution": [
                {
                    "marketplace": row.marketplace,
                    "count": row.count,
                    "percentage": float(row.percentage),
                    "interfaced_count": row.interfaced_count,
                    "not_interfaced_count": row.not_interfaced_count
                }
                for row in marketplace_results
            ],
            "brand_distribution": [
                {
                    "brand": row.brand,
                    "count": row.count,
                    "percentage": float(row.percentage),
                    "interfaced_count": row.interfaced_count,
                    "not_interfaced_count": row.not_interfaced_count
                }
                for row in brand_results
            ],
            "daily_orders": [
                {
                    "date": row.date.isoformat(),
                    "count": row.count,
                    "interfaced_count": row.interfaced_count,
                    "not_interfaced_count": row.not_interfaced_count,
                    "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0 if row.interface_rate is not None else 0.0
                }
                for row in daily_results
            ],
            "last_updated": stats_result.last_updated.isoformat()
        }
        
        logger.info(f"Dashboard stats retrieved successfully: {stats_result.total_orders} total orders")
        return result
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard stats: {str(e)}")

@router.get("/advanced-stats")
def get_dashboard_advanced_stats_optimized(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    not_interfaced_limit: Optional[int] = Query(1000, description="Limit for not interfaced orders"),
    db: Session = Depends(get_db)
):
    """
    Get advanced dashboard statistics using optimized views
    """
    try:
        # Parse date filters
        start_datetime = None
        end_datetime = None
        
        if start_date:
            try:
                from datetime import datetime
                # Handle different date formats
                if '+' in start_date:
                    start_datetime = datetime.fromisoformat(start_date)
                elif 'Z' in start_date:
                    start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                else:
                    # Handle dates without timezone (assume WIB timezone)
                    start_datetime = datetime.fromisoformat(start_date)
                    import pytz
                    wib = pytz.timezone('Asia/Jakarta')
                    start_datetime = wib.localize(start_datetime)
            except ValueError as e:
                logger.error(f"Error parsing start_date: {start_date}, error: {e}")
                pass
        
        if end_date:
            try:
                from datetime import datetime
                # Handle different date formats
                if '+' in end_date:
                    end_datetime = datetime.fromisoformat(end_date)
                elif 'Z' in end_date:
                    end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                else:
                    # Handle dates without timezone (assume WIB timezone)
                    end_datetime = datetime.fromisoformat(end_date)
                    import pytz
                    wib = pytz.timezone('Asia/Jakarta')
                    end_datetime = wib.localize(end_datetime)
            except ValueError as e:
                logger.error(f"Error parsing end_date: {end_date}, error: {e}")
                pass
        
        # Convert to naive datetime for database comparison
        if start_datetime and end_datetime:
            import pytz
            if start_datetime.tzinfo is not None:
                wib = pytz.timezone('Asia/Jakarta')
                start_datetime = start_datetime.astimezone(wib).replace(tzinfo=None)
            if end_datetime.tzinfo is not None:
                wib = pytz.timezone('Asia/Jakarta')
                end_datetime = end_datetime.astimezone(wib).replace(tzinfo=None)
        
        # Get batch distribution - use date filter if provided
        if start_datetime and end_datetime:
            batch_query = text("""
                SELECT 
                    "Batch" as batch,
                    COUNT(*) as count,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count,
                    ROUND(
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as interface_rate
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "Batch" IS NOT NULL AND "Batch" != ''
                GROUP BY "Batch"
                ORDER BY count DESC
                LIMIT 50
            """)
            batch_results = db.execute(batch_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            batch_query = text("""
                SELECT batch, count, interfaced_count, not_interfaced_count, interface_rate
                FROM dashboard_batch_distribution
                ORDER BY count DESC
                LIMIT 50
            """)
            batch_results = db.execute(batch_query).fetchall()
        
        # Get PIC performance - use date filter if provided
        if start_datetime and end_datetime:
            pic_query = text("""
                SELECT 
                    "PIC" as pic,
                    COUNT(*) as total_uploads,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_uploads,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_uploads,
                    ROUND(
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as interface_rate,
                    COUNT(DISTINCT "Brand") as unique_brands,
                    COUNT(DISTINCT "Marketplace") as unique_marketplaces,
                    MAX("UploadDate") as last_upload_date
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "PIC" IS NOT NULL AND "PIC" != ''
                GROUP BY "PIC"
                ORDER BY total_uploads DESC
                LIMIT 20
            """)
            pic_results = db.execute(pic_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            pic_query = text("""
                SELECT pic, total_uploads, interfaced_uploads, not_interfaced_uploads, 
                       interface_rate, unique_brands, unique_marketplaces, last_upload_date
                FROM dashboard_pic_performance
                ORDER BY total_uploads DESC
                LIMIT 20
            """)
            pic_results = db.execute(pic_query).fetchall()
        
        # Get hourly evolution - use date filter if provided
        if start_datetime and end_datetime:
            hourly_query = text("""
                SELECT 
                    EXTRACT(HOUR FROM "UploadDate") as hour,
                    LPAD(EXTRACT(HOUR FROM "UploadDate")::text, 2, '0') || ':' || '00' as hour_label,
                    COUNT(*) as count,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                GROUP BY EXTRACT(HOUR FROM "UploadDate")
                ORDER BY hour
            """)
            hourly_results = db.execute(hourly_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            hourly_query = text("""
                SELECT hour, hour_label, count, interfaced_count, not_interfaced_count
                FROM dashboard_hourly_evolution
                ORDER BY hour
            """)
            hourly_results = db.execute(hourly_query).fetchall()
        
        # Get recent uploads - use date filter if provided
        if start_datetime and end_datetime:
            recent_uploads_query = text("""
                SELECT 
                    "Batch" as batch,
                    "Marketplace" as marketplace,
                    "Brand" as brand,
                    "PIC" as pic,
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_orders,
                    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_orders,
                    MAX("UploadDate") as upload_date,
                    ROUND(
                        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as interface_rate
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "Batch" IS NOT NULL AND "Marketplace" IS NOT NULL AND "Brand" IS NOT NULL
                GROUP BY "Batch", "Marketplace", "Brand", "PIC"
                ORDER BY upload_date DESC
                LIMIT 50
            """)
            recent_uploads_results = db.execute(recent_uploads_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            recent_uploads_query = text("""
                SELECT batch, marketplace, brand, pic, total_orders, 
                       interfaced_orders, not_interfaced_orders, upload_date, interface_rate
                FROM dashboard_recent_uploads
                LIMIT 50
            """)
            recent_uploads_results = db.execute(recent_uploads_query).fetchall()
        
        # Get not interfaced orders - use date filter if provided
        if start_datetime and end_datetime:
            not_interfaced_query = text("""
                SELECT 
                    "Id" as id,
                    "Marketplace" as marketplace,
                    "Brand" as brand,
                    CASE 
                        WHEN "OrderNumberFlexo" IS NOT NULL AND "OrderNumberFlexo" != '' 
                        THEN "OrderNumberFlexo" 
                        ELSE "OrderNumber" 
                    END as order_number,
                    "OrderStatus" as order_status,
                    "AWB" as awb,
                    "Transporter" as transporter,
                    "OrderDate" as order_date,
                    "SLA" as sla,
                    "Batch" as batch,
                    "PIC" as pic,
                    "UploadDate" as upload_date,
                    "Remarks" as remark,
                    "InterfaceStatus" as interface_status,
                    "TaskId" as task_id,
                    "OrderNumberFlexo" as order_number_flexo,
                    "OrderStatusFlexo" as order_status_flexo
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "InterfaceStatus" != 'Interface'
                ORDER BY "UploadDate" DESC
                LIMIT :limit
            """)
            not_interfaced_results = db.execute(
                not_interfaced_query, 
                {
                    "start_date": start_datetime,
                    "end_date": end_datetime,
                    "limit": not_interfaced_limit
                }
            ).fetchall()
        else:
            not_interfaced_query = text("""
                SELECT id, marketplace, brand, order_number, order_status, awb, 
                       transporter, order_date, sla, batch, pic, upload_date, 
                       remark, interface_status, task_id, order_number_flexo, order_status_flexo
                FROM dashboard_not_interfaced_orders
                LIMIT :limit
            """)
            not_interfaced_results = db.execute(
                not_interfaced_query, 
                {"limit": not_interfaced_limit}
            ).fetchall()
        
        # Get interface status summary - use date filter if provided
        if start_datetime and end_datetime:
            interface_status_query = text("""
                SELECT 
                    "InterfaceStatus" as status,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date), 2) as percentage
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                GROUP BY "InterfaceStatus"
                ORDER BY count DESC
            """)
            interface_status_results = db.execute(interface_status_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            interface_status_query = text("""
                SELECT status, count, percentage
                FROM dashboard_interface_status_summary
                ORDER BY count DESC
            """)
            interface_status_results = db.execute(interface_status_query).fetchall()
        
        # Get order status summary - use date filter if provided
        if start_datetime and end_datetime:
            order_status_query = text("""
                SELECT 
                    "OrderStatus" as status,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date), 2) as percentage
                FROM uploaded_orders
                WHERE "UploadDate" >= :start_date AND "UploadDate" <= :end_date
                AND "OrderStatus" IS NOT NULL AND "OrderStatus" != ''
                GROUP BY "OrderStatus"
                ORDER BY count DESC
                LIMIT 20
            """)
            order_status_results = db.execute(order_status_query, {
                "start_date": start_datetime,
                "end_date": end_datetime
            }).fetchall()
        else:
            order_status_query = text("""
                SELECT status, count, percentage
                FROM dashboard_order_status_summary
                ORDER BY count DESC
                LIMIT 20
            """)
            order_status_results = db.execute(order_status_query).fetchall()
        
        result = {
            "batch_count": [
                {
                    "batch": row.batch,
                    "count": row.count,
                    "interfaced_count": row.interfaced_count,
                    "not_interfaced_count": row.not_interfaced_count,
                    "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0 if row.interface_rate is not None else 0.0
                }
                for row in batch_results
            ],
            "pic_count": [
                {
                    "pic": row.pic,
                    "count": row.total_uploads,
                    "interfaced_count": row.interfaced_uploads,
                    "not_interfaced_count": row.not_interfaced_uploads,
                    "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0 if row.interface_rate is not None else 0.0,
                    "unique_brands": row.unique_brands,
                    "unique_marketplaces": row.unique_marketplaces,
                    "last_upload_date": row.last_upload_date.isoformat() if row.last_upload_date else None
                }
                for row in pic_results
            ],
            "hourly_orders": [
                {
                    "hour": row.hour_label,
                    "count": row.count,
                    "interfaced_count": row.interfaced_count,
                    "not_interfaced_count": row.not_interfaced_count
                }
                for row in hourly_results
            ],
            "recent_uploads": [
                {
                    "batch": row.batch,
                    "marketplace": row.marketplace,
                    "brand": row.brand,
                    "pic": row.pic,
                    "total_orders": row.total_orders,
                    "interfaced_orders": row.interfaced_orders,
                    "not_interfaced_orders": row.not_interfaced_orders,
                    "upload_date": row.upload_date.isoformat() if row.upload_date else None,
                    "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0 if row.interface_rate is not None else 0.0
                }
                for row in recent_uploads_results
            ],
            "not_interfaced_orders": [
                {
                    "id": row.id,
                    "marketplace": row.marketplace,
                    "brand": row.brand,
                    "order_number": row.order_number_flexo if row.order_number_flexo and row.order_number_flexo.strip() else row.order_number,  # Fallback logic
                    "order_status": row.order_status,
                    "awb": row.awb,
                    "transporter": row.transporter,
                    "order_date": row.order_date.isoformat() if row.order_date else None,
                    "sla": row.sla,
                    "batch": row.batch,
                    "pic": row.pic,
                    "upload_date": row.upload_date.isoformat() if row.upload_date else None,
                    "remark": row.remark,
                    "interface_status": row.interface_status,
                    "task_id": row.task_id,
                    "order_number_flexo": row.order_number_flexo,
                    "order_status_flexo": row.order_status_flexo
                }
                for row in not_interfaced_results
            ],
            "interface_status_count": [
                {
                    "status": row.status,
                    "count": row.count,
                    "percentage": float(row.percentage)
                }
                for row in interface_status_results
            ],
            "order_status_count": [
                {
                    "status": row.status,
                    "count": row.count,
                    "percentage": float(row.percentage)
                }
                for row in order_status_results
            ],
            "processing_times": [],  # Can be added later if needed
            "last_updated": get_wib_now().isoformat()
        }
        
        logger.info(f"Advanced dashboard stats retrieved: {len(batch_results)} batches, {len(pic_results)} PICs")
        return result
        
    except Exception as e:
        logger.error(f"Error getting advanced dashboard stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get advanced dashboard stats: {str(e)}")

@router.get("/upload-history")
def get_dashboard_upload_history_optimized(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    db: Session = Depends(get_db)
):
    """
    Get upload history using optimized views
    """
    try:
        # Use the recent uploads view
        query = text("""
            SELECT batch, marketplace, brand, pic, total_orders, 
                   interfaced_orders, not_interfaced_orders, upload_date, interface_rate
            FROM dashboard_recent_uploads
            ORDER BY upload_date DESC
            LIMIT 100
        """)
        
        results = db.execute(query).fetchall()
        
        upload_history = [
            {
                "batch": row.batch,
                "marketplace": row.marketplace,
                "brand": row.brand,
                "pic": row.pic,
                "total_orders": row.total_orders,
                "interfaced_orders": row.interfaced_orders,
                "not_interfaced_orders": row.not_interfaced_orders,
                "upload_date": row.upload_date.isoformat() if row.upload_date else None,
                "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0
            }
            for row in results
        ]
        
        logger.info(f"Upload history retrieved: {len(upload_history)} records")
        return {
            "upload_history": upload_history,
            "total_records": len(upload_history),
            "last_updated": get_wib_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting upload history: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get upload history: {str(e)}")

@router.get("/performance-metrics")
def get_dashboard_performance_metrics(
    db: Session = Depends(get_db)
):
    """
    Get dashboard performance metrics
    """
    try:
        # Get performance metrics from various views
        metrics_query = text("""
            SELECT 
                (SELECT COUNT(*) FROM dashboard_brand_distribution) as total_brands,
                (SELECT COUNT(*) FROM dashboard_marketplace_distribution) as total_marketplaces,
                (SELECT COUNT(*) FROM dashboard_batch_distribution) as total_batches,
                (SELECT COUNT(*) FROM dashboard_pic_performance) as total_pics,
                (SELECT COUNT(*) FROM dashboard_not_interfaced_orders) as total_not_interfaced,
                (SELECT AVG(interface_rate) FROM dashboard_pic_performance) as avg_pic_interface_rate,
                (SELECT MAX(last_upload_date) FROM dashboard_pic_performance) as last_activity
        """)
        
        result = db.execute(metrics_query).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Performance metrics not found")
        
        metrics = {
            "total_brands": result.total_brands,
            "total_marketplaces": result.total_marketplaces,
            "total_batches": result.total_batches,
            "total_pics": result.total_pics,
            "total_not_interfaced": result.total_not_interfaced,
            "avg_pic_interface_rate": float(result.avg_pic_interface_rate) if result.avg_pic_interface_rate is not None else 0.0,
            "last_activity": result.last_activity.isoformat() if result.last_activity else None,
            "last_updated": get_wib_now().isoformat()
        }
        
        logger.info("Performance metrics retrieved successfully")
        return metrics
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")

@router.get("/trends")
def get_dashboard_trends(
    days: int = Query(30, description="Number of days for trend analysis"),
    db: Session = Depends(get_db)
):
    """
    Get dashboard trends over time
    """
    try:
        # Get daily trends
        trends_query = text("""
            SELECT date, count, interfaced_count, not_interfaced_count, interface_rate
            FROM dashboard_daily_evolution
            WHERE date >= CURRENT_DATE - INTERVAL ':days days'
            ORDER BY date DESC
        """)
        
        results = db.execute(trends_query, {"days": days}).fetchall()
        
        trends = [
            {
                "date": row.date.isoformat(),
                "total_orders": row.count,
                "interfaced_orders": row.interfaced_count,
                "not_interfaced_orders": row.not_interfaced_count,
                "interface_rate": float(row.interface_rate) if row.interface_rate is not None else 0.0
            }
            for row in results
        ]
        
        logger.info(f"Trends retrieved for {days} days: {len(trends)} data points")
        return {
            "trends": trends,
            "period_days": days,
            "last_updated": get_wib_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting trends: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get trends: {str(e)}")
