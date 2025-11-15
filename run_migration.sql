-- SQL Migration: Make rental unit fields optional
-- Run this directly in your MySQL database (phpMyAdmin, MySQL Workbench, or command line)

USE rent_management;

ALTER TABLE `rental_units` 
  MODIFY COLUMN `floor_number` INT NULL,
  MODIFY COLUMN `number_of_rooms` INT NULL,
  MODIFY COLUMN `number_of_toilets` INT NULL;

-- Verify the changes
SELECT 
    COLUMN_NAME, 
    IS_NULLABLE, 
    COLUMN_TYPE, 
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'rent_management' 
    AND TABLE_NAME = 'rental_units'
    AND COLUMN_NAME IN ('floor_number', 'number_of_rooms', 'number_of_toilets');

