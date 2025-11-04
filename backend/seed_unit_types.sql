-- SQL script to seed rental unit types
-- Run this directly in your MySQL database

INSERT INTO rental_unit_types (name, description, category, is_active, created_at, updated_at)
VALUES 
    ('Residential', 'Apartment, house, or other residential unit', 'unit', 1, NOW(), NOW()),
    ('Office', 'Commercial office space', 'unit', 1, NOW(), NOW()),
    ('Shop', 'Retail shop or store space', 'unit', 1, NOW(), NOW()),
    ('Warehouse', 'Storage or warehouse facility', 'unit', 1, NOW(), NOW()),
    ('Other', 'Other types of rental units', 'unit', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    category = 'unit',
    is_active = 1,
    updated_at = NOW();

-- Update existing records that might have wrong category
UPDATE rental_unit_types 
SET category = 'unit', is_active = 1, updated_at = NOW()
WHERE LOWER(name) IN ('residential', 'office', 'shop', 'warehouse', 'other')
  AND category != 'unit';

