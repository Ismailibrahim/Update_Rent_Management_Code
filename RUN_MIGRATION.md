# Running the Migration to Make Rental Unit Fields Optional

Due to PHP configuration issues, you have two options to run the migration:

## Option 1: Run SQL Directly (Recommended)

Connect to your MySQL database and run this SQL:

```sql
ALTER TABLE `rental_units` 
  MODIFY COLUMN `floor_number` INT NULL,
  MODIFY COLUMN `number_of_rooms` INT NULL,
  MODIFY COLUMN `number_of_toilets` INT NULL;
```

You can run this via:
- phpMyAdmin (if available)
- MySQL command line
- Any MySQL client

## Option 2: Fix PHP Configuration and Run Migration

If you can fix the PHP ionCube Loader issue, then run:

```bash
cd /home/htmaldives/rent-management/backend
php artisan migrate
```

## Option 3: Use the Manual SQL File

A SQL file has been created at:
`/home/htmaldives/rent-management/backend/database/migrations/manual_sql_make_fields_optional.sql`

You can import this file directly into your database.

## Database Connection Details

From your .env file:
- Database: `rent_management`
- Host: `127.0.0.1`
- Port: `3306`
- User: `laravel`

## Verification

After running the migration, verify with:

```sql
SHOW COLUMNS FROM `rental_units` WHERE Field IN ('floor_number', 'number_of_rooms', 'number_of_toilets');
```

The `Null` column should show `YES` for all three fields.

