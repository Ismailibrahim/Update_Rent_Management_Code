-- Seed property types into rental_unit_types table
-- This will insert property types if they don't already exist

INSERT INTO rental_unit_types (name, description, is_active, created_at, updated_at)
SELECT * FROM (
    SELECT 'Apartment' as name, 'Apartment building or unit' as description, 1 as is_active, NOW() as created_at, NOW() as updated_at
    UNION SELECT 'House', 'Residential house', 1, NOW(), NOW()
    UNION SELECT 'Villa', 'Luxury villa', 1, NOW(), NOW()
    UNION SELECT 'Commercial', 'Commercial property', 1, NOW(), NOW()
    UNION SELECT 'Office', 'Office space', 1, NOW(), NOW()
    UNION SELECT 'Shop', 'Retail shop', 1, NOW(), NOW()
    UNION SELECT 'Warehouse', 'Storage warehouse', 1, NOW(), NOW()
    UNION SELECT 'Land', 'Vacant land', 1, NOW(), NOW()
    UNION SELECT 'Residential', 'Residential property', 1, NOW(), NOW()
    UNION SELECT 'Other', 'Other property type', 1, NOW(), NOW()
) AS temp
WHERE NOT EXISTS (
    SELECT 1 FROM rental_unit_types 
    WHERE LOWER(name) = LOWER(temp.name)
);

