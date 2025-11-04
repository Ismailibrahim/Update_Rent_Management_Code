# How to Find Your MySQL Password

## Option 1: Check cPanel (Most Common)

1. **Log into cPanel** (usually `https://yourdomain.com/cpanel` or provided by your host)
2. Go to **"MySQL Databases"** section
3. Look for **"Current Users"** - you'll see the MySQL username
4. Click **"Change Password"** next to your user to reset it, OR
5. Check if there's a password manager or notes section

## Option 2: Check Your Hosting Panel

If you're using a hosting provider:
- Check their control panel/dashboard
- Look for "Databases" or "MySQL" section
- Check email notifications - many hosts send database credentials via email

## Option 3: Check .env File (Already Found)

The password in your `.env` file is: `password`
But this might be different from the actual MySQL password if:
- The .env file was copied from a template
- The password was changed in MySQL but not updated in .env
- There's a different MySQL user being used

## Option 4: Reset MySQL Password in cPanel

1. Log into cPanel
2. Go to **MySQL Databases**
3. Find your user (likely `laravel` or `yourusername_laravel`)
4. Click **"Change Password"**
5. Set a new password
6. Update the `.env` file with the new password

## Option 5: Use phpMyAdmin (No Password Needed)

If you can access phpMyAdmin through cPanel:
1. Click on phpMyAdmin in cPanel
2. It will log you in automatically
3. Select `rent_management` database
4. Go to SQL tab
5. Run the migration SQL

## Quick Migration SQL (for phpMyAdmin)

```sql
ALTER TABLE `rental_units` 
  MODIFY COLUMN `floor_number` INT NULL,
  MODIFY COLUMN `number_of_rooms` INT NULL,
  MODIFY COLUMN `number_of_toilets` INT NULL;
```

## Note

The application should still work with default values even without the migration. The backend code sets defaults:
- `floor_number` = 1 (if not provided)
- `number_of_rooms` = 0 (if not provided)  
- `number_of_toilets` = 0 (if not provided)

So you can use the form now, and run the migration later when you have access.

