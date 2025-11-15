-- SQL Queries to Check Maintenance Log Records
-- Run these queries to verify the maintenance log is working correctly

-- 1. Check which properties have maintenance requests
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    COUNT(mr.id) AS maintenance_request_count
FROM properties p
LEFT JOIN maintenance_requests mr ON mr.property_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(mr.id) > 0
ORDER BY maintenance_request_count DESC;

-- 2. Check which properties have maintenance costs (through rental units)
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    COUNT(mc.id) AS maintenance_cost_count,
    SUM(mc.repair_cost) AS total_repair_cost
FROM properties p
INNER JOIN rental_units ru ON ru.property_id = p.id
INNER JOIN rental_unit_assets rua ON rua.rental_unit_id = ru.id
INNER JOIN maintenance_costs mc ON mc.rental_unit_asset_id = rua.id
GROUP BY p.id, p.name
ORDER BY maintenance_cost_count DESC;

-- 3. Get a specific property with all its maintenance data (replace PROPERTY_ID with actual ID)
-- Example: Replace 1 with your property ID
SELECT 
    p.id AS property_id,
    p.name AS property_name,
    p.street,
    p.island,
    -- Maintenance Requests
    (SELECT COUNT(*) FROM maintenance_requests WHERE property_id = p.id) AS total_requests,
    -- Maintenance Costs
    (SELECT COUNT(*) 
     FROM maintenance_costs mc
     INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
     INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
     WHERE ru.property_id = p.id) AS total_costs,
    -- YTD Maintenance Costs (current year)
    (SELECT COALESCE(SUM(mc.repair_cost), 0)
     FROM maintenance_costs mc
     INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
     INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
     WHERE ru.property_id = p.id
     AND YEAR(COALESCE(mc.repair_date, mc.created_at)) = YEAR(CURDATE())) AS ytd_spend
FROM properties p
WHERE p.id = 1; -- CHANGE THIS TO YOUR PROPERTY ID

-- 4. Get detailed maintenance records for a specific property
-- Replace PROPERTY_ID with your property ID
SELECT 
    'Maintenance Request' AS record_type,
    mr.id,
    mr.title,
    mr.status,
    mr.request_date,
    mr.actual_cost,
    ru.unit_number,
    NULL AS repair_cost,
    NULL AS repair_date
FROM maintenance_requests mr
LEFT JOIN rental_units ru ON ru.id = mr.rental_unit_id
WHERE mr.property_id = 1 -- CHANGE THIS TO YOUR PROPERTY ID

UNION ALL

SELECT 
    'Maintenance Cost' AS record_type,
    mc.id,
    mc.description AS title,
    mc.status,
    mc.created_at AS request_date,
    NULL AS actual_cost,
    ru.unit_number,
    mc.repair_cost,
    mc.repair_date
FROM maintenance_costs mc
INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
WHERE ru.property_id = 1 -- CHANGE THIS TO YOUR PROPERTY ID
ORDER BY request_date DESC;

-- 5. Quick check: Find a property that should have maintenance data
SELECT 
    p.id,
    p.name,
    (SELECT COUNT(*) FROM maintenance_requests WHERE property_id = p.id) AS requests,
    (SELECT COUNT(*) 
     FROM maintenance_costs mc
     INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
     INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
     WHERE ru.property_id = p.id) AS costs
FROM properties p
WHERE (SELECT COUNT(*) FROM maintenance_requests WHERE property_id = p.id) > 0
   OR (SELECT COUNT(*) 
       FROM maintenance_costs mc
       INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
       INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
       WHERE ru.property_id = p.id) > 0
LIMIT 5;

