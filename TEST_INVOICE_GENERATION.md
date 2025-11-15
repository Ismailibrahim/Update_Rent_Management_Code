# Testing Automatic Invoice Generation - Step by Step Guide

## Quick Test Steps

### Step 1: Run the Migration
First, make sure the database table exists:

```bash
cd backend
php artisan migrate
```

This creates the `system_settings` table.

### Step 2: Test the Command Manually (Easiest Test)
Run the command with `--force` flag to generate invoices immediately:

```bash
cd backend
php artisan invoices:generate-rent --force
```

**What to expect:**
- You'll see output showing:
  - Number of occupied units found
  - Invoices generated
  - Any skipped tenants
  - Any duplicate invoices
  - Any errors

**Example output:**
```
Starting automatic rent invoice generation...
Generating invoices for 2025-12-22 (Generation date: 1)
Found 5 occupied rental units
Generated invoice INV-251201-123 for Unit 101
Generated invoice INV-251201-124 for Unit 102
...

=== Invoice Generation Summary ===
Total occupied units checked: 5
Invoices generated: 3
Skipped tenants: 1
Duplicate invoices: 1
Errors: 0

Invoice generation completed successfully!
```

### Step 3: Verify Invoices Were Created
1. Go to: `http://localhost:3000/rent-invoices`
2. Check if new invoices appear for the current month
3. Verify invoice details (amount, due date, etc.)

### Step 4: Test the Settings API
Test the API endpoints to configure settings:

**Get current settings:**
```bash
# Using curl (replace YOUR_TOKEN with your actual token)
curl -X GET http://localhost:8000/api/settings/invoice-generation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Update settings:**
```bash
curl -X POST http://localhost:8000/api/settings/invoice-generation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoice_generation_date": 1,
    "invoice_generation_enabled": true,
    "invoice_due_date_offset": 7
  }'
```

### Step 5: Test via UI (Recommended)
1. **Open Settings Page:**
   - Navigate to: `http://localhost:3000/settings`
   - Scroll down to find "Automatic Invoice Generation" section

2. **Configure Settings:**
   - ✅ Check "Enable automatic invoice generation"
   - Set "Invoice Generation Date" to today's date (for testing)
   - Set "Due Date Offset" to 7 (or your preference)
   - Click "Save Invoice Generation Settings"

3. **Verify Settings Saved:**
   - Refresh the page
   - Settings should persist

### Step 6: Test Automatic Generation (Date-Based)
To test the automatic date checking:

1. **Set generation date to today:**
   - In Settings, set "Invoice Generation Date" to today's day (e.g., if today is 22nd, set to 22)

2. **Run the scheduler manually:**
   ```bash
   cd backend
   php artisan schedule:run
   ```

3. **Check results:**
   - If today matches the date, invoices should be generated
   - If not, you'll see: "Today is not the invoice generation date"

### Step 7: Check Logs
View detailed logs:

```bash
# Windows PowerShell
Get-Content backend\storage\logs\laravel.log -Tail 50

# Or open the file
notepad backend\storage\logs\laravel.log
```

Look for entries like:
- "Rent Invoice Generation Started"
- "Generating Invoice for Unit"
- "Automatic Rent Invoice Generation Completed"

## Testing Scenarios

### Scenario 1: Generate for Current Month
```bash
cd backend
php artisan invoices:generate-rent --force
```
This generates invoices for the current month regardless of date.

### Scenario 2: Test with Different Dates
1. Set generation date to tomorrow's date
2. Run: `php artisan schedule:run`
3. Should skip (not the right date)
4. Change date to today
5. Run again: `php artisan schedule:run`
6. Should generate invoices

### Scenario 3: Test Duplicate Prevention
1. Run: `php artisan invoices:generate-rent --force`
2. Run again: `php artisan invoices:generate-rent --force`
3. Second run should show "Duplicate invoices" for units that already have invoices

### Scenario 4: Test with No Occupied Units
If you have no occupied units:
- Command will show: "Found 0 occupied rental units"
- No invoices will be generated (this is expected)

## Quick Test Checklist

- [ ] Migration ran successfully
- [ ] Command runs without errors: `php artisan invoices:generate-rent --force`
- [ ] Invoices appear in `/rent-invoices` page
- [ ] Settings page shows "Automatic Invoice Generation" section
- [ ] Can enable/disable generation in UI
- [ ] Can set generation date in UI
- [ ] Settings save successfully
- [ ] Logs show generation activity
- [ ] Duplicate invoices are prevented
- [ ] Only occupied units get invoices

## Troubleshooting

### Command Not Found
```bash
# Make sure you're in the backend directory
cd backend
php artisan list | grep invoices
# Should show: invoices:generate-rent
```

### No Invoices Generated
1. Check if you have occupied rental units:
   ```sql
   SELECT * FROM rental_units WHERE status = 'occupied' AND tenant_id IS NOT NULL;
   ```

2. Check if tenants have lease dates:
   ```sql
   SELECT * FROM tenants WHERE lease_start_date IS NULL OR lease_end_date IS NULL;
   ```

3. Check if invoices already exist for this month:
   ```sql
   SELECT * FROM rent_invoices 
   WHERE YEAR(invoice_date) = YEAR(NOW()) 
   AND MONTH(invoice_date) = MONTH(NOW());
   ```

### Settings Not Saving
1. Check browser console for errors
2. Check network tab in browser dev tools
3. Verify API endpoint is accessible
4. Check backend logs for errors

### Scheduler Not Running
1. Test manually: `php artisan schedule:run`
2. Check if cron is set up (for production)
3. For development, you can run: `php artisan schedule:work` (keeps running)

## Expected Behavior

✅ **Should Generate:**
- Occupied rental units
- Units with active tenants
- Tenants with valid lease dates for current month
- Units without existing invoices for current month

❌ **Should Skip:**
- Units without tenants
- Units with status other than 'occupied'
- Tenants without lease dates
- Leases that start after current month
- Leases that ended before current month
- Units that already have invoices for current month

## Next Steps After Testing

1. Set your preferred generation date (e.g., 1st of each month)
2. Enable automatic generation
3. Set up cron job for production:
   ```bash
   * * * * * cd /path-to-backend && php artisan schedule:run >> /dev/null 2>&1
   ```
4. Monitor logs for first automatic generation
5. Verify invoices are created correctly

