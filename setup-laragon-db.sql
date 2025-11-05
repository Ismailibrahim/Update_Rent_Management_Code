-- Laragon MySQL Database Setup Script
-- Run this script in your MySQL client (HeidiSQL, MySQL Workbench, or command line)

-- Create the database
CREATE DATABASE IF NOT EXISTS rent_management 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Verify the database was created
SHOW DATABASES LIKE 'rent_management';

-- Use the database
USE rent_management;

-- Display current database
SELECT DATABASE();

