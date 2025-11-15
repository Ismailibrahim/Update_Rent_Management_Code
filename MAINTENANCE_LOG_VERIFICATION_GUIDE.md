# Maintenance Log Verification Guide

## What to Check

After the fixes, you need to verify that the maintenance log table and YTD card are displaying correctly on the property details page.

## Step-by-Step Verification

### 1. Find a Property with Maintenance Data

Run this query to find properties that have maintenance records:

```sql
SELECT 
    p.id,
    p.name,
    (SELECT COUNT(*) FROM maintenance_requests WHERE property_id = p.id) AS maintenance_requests,
    (SELECT COUNT(*) 
     FROM maintenance_costs mc
     INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
     INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
     WHERE ru.property_id = p.id) AS maintenance_costs
FROM properties p
WHERE (SELECT COUNT(*) FROM maintenance_requests WHERE property_id = p.id) > 0
   OR (SELECT COUNT(*) 
       FROM maintenance_costs mc
       INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
       INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
       WHERE ru.property_id = p.id) > 0
LIMIT 5;
```

**Note the `property_id` from the results** - you'll use this to test.

### 2. Check the Property Details Page

1. Go to the property details page: `/properties/{property_id}/details`
2. Click on the **"Maintenance Log"** tab
3. Verify the following:

#### ✅ Maintenance Log Table Should Show:
- **Maintenance Requests** that have `property_id` matching the property
- The count in the header should match: `Maintenance Log (X)` where X is the number of requests

#### ✅ Total Maintenance Spend YTD Card Should Show:
- Sum of all `repair_cost` from `maintenance_costs` where:
  - The cost is linked to a `rental_unit_asset` 
  - That asset belongs to a `rental_unit`
  - That rental unit belongs to the property
  - The `repair_date` (or `created_at` if no repair_date) is in the current year (2025)

### 3. Test the Refresh Functionality

1. While on the Maintenance Log tab, click the **"Refresh"** button
2. The data should reload and update if there are new records

### 4. Test API Endpoints Directly

You can test the API endpoints directly to verify they're returning the correct data:

#### Test Maintenance Requests API:
```
GET /api/maintenance?property_id={property_id}&per_page=1000
```

Expected response structure:
```json
{
  "success": true,
  "maintenance_requests": [...],  // Array of maintenance requests
  "pagination": {...}
}
```

#### Test Maintenance Costs API:
```
GET /api/maintenance-costs?property_id={property_id}&per_page=1000
```

Expected response structure:
```json
{
  "success": true,
  "maintenance_costs": [...],  // Array of maintenance costs
  "pagination": {...}
}
```

### 5. Common Issues to Check

#### If the table is empty but you know there's data:

1. **Check the property_id filter is working:**
   ```sql
   -- For maintenance requests (direct link)
   SELECT * FROM maintenance_requests WHERE property_id = {property_id};
   
   -- For maintenance costs (through relationships)
   SELECT mc.* 
   FROM maintenance_costs mc
   INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
   INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
   WHERE ru.property_id = {property_id};
   ```

2. **Check the year filter for YTD:**
   ```sql
   SELECT 
       mc.id,
       mc.repair_cost,
       mc.repair_date,
       mc.created_at,
       YEAR(COALESCE(mc.repair_date, mc.created_at)) AS year
   FROM maintenance_costs mc
   INNER JOIN rental_unit_assets rua ON rua.id = mc.rental_unit_asset_id
   INNER JOIN rental_units ru ON ru.id = rua.rental_unit_id
   WHERE ru.property_id = {property_id}
   AND YEAR(COALESCE(mc.repair_date, mc.created_at)) = 2025;
   ```

#### If the YTD card shows 0 but there are costs:

- Check that the `repair_date` or `created_at` is in the current year (2025)
- Check that the `repair_cost` values are not NULL
- Check that the currency is being displayed correctly

### 6. Example Test Record

If you want to create a test record to verify:

```sql
-- First, get a property with rental units
SELECT p.id AS property_id, ru.id AS rental_unit_id, rua.id AS rental_unit_asset_id
FROM properties p
INNER JOIN rental_units ru ON ru.property_id = p.id
INNER JOIN rental_unit_assets rua ON rua.rental_unit_id = ru.id
LIMIT 1;

-- Then create a test maintenance cost (replace the IDs from above)
INSERT INTO maintenance_costs (
    rental_unit_asset_id,
    repair_cost,
    currency_id,
    description,
    repair_date,
    status,
    created_at,
    updated_at
) VALUES (
    {rental_unit_asset_id},  -- From query above
    500.00,
    (SELECT id FROM currencies WHERE code = 'MVR' LIMIT 1),
    'Test maintenance repair',
    CURDATE(),  -- Current date (should be in 2025)
    'paid',
    NOW(),
    NOW()
);

-- Create a test maintenance request
INSERT INTO maintenance_requests (
    title,
    description,
    property_id,
    rental_unit_id,
    priority,
    status,
    request_date,
    created_at,
    updated_at
) VALUES (
    'Test Maintenance Request',
    'This is a test maintenance request to verify the log is working',
    {property_id},  -- From query above
    {rental_unit_id},  -- From query above
    'medium',
    'completed',
    CURDATE(),
    NOW(),
    NOW()
);
```

## Summary

**Key Records to Check:**
1. ✅ A property that has `maintenance_requests` with `property_id` set
2. ✅ A property that has `maintenance_costs` linked through `rental_unit_assets` → `rental_units` → `properties`
3. ✅ Maintenance costs with `repair_date` or `created_at` in 2025 for YTD calculation
4. ✅ The property details page shows the correct count and data

**Quick Test:**
- Navigate to `/properties/{id}/details` where `{id}` is a property with maintenance data
- Click "Maintenance Log" tab
- Verify table shows maintenance requests
- Verify YTD card shows sum of 2025 maintenance costs
- Click "Refresh" button to test refresh functionality

