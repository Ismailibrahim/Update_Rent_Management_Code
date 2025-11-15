-- Manual SQL script to make rental unit fields optional
-- Run this if you cannot run php artisan migrate
-- Execute this SQL directly in your database

ALTER TABLE `rental_units` 
  MODIFY COLUMN `floor_number` INT NULL,
  MODIFY COLUMN `number_of_rooms` INT NULL,
  MODIFY COLUMN `number_of_toilets` INT NULL;

