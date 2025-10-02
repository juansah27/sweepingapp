-- Complete Dashboard Views Creation Script
-- Run this to recreate ALL dashboard views after ALTER TABLE or database restore

-- Drop all views first (in reverse dependency order)
DROP VIEW IF EXISTS dashboard_order_status_summary CASCADE;
DROP VIEW IF EXISTS dashboard_interface_status_summary CASCADE;
DROP VIEW IF EXISTS dashboard_hourly_evolution CASCADE;
DROP VIEW IF EXISTS dashboard_daily_evolution CASCADE;
DROP VIEW IF EXISTS dashboard_not_interfaced_orders CASCADE;
DROP VIEW IF EXISTS dashboard_recent_uploads CASCADE;
DROP VIEW IF EXISTS dashboard_pic_performance CASCADE;
DROP VIEW IF EXISTS dashboard_batch_distribution CASCADE;
DROP VIEW IF EXISTS dashboard_marketplace_distribution CASCADE;
DROP VIEW IF EXISTS clean_orders CASCADE;

-- 0. clean_orders (deduplicated orders - MUST BE CREATED FIRST)
CREATE VIEW clean_orders AS
SELECT DISTINCT ON ("OrderNumber") 
    "Id", "Marketplace", "Brand", "OrderNumber", "OrderStatus", "AWB", "Transporter", 
    "OrderDate", "SLA", "Batch", "PIC", "UploadDate", "Remarks", "InterfaceStatus", "TaskId", 
    "OrderNumberFlexo", "OrderStatusFlexo"
FROM uploaded_orders
ORDER BY "OrderNumber", "UploadDate" DESC;

-- 1. dashboard_marketplace_distribution
CREATE VIEW dashboard_marketplace_distribution AS
SELECT 
    "Marketplace" as marketplace,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders), 2) as percentage,
    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count
FROM uploaded_orders 
WHERE "Marketplace" IS NOT NULL AND "Marketplace" != ''
GROUP BY "Marketplace" 
ORDER BY count DESC;

-- 2. dashboard_batch_distribution
CREATE VIEW dashboard_batch_distribution AS
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
WHERE "Batch" IS NOT NULL AND "Batch" != ''
GROUP BY "Batch" 
ORDER BY count DESC;

-- 3. dashboard_pic_performance
CREATE VIEW dashboard_pic_performance AS
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
WHERE "PIC" IS NOT NULL AND "PIC" != ''
GROUP BY "PIC" 
ORDER BY total_uploads DESC;

-- 4. dashboard_recent_uploads
CREATE VIEW dashboard_recent_uploads AS
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
WHERE "Batch" IS NOT NULL AND "Batch" != ''
GROUP BY "Batch", "Marketplace", "Brand", "PIC"
ORDER BY upload_date DESC;

-- 5. dashboard_not_interfaced_orders
CREATE VIEW dashboard_not_interfaced_orders AS
SELECT 
    "Id" as id,
    "Marketplace" as marketplace,
    "Brand" as brand,
    "OrderNumber" as order_number,
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
WHERE "InterfaceStatus" != 'Interface';

-- 6. dashboard_daily_evolution
CREATE VIEW dashboard_daily_evolution AS
SELECT 
    DATE("UploadDate") as date,
    COUNT(*) as count,
    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count,
    ROUND(
        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as interface_rate
FROM uploaded_orders 
WHERE "UploadDate" IS NOT NULL
GROUP BY DATE("UploadDate")
ORDER BY date DESC;

-- 7. dashboard_hourly_evolution
CREATE VIEW dashboard_hourly_evolution AS
SELECT 
    EXTRACT(HOUR FROM "UploadDate")::integer as hour,
    LPAD(EXTRACT(HOUR FROM "UploadDate")::text, 2, '0') || ':00' as hour_label,
    COUNT(*) as count,
    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count,
    ROUND(
        COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) * 100.0 / 
        NULLIF(COUNT(*), 0), 2
    ) as interface_rate
FROM uploaded_orders 
WHERE "UploadDate" IS NOT NULL
  AND "UploadDate" >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM "UploadDate")
ORDER BY hour;

-- 8. dashboard_interface_status_summary
CREATE VIEW dashboard_interface_status_summary AS
SELECT 
    "InterfaceStatus" as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders), 2) as percentage,
    MIN("UploadDate") as first_seen,
    MAX("UploadDate") as last_seen
FROM uploaded_orders 
WHERE "InterfaceStatus" IS NOT NULL AND "InterfaceStatus" != ''
GROUP BY "InterfaceStatus" 
ORDER BY count DESC;

-- 9. dashboard_order_status_summary
CREATE VIEW dashboard_order_status_summary AS
SELECT 
    "OrderStatusFlexo" as status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM uploaded_orders), 2) as percentage,
    COUNT(CASE WHEN "InterfaceStatus" = 'Interface' THEN 1 END) as interfaced_count,
    COUNT(CASE WHEN "InterfaceStatus" != 'Interface' THEN 1 END) as not_interfaced_count
FROM uploaded_orders 
WHERE "OrderStatusFlexo" IS NOT NULL AND "OrderStatusFlexo" != ''
GROUP BY "OrderStatusFlexo" 
ORDER BY count DESC;

-- Grant permissions on all views
GRANT SELECT ON clean_orders TO sweeping_user;
GRANT SELECT ON dashboard_marketplace_distribution TO sweeping_user;
GRANT SELECT ON dashboard_batch_distribution TO sweeping_user;
GRANT SELECT ON dashboard_pic_performance TO sweeping_user;
GRANT SELECT ON dashboard_recent_uploads TO sweeping_user;
GRANT SELECT ON dashboard_not_interfaced_orders TO sweeping_user;
GRANT SELECT ON dashboard_daily_evolution TO sweeping_user;
GRANT SELECT ON dashboard_hourly_evolution TO sweeping_user;
GRANT SELECT ON dashboard_interface_status_summary TO sweeping_user;
GRANT SELECT ON dashboard_order_status_summary TO sweeping_user;

-- Log completion
SELECT '✅ All dashboard views created successfully!' as status;

