# Automatic Rent Invoice Generation - Setup Guide

## Overview
This feature automates the generation of rent invoices for all occupied rental units on a configurable date each month. The system runs a scheduled task daily that checks if it's the configured invoice generation date and automatically generates invoices for all occupied units.

## Components Created

### 1. Database
- **Migration**: `backend/database/migrations/2025_12_22_000000_create_system_settings_table.php`
- **Model**: `backend/app/Models/SystemSetting.php`
- Stores configuration settings:
  - `invoice_generation_date`: Day of month (1-31) to generate invoices
  - `invoice_generation_enabled`: Enable/disable automatic generation
  - `invoice_due_date_offset`: Days after invoice date to set due date (default: 7)

### 2. Console Command
- **File**: `backend/app/Console/Commands/GenerateRentInvoicesCommand.php`
- **Command**: `php artisan invoices:generate-rent`
- **Options**: `--force` to generate even if not the scheduled date
- Generates invoices for all occupied rental units for the current month

### 3. Scheduled Task
- **File**: `backend/bootstrap/app.php`
- Runs daily at 12:01 AM
- Checks if today is the configured invoice generation date
- Only generates if automatic generation is enabled

### 4. API Endpoints
- **GET** `/api/settings/invoice-generation` - Get current settings
- **POST** `/api/settings/invoice-generation` - Update settings
- **Controller**: `backend/app/Http/Controllers/Api/SettingsController.php`

### 5. Frontend UI
- **File**: `frontend/src/app/settings/page.tsx`
- New "Automatic Invoice Generation" card in Settings page
- Allows configuration of:
  - Enable/disable automatic generation
  - Invoice generation date (1-31)
  - Due date offset (days)

## Setup Instructions

### Step 1: Run Migration
```bash
cd backend
php artisan migrate
```

This will create the `system_settings` table.

### Step 2: Configure Settings
1. Navigate to Settings page: `http://localhost:3000/settings`
2. Find the "Automatic Invoice Generation" section
3. Enable automatic generation by checking the checkbox
4. Set the invoice generation date (e.g., 1 for the 1st of each month)
5. Set the due date offset (e.g., 7 for 7 days after invoice date)
6. Click "Save Invoice Generation Settings"

### Step 3: Ensure Laravel Scheduler is Running
The scheduled task needs to run daily. You need to set up a cron job on your server:

```bash
* * * * * cd /path-to-your-project/backend && php artisan schedule:run >> /dev/null 2>&1
```

Or if using Laravel Sail/Docker:
```bash
* * * * * cd /path-to-your-project && docker-compose exec -T app php artisan schedule:run >> /dev/null 2>&1
```

**Note**: The scheduler runs every minute, but the command itself checks if it's the right date.

## Testing

### Test 1: Manual Generation (Force)
Test the command manually with the `--force` flag:

```bash
cd backend
php artisan invoices:generate-rent --force
```

This will generate invoices for the current month regardless of the configured date.

**Expected Output:**
- Lists all occupied rental units found
- Shows invoices generated
- Shows skipped tenants (if any)
- Shows duplicate invoices (if any)
- Shows errors (if any)

### Test 2: Configuration via UI
1. Go to `http://localhost:3000/settings`
2. Enable automatic invoice generation
3. Set generation date to today's date (for testing)
4. Save settings
5. Check that settings are saved correctly

### Test 3: Automatic Generation
1. Set the invoice generation date to today's date
2. Enable automatic generation
3. Wait for the scheduled task to run (or manually trigger: `php artisan schedule:run`)
4. Check the rent invoices page to see if invoices were generated
5. Check logs: `backend/storage/logs/laravel.log` for generation details

### Test 4: Verify Invoice Generation Logic
The system should:
- ✅ Generate invoices only for occupied rental units
- ✅ Skip units without tenants
- ✅ Skip tenants without lease dates
- ✅ Skip if lease starts after current month
- ✅ Skip if lease ended before current month
- ✅ Skip if invoice already exists for the month
- ✅ Use rental unit's rent amount
- ✅ Set invoice date to 1st of current month
- ✅ Set due date based on offset
- ✅ Create tenant ledger entries automatically

## Configuration Settings

### Default Values
- **Invoice Generation Date**: 1 (1st of each month)
- **Invoice Generation Enabled**: false (disabled by default)
- **Due Date Offset**: 7 days

### Settings Location
Settings are stored in the `system_settings` table:
- `setting_key`: `invoice_generation_date`, `invoice_generation_enabled`, `invoice_due_date_offset`
- `setting_value`: The actual value
- `description`: Human-readable description

## How It Works

1. **Daily Check**: The scheduler runs the command daily at 12:01 AM
2. **Date Check**: Command checks if today's day matches the configured generation date
3. **Enable Check**: Verifies that automatic generation is enabled
4. **Unit Selection**: Finds all rental units with status 'occupied' and a tenant
5. **Lease Validation**: Checks if tenant has active lease for current month
6. **Duplicate Check**: Skips if invoice already exists for the unit/month
7. **Invoice Creation**: Creates invoice with:
   - Invoice number: `INV-YYMMDD-{unit_id}`
   - Invoice date: 1st of current month
   - Due date: Invoice date + offset days
   - Amount: Rental unit's rent amount
   - Status: 'pending'
8. **Ledger Entry**: Automatically creates tenant ledger entry (via model event)

## Logging

All invoice generation activities are logged to:
- **Console**: When running manually
- **Log File**: `backend/storage/logs/laravel.log`

Log entries include:
- Start of generation process
- Number of occupied units found
- Each invoice generated
- Skipped tenants and reasons
- Duplicate invoices
- Errors encountered
- Summary statistics

## Troubleshooting

### Invoices Not Generating
1. Check if automatic generation is enabled in settings
2. Verify the generation date matches today's date
3. Check if scheduler is running: `php artisan schedule:list`
4. Check logs: `tail -f backend/storage/logs/laravel.log`
5. Manually test: `php artisan invoices:generate-rent --force`

### Scheduler Not Running
1. Verify cron job is set up correctly
2. Check Laravel logs for scheduler errors
3. Test manually: `php artisan schedule:run`

### No Occupied Units Found
- Ensure rental units have status 'occupied'
- Ensure rental units have a tenant assigned
- Check tenant has lease dates set

### Duplicate Invoices
- System automatically prevents duplicates
- If duplicates exist, check invoice_date month/year matches

## API Usage

### Get Settings
```bash
GET /api/settings/invoice-generation
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "invoice_generation_date": 1,
    "invoice_generation_enabled": true,
    "invoice_due_date_offset": 7
  }
}
```

### Update Settings
```bash
POST /api/settings/invoice-generation
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "invoice_generation_date": 1,
  "invoice_generation_enabled": true,
  "invoice_due_date_offset": 7
}

Response:
{
  "success": true,
  "message": "Invoice generation settings updated successfully",
  "data": {
    "invoice_generation_date": 1,
    "invoice_generation_enabled": true,
    "invoice_due_date_offset": 7
  }
}
```

## Next Steps

1. Run the migration to create the system_settings table
2. Configure the invoice generation date in Settings
3. Enable automatic generation
4. Set up the Laravel scheduler (cron job)
5. Test with `--force` flag first
6. Monitor logs for the first automatic generation

## Notes

- The system generates invoices for the **current month** on the configured date
- Invoices are generated with invoice_date = 1st of the current month
- Due date = invoice_date + offset days
- The command can be run manually anytime with `--force` flag
- All existing invoice generation logic (lease validation, duplicate checking) is preserved

