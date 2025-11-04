# Database Migration Guide: SQLite to MySQL

This guide covers migrating the Quotation Management System from SQLite to MySQL.

## Overview

The system has been updated to use MySQL as the primary database instead of SQLite for better performance, scalability, and production readiness.

## Prerequisites

- MySQL Server 8.0+ or MySQL Server 9.4+
- PHP 8.2+ with MySQL PDO extension
- Laravel application with existing SQLite data (if migrating)

## Migration Steps

### 1. Backup Existing Data (if applicable)

If you have existing data in SQLite that needs to be preserved:

```bash
# Navigate to Laravel project directory
cd quotation-system

# Export SQLite data to SQL file
sqlite3 database/database.sqlite .dump > backup_$(date +%Y%m%d_%H%M%S).sql

# Or export specific tables
sqlite3 database/database.sqlite ".dump users" > users_backup.sql
sqlite3 database/database.sqlite ".dump customers" > customers_backup.sql
sqlite3 database/database.sqlite ".dump products" > products_backup.sql
```

### 2. Update Environment Configuration

Edit the `.env` file in the `quotation-system` directory:

```env
# Change from SQLite to MySQL
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quotation_system
DB_USERNAME=root
DB_PASSWORD=

# Remove or comment out SQLite settings
# DB_DATABASE=database/database.sqlite
```

### 3. Create MySQL Database

Connect to MySQL and create the database:

```sql
-- Connect to MySQL
mysql -u root -p

-- Create database
CREATE DATABASE quotation_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Verify database creation
SHOW DATABASES;
```

### 4. Run Laravel Migrations

Execute the Laravel migrations to create all tables:

```bash
# Navigate to Laravel project
cd quotation-system

# Run migrations
php artisan migrate

# Run seeders to populate initial data
php artisan db:seed
```

### 5. Verify Migration

Test the database connection and verify data:

```bash
# Test database connection
php artisan tinker

# In tinker, run these commands:
User::count()           // Should return 2 (admin + demo users)
Customer::count()       // Should return 0 or more
Product::count()        // Should return 0 or more
```

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User authentication | id, username, email, password_hash, role |
| `customers` | Customer information | id, resort_name, contact_person, email |
| `products` | Product catalog | id, name, category_id, unit_price, brand |
| `quotations` | Quotation headers | id, quotation_number, customer_id, status |
| `quotation_items` | Line items | id, quotation_id, product_id, quantity, price |
| `shipments` | Shipment tracking | id, shipment_number, total_cost, currency |
| `shipment_items` | Shipment line items | id, shipment_id, product_id, percentage_share |

### Key Relationships

- `quotations` → `customers` (belongs to)
- `quotation_items` → `quotations` (belongs to)
- `quotation_items` → `products` (belongs to)
- `shipment_items` → `shipments` (belongs to)
- `shipment_items` → `products` (belongs to)

## Configuration Details

### MySQL Connection Settings

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quotation_system
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

### Laravel Database Configuration

The system uses the following MySQL-specific settings:

- **Charset**: `utf8mb4` (supports full Unicode including emojis)
- **Collation**: `utf8mb4_unicode_ci` (case-insensitive Unicode)
- **Engine**: InnoDB (default, supports transactions and foreign keys)
- **Strict Mode**: Enabled (prevents invalid data)

## Performance Considerations

### Indexes

The system includes optimized indexes for:
- User authentication (`username`, `email`)
- Quotation lookups (`quotation_number`, `customer_id`)
- Product searches (`name`, `category_id`)
- Shipment tracking (`shipment_number`)

### Query Optimization

- Uses Eloquent relationships for efficient joins
- Implements eager loading to prevent N+1 queries
- Includes database-level constraints and foreign keys

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```
   SQLSTATE[HY000] [2002] Connection refused
   ```
   - **Solution**: Ensure MySQL service is running
   - **Check**: `mysql -u root -p` should connect

2. **Database Not Found**
   ```
   SQLSTATE[HY000] [1049] Unknown database 'quotation_system'
   ```
   - **Solution**: Create database manually
   - **Command**: `CREATE DATABASE quotation_system;`

3. **Access Denied**
   ```
   SQLSTATE[HY000] [1045] Access denied for user 'root'@'localhost'
   ```
   - **Solution**: Check username/password in `.env`
   - **Alternative**: Create dedicated MySQL user

4. **Migration Errors**
   ```
   SQLSTATE[42S02]: Base table or view not found
   ```
   - **Solution**: Run migrations in correct order
   - **Command**: `php artisan migrate:fresh --seed`

### Data Migration Issues

If you need to migrate existing SQLite data:

1. **Export data from SQLite**:
   ```bash
   sqlite3 database/database.sqlite .dump > data_export.sql
   ```

2. **Convert SQLite syntax to MySQL**:
   - Remove SQLite-specific commands
   - Convert data types (INTEGER → INT, TEXT → VARCHAR)
   - Update AUTOINCREMENT to AUTO_INCREMENT

3. **Import to MySQL**:
   ```bash
   mysql -u root -p quotation_system < converted_data.sql
   ```

## Production Deployment

### Security Considerations

1. **Create dedicated MySQL user**:
   ```sql
   CREATE USER 'quotation_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON quotation_system.* TO 'quotation_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Update `.env` for production**:
   ```env
   DB_USERNAME=quotation_user
   DB_PASSWORD=secure_password
   ```

3. **Enable SSL connections** (if required):
   ```env
   DB_SSL_CA=/path/to/ca-cert.pem
   ```

### Backup Strategy

1. **Regular database backups**:
   ```bash
   mysqldump -u root -p quotation_system > backup_$(date +%Y%m%d).sql
   ```

2. **Automated backup script**:
   ```bash
   #!/bin/bash
   mysqldump -u root -p quotation_system | gzip > /backups/quotation_$(date +%Y%m%d_%H%M%S).sql.gz
   ```

## Support

For issues related to database migration:

1. Check Laravel logs: `storage/logs/laravel.log`
2. Verify MySQL error logs
3. Test database connection: `php artisan tinker`
4. Review migration status: `php artisan migrate:status`

## Version History

- **v1.0**: Initial SQLite implementation
- **v2.0**: Migrated to MySQL for production readiness
- **v2.1**: Added performance optimizations and indexes












