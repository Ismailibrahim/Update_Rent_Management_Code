# Rent Invoice Generation - How It Works

## Overview
The system automatically checks **ALL occupied rental units** when generating monthly rent invoices. This document explains the complete process.

## Process Flow

### 1. **Triggering Invoice Generation**
- User navigates to `/rent-invoices` page
- Clicks "Generate Monthly Rent Invoices" button
- Selects month, year, and due date offset (days after invoice date)
- System calls the backend API endpoint: `POST /api/rent-invoices/generate-monthly`

### 2. **Backend Processing** (`RentInvoiceController::generateMonthlyInvoices`)

#### Step 1: Get All Occupied Units
```php
$occupiedUnits = RentalUnit::with(['tenant', 'property'])
    ->where('status', 'occupied')
    ->whereNotNull('tenant_id')
    ->get();
```

**This query:**
- Finds ALL rental units with `status = 'occupied'`
- Ensures each unit has a `tenant_id` assigned
- Loads related tenant and property information
- **No filtering by property, unit type, or any other criteria - ALL occupied units are included**

#### Step 2: Process Each Unit
For each occupied unit, the system performs the following checks:

##### Check 1: Tenant Has Lease Dates
- **Skip if:** Tenant doesn't have `lease_start_date` or `lease_end_date` set
- **Reason:** Cannot determine if tenant should be invoiced for the selected month

##### Check 2: Lease Period Covers Selected Month
- **Skip if:** `lease_start_date > selected_month_end`
  - Tenant's lease hasn't started yet
- **Skip if:** `lease_end_date < selected_month_start`
  - Tenant's lease has already ended

##### Check 3: No Duplicate Invoice
- **Skip if:** An invoice already exists for this rental unit for the selected month/year
- **Prevents:** Creating duplicate invoices for the same unit in the same month

##### Check 4: Generate Invoice
If all checks pass:
- Creates a new `RentInvoice` record
- Uses `rent_amount` from the rental unit
- Sets invoice date to the 1st of the selected month
- Sets due date based on `due_date_offset` (default: 7 days)
- Creates a tenant ledger entry automatically

### 3. **Response Data**
The API returns:
```json
{
  "message": "Monthly rent invoices generated successfully",
  "total_occupied_units_checked": 10,
  "generated_count": 8,
  "invoices": [...],
  "skipped_tenants": [...],
  "skipped_count": 2,
  "duplicate_invoices": [...],
  "duplicate_count": 0,
  "errors": []
}
```

### 4. **Frontend Display**
The frontend now shows:
- **Total occupied units checked** - Confirms all units were processed
- **Number of invoices generated** - How many new invoices were created
- **Skipped tenants** - Units that were skipped with reasons
- **Duplicate invoices** - Units that already had invoices for that month

## Key Points

✅ **ALL occupied units are checked** - The system doesn't skip any occupied unit  
✅ **Automatic processing** - No manual selection needed  
✅ **Lease period validation** - Only generates invoices for active leases  
✅ **Duplicate prevention** - Won't create duplicate invoices  
✅ **Detailed logging** - All actions are logged for debugging  
✅ **Comprehensive feedback** - User sees exactly what happened  

## What Gets Skipped?

Units are skipped if:
1. **No lease dates** - Tenant doesn't have lease_start_date or lease_end_date
2. **Lease not started** - Lease starts after the selected month
3. **Lease ended** - Lease ended before the selected month
4. **Duplicate invoice** - Invoice already exists for that unit/month/year

## Logging

The system logs:
- **Start:** Total occupied units found, list of all units
- **Per Unit:** Details when generating each invoice
- **Completion:** Summary of results (generated, skipped, duplicates, errors)

Check logs at: `backend/storage/logs/laravel.log`

## Example Scenario

**Database State:**
- 10 rental units total
- 7 units with status = 'occupied' and tenant_id set
- 3 units with status = 'available'

**User Action:**
- Generates invoices for January 2025

**System Behavior:**
1. Finds 7 occupied units
2. Checks each unit:
   - 5 units: Lease covers January → **Invoice generated** ✅
   - 1 unit: Lease starts in February → **Skipped** ⏭️
   - 1 unit: Already has January invoice → **Skipped (duplicate)** ⏭️
3. Returns: `Checked 7 occupied units. Generated 5 invoices (2 skipped)`

## Troubleshooting

### "No occupied rental units found"
- Check that rental units have `status = 'occupied'`
- Verify that `tenant_id` is set on the rental unit
- Check the rental units page to see which units are occupied

### "No invoices generated"
- Check if all units already have invoices for that month
- Verify lease dates cover the selected month
- Check the skipped_tenants array in the response for details

### "Some units skipped"
- Review the `skipped_tenants` array in the response
- Common reasons:
  - Missing lease dates
  - Lease period doesn't cover selected month
  - Duplicate invoice already exists

## Recent Improvements

1. **Enhanced Logging** - Added detailed logs showing all units checked
2. **Better Feedback** - Frontend now shows total units checked
3. **Fixed Bug** - Removed reference to non-existent `financial` property
4. **Clearer Messages** - More informative success/error messages

