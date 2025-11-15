# Rental Unit Database Tables Structure

## Overview
When you create a new rental unit via the form at `/rental-units/new`, the following database tables are updated:

1. **`rental_units`** - Main table (ALWAYS updated)
2. **`rental_unit_assets`** - Pivot table (Updated ONLY if assets are assigned)

---

## 1. `rental_units` Table

This is the **primary table** that stores all rental unit information.

### Table Structure

```sql
CREATE TABLE `rental_units` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  
  -- Foreign Keys
  `property_id` BIGINT UNSIGNED NOT NULL,
  `tenant_id` BIGINT UNSIGNED NULL,
  
  -- Basic Information
  `unit_number` VARCHAR(50) NOT NULL,
  `unit_type` VARCHAR(255) NOT NULL,  -- Values: 'residential', 'office', 'shop', 'warehouse', 'other'
  `floor_number` INT NOT NULL,
  
  -- Financial Information
  `rent_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `deposit_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `currency` VARCHAR(10) DEFAULT 'MVR',
  
  -- Physical Details
  `number_of_rooms` INT DEFAULT 0,
  `number_of_toilets` INT DEFAULT 0,
  `square_feet` DECIMAL(8, 2) DEFAULT 0.00,
  
  -- Utility Meter Information
  `water_meter_number` VARCHAR(100) NULL,
  `water_billing_account` VARCHAR(100) NULL,
  `electricity_meter_number` VARCHAR(100) NULL,
  `electricity_billing_account` VARCHAR(100) NULL,
  
  -- Access Card Information
  `access_card_numbers` TEXT NULL,  -- Comma-separated card numbers
  
  -- Status and Dates
  `status` VARCHAR(255) DEFAULT 'available',  -- Values: 'available', 'occupied', 'maintenance', 'renovation', 'deactivated'
  `move_in_date` DATE NULL,
  `lease_end_date` DATE NULL,
  
  -- Additional Data
  `amenities` JSON NULL,
  `photos` JSON NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  
  -- Foreign Key Constraints
  FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE SET NULL,
  
  -- Indexes
  INDEX `idx_property_id` (`property_id`),
  INDEX `idx_tenant_id` (`tenant_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_unit_type` (`unit_type`),
  UNIQUE KEY `unique_property_unit_number` (`property_id`, `unit_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Fields from Form → Database Mapping

| Form Field | Database Column | Type | Required | Notes |
|------------|----------------|------|----------|-------|
| Property | `property_id` | BIGINT | ✅ Yes | Foreign key to `properties` table |
| Unit Number | `unit_number` | VARCHAR(50) | ✅ Yes | Must be unique per property |
| Unit Type | `unit_type` | VARCHAR(255) | ✅ Yes | Must be: residential, office, shop, warehouse, other |
| Floor Number | `floor_number` | INT | ✅ Yes | Minimum: 1 |
| Currency | `currency` | VARCHAR(10) | ✅ Yes | Default: 'MVR' |
| Number of Rooms | `number_of_rooms` | INT | ✅ Yes | Minimum: 0 |
| Number of Toilets | `number_of_toilets` | INT | ✅ Yes | Minimum: 0 |
| Square Feet | `square_feet` | DECIMAL(8,2) | ❌ No | Optional |
| Rent Amount | `rent_amount` | DECIMAL(10,2) | ✅ Yes | Minimum: 0 |
| Deposit Amount | `deposit_amount` | DECIMAL(10,2) | ✅ Yes | Minimum: 0 |
| Description | `notes` | TEXT | ❌ No | Optional |
| Water Meter Number | `water_meter_number` | VARCHAR(100) | ❌ No | Optional |
| Water Billing Account | `water_billing_account` | VARCHAR(100) | ❌ No | Optional |
| Electricity Meter Number | `electricity_meter_number` | VARCHAR(100) | ❌ No | Optional |
| Electricity Billing Account | `electricity_billing_account` | VARCHAR(100) | ❌ No | Optional |
| Card Numbers | `access_card_numbers` | TEXT | ❌ No | Comma-separated, must be unique across all units |

### Auto-Generated Fields

| Field | Value | Notes |
|-------|-------|-------|
| `id` | Auto-increment | Primary key |
| `status` | 'available' | Default status |
| `is_active` | TRUE | Default active state |
| `created_at` | Current timestamp | Auto-set on creation |
| `updated_at` | Current timestamp | Auto-updated on changes |

---

## 2. `rental_unit_assets` Table (Pivot Table)

This table is **only updated** when you assign assets to the rental unit during creation.

### Table Structure

```sql
CREATE TABLE `rental_unit_assets` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  
  -- Foreign Keys
  `rental_unit_id` BIGINT UNSIGNED NOT NULL,
  `asset_id` BIGINT UNSIGNED NOT NULL,
  
  -- Assignment Details
  `assigned_date` DATE NULL,
  `notes` TEXT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `quantity` INT DEFAULT 1,
  `status` VARCHAR(255) DEFAULT 'working',  -- Values: 'working', 'maintenance', 'repaired', 'needs_repair'
  `maintenance_notes` TEXT NULL,
  
  -- Timestamps
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  
  -- Foreign Key Constraints
  FOREIGN KEY (`rental_unit_id`) REFERENCES `rental_units`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  
  -- Unique Constraint
  UNIQUE KEY `unique_rental_unit_asset` (`rental_unit_id`, `asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Fields from Form → Database Mapping

| Form Field | Database Column | Type | Required | Notes |
|------------|----------------|------|----------|-------|
| Selected Assets | `asset_id` | BIGINT | ✅ Yes | Foreign key to `assets` table |
| - | `rental_unit_id` | BIGINT | ✅ Yes | Foreign key to `rental_units` table |
| - | `quantity` | INT | ❌ No | Default: 1 |
| - | `assigned_date` | DATE | ❌ No | Auto-set to current date |
| - | `is_active` | BOOLEAN | ❌ No | Default: TRUE |
| - | `status` | VARCHAR(255) | ❌ No | Default: 'working' |

---

## Related Tables (Referenced but NOT Updated)

### `properties` Table
- **Relationship**: `rental_units.property_id` → `properties.id`
- **Action**: Read-only (validation check)
- **Purpose**: Validates property exists and checks capacity limits

### `tenants` Table
- **Relationship**: `rental_units.tenant_id` → `tenants.id`
- **Action**: Read-only (validation check)
- **Purpose**: Validates tenant exists if assigned

### `assets` Table
- **Relationship**: `rental_unit_assets.asset_id` → `assets.id`
- **Action**: Read-only (validation check)
- **Purpose**: Validates asset exists before assignment

### `rental_unit_types` Table
- **Relationship**: Indirect (by name matching)
- **Action**: Read-only (reference)
- **Purpose**: Used to validate `unit_type` values

---

## Data Flow Diagram

```
Form Submission
    ↓
[Validation]
    ├─ Check property exists
    ├─ Check property capacity
    ├─ Check duplicate unit number
    ├─ Check duplicate access card numbers
    └─ Validate all required fields
    ↓
[Create Rental Unit]
    ├─ INSERT INTO rental_units
    │   ├─ property_id
    │   ├─ unit_number
    │   ├─ unit_type
    │   ├─ floor_number
    │   ├─ rent_amount
    │   ├─ deposit_amount
    │   ├─ currency
    │   ├─ number_of_rooms
    │   ├─ number_of_toilets
    │   ├─ square_feet
    │   ├─ water_meter_number
    │   ├─ water_billing_account
    │   ├─ electricity_meter_number
    │   ├─ electricity_billing_account
    │   ├─ access_card_numbers
    │   ├─ status (default: 'available')
    │   └─ notes (description)
    │
    └─ IF assets selected:
        └─ FOR EACH asset:
            └─ INSERT INTO rental_unit_assets
                ├─ rental_unit_id
                ├─ asset_id
                ├─ quantity (default: 1)
                ├─ assigned_date (current date)
                ├─ is_active (default: TRUE)
                └─ status (default: 'working')
```

---

## Example SQL Queries

### Insert a Rental Unit (Manual SQL)

```sql
INSERT INTO rental_units (
    property_id,
    unit_number,
    unit_type,
    floor_number,
    rent_amount,
    deposit_amount,
    currency,
    number_of_rooms,
    number_of_toilets,
    square_feet,
    water_meter_number,
    water_billing_account,
    electricity_meter_number,
    electricity_billing_account,
    access_card_numbers,
    status,
    notes,
    is_active,
    created_at,
    updated_at
) VALUES (
    1,                          -- property_id
    'A-101',                    -- unit_number
    'residential',              -- unit_type
    1,                          -- floor_number
    5000.00,                    -- rent_amount
    10000.00,                   -- deposit_amount
    'MVR',                      -- currency
    2,                          -- number_of_rooms
    1,                          -- number_of_toilets
    850.00,                     -- square_feet
    'WM-12345',                 -- water_meter_number
    'WB-67890',                 -- water_billing_account
    'EM-11111',                 -- electricity_meter_number
    'EB-22222',                 -- electricity_billing_account
    'CARD001, CARD002',         -- access_card_numbers
    'available',                -- status
    'Beautiful 2BR apartment',  -- notes
    TRUE,                       -- is_active
    NOW(),                      -- created_at
    NOW()                       -- updated_at
);
```

### Assign Assets to Rental Unit

```sql
INSERT INTO rental_unit_assets (
    rental_unit_id,
    asset_id,
    assigned_date,
    notes,
    is_active,
    quantity,
    status,
    created_at,
    updated_at
) VALUES (
    1,                          -- rental_unit_id (from above INSERT)
    5,                          -- asset_id
    NOW(),                      -- assigned_date
    'Assigned during unit creation',
    TRUE,                       -- is_active
    1,                          -- quantity
    'working',                  -- status
    NOW(),                      -- created_at
    NOW()                       -- updated_at
);
```

---

## Constraints and Validations

### Database-Level Constraints

1. **Unique Constraint**: `(property_id, unit_number)` - No duplicate unit numbers per property
2. **Foreign Key**: `property_id` must exist in `properties` table
3. **Foreign Key**: `tenant_id` must exist in `tenants` table (if not NULL)
4. **Cascade Delete**: If property is deleted, all rental units are deleted
5. **Set Null**: If tenant is deleted, `tenant_id` is set to NULL

### Application-Level Validations

1. **Property Capacity**: Cannot exceed `properties.number_of_rental_units`
2. **Access Card Uniqueness**: Access card numbers must be unique across ALL rental units
3. **Unit Type**: Must be one of: 'residential', 'office', 'shop', 'warehouse', 'other'
4. **Status**: Must be one of: 'available', 'occupied', 'maintenance', 'renovation', 'deactivated'
5. **Rent/Deposit**: Must be >= 0
6. **Rooms/Toilets**: Must be >= 0

---

## Summary

**Tables Updated:**
- ✅ `rental_units` - Always updated (main record)
- ✅ `rental_unit_assets` - Updated only if assets are assigned

**Tables Referenced (Read-Only):**
- 📖 `properties` - Validates property exists and checks capacity
- 📖 `tenants` - Validates tenant exists (if assigned)
- 📖 `assets` - Validates assets exist (if assigned)
- 📖 `rental_unit_types` - Reference for unit type validation

**Total Fields:**
- `rental_units`: 28 fields (including timestamps and foreign keys)
- `rental_unit_assets`: 9 fields (including timestamps and foreign keys)

