# Rent Invoice Payment - Database Tables Updated

## Overview
When you mark a rent invoice as paid, the system updates **4 database tables** and may also store files. This document explains exactly what happens to each table.

---

## Table 1: `rent_invoices` (UPDATED)

### What Gets Updated:
When `markAsPaid()` is called, the following columns in the `rent_invoices` table are updated:

| Column | Value | Description |
|--------|-------|-------------|
| `status` | `'paid'` | Changes from `'pending'` to `'paid'` |
| `paid_date` | Current date | Sets the date when payment was received |
| `payment_details` | JSON object | Stores payment information including:<br>- `payment_type` (e.g., "1")<br>- `payment_mode` (e.g., "1")<br>- `total_amount`<br>- `reference_number`<br>- `notes`<br>- `payment_date` |
| `payment_slip_files` | File paths (if provided) | Stores paths to uploaded payment slip files (images/PDFs) |
| `notes` | Updated notes (if provided) | Optional: Updates invoice notes with payment information |

### Code Location:
- **Controller**: `RentInvoiceController::markAsPaid()` (line 522)
- **Model**: `RentInvoice::markAsPaid()` (line 153-166)

### SQL Equivalent:
```sql
UPDATE rent_invoices 
SET 
    status = 'paid',
    paid_date = '2025-01-15',
    payment_details = '{"payment_type":"1","payment_mode":"1",...}',
    payment_slip_files = 'path/to/file1.jpg,path/to/file2.pdf',
    notes = 'Payment received',
    updated_at = NOW()
WHERE id = {invoice_id};
```

---

## Table 2: `payments` (NEW RECORD CREATED)

### What Gets Created:
A new record is inserted into the `payments` table to track the payment transaction.

| Column | Value | Description |
|--------|-------|-------------|
| `tenant_id` | From invoice | Links to the tenant who made the payment |
| `property_id` | From invoice | Links to the property |
| `rental_unit_id` | From invoice | Links to the rental unit |
| `amount` | Payment amount | Total amount paid |
| `currency` | From invoice | Currency code (e.g., "MVR") |
| `payment_type` | `'rent'` | Type of payment (always "rent" for rent invoices) |
| `payment_method` | `'manual'` | Method of payment (defaults to "manual") |
| `payment_date` | Payment date | Date when payment was received |
| `due_date` | From invoice | Original due date of the invoice |
| `description` | Auto-generated | Description like "Payment for invoice INV-250115-123" |
| `reference_number` | From payment details | Reference number provided (if any) |
| `status` | `'completed'` | Payment status |
| `metadata` | JSON object | Full payment details as JSON |

### Code Location:
- **Model**: `RentInvoice::markAsPaid()` (line 205-219)

### SQL Equivalent:
```sql
INSERT INTO payments (
    tenant_id, property_id, rental_unit_id, amount, currency,
    payment_type, payment_method, payment_date, due_date,
    description, reference_number, status, metadata, created_at, updated_at
) VALUES (
    {tenant_id}, {property_id}, {rental_unit_id}, {amount}, 'MVR',
    'rent', 'manual', '2025-01-15', {due_date},
    'Payment for invoice INV-250115-123', {reference_number}, 'completed',
    '{"payment_type":"1",...}', NOW(), NOW()
);
```

---

## Table 3: `payment_records` (NEW RECORD CREATED)

### What Gets Created:
A new record is inserted into the `payment_records` table for detailed payment tracking with foreign key relationships.

| Column | Value | Description |
|--------|-------|-------------|
| `payment_id` | From payments table | Links to the payment record created above |
| `tenant_id` | From invoice | Links to the tenant |
| `property_id` | From invoice | Links to the property |
| `rental_unit_id` | From invoice | Links to the rental unit |
| `payment_type_id` | From payment details | ID of payment type (e.g., 1) |
| `payment_mode_id` | From payment details | ID of payment mode (e.g., 1) |
| `currency_id` | Default: 1 | Currency ID (defaults to 1 for MVR) |
| `amount` | Payment amount | Amount paid |
| `exchange_rate` | Default: 1.0000 | Exchange rate (defaults to 1.0) |
| `amount_in_base_currency` | Same as amount | Amount in base currency |
| `payment_date` | Payment date | Date when payment was received |
| `due_date` | From invoice | Original due date |
| `reference_number` | From payment details | Reference number (if any) |
| `description` | Auto-generated | Description of payment |
| `status` | `'completed'` | Payment status |
| `metadata` | JSON object | Full payment details |
| `processed_at` | Current timestamp | When payment was processed |

### Code Location:
- **Model**: `RentInvoice::markAsPaid()` (line 222-240)

### SQL Equivalent:
```sql
INSERT INTO payment_records (
    payment_id, tenant_id, property_id, rental_unit_id,
    payment_type_id, payment_mode_id, currency_id,
    amount, exchange_rate, amount_in_base_currency,
    payment_date, due_date, reference_number, description,
    status, metadata, processed_at, created_at, updated_at
) VALUES (
    {payment_id}, {tenant_id}, {property_id}, {rental_unit_id},
    1, 1, 1,  -- payment_type_id, payment_mode_id, currency_id
    {amount}, 1.0000, {amount},
    '2025-01-15', {due_date}, {reference_number},
    'Payment for invoice INV-250115-123', 'completed',
    '{"payment_type":"1",...}', NOW(), NOW(), NOW()
);
```

---

## Table 4: `tenant_ledgers` (UPDATED - via Model Event)

### What Gets Updated:
When the invoice status changes to `'paid'`, a model event (`updated`) is triggered that updates the tenant ledger entry.

**Note**: The tenant ledger entry was created when the invoice was first generated. When marking as paid, the system:

1. **Finds the existing ledger entry** by `reference_no` (invoice number)
2. **Updates the entry** if needed (though typically no changes are made to the debit entry)
3. **Recalculates balances** for all subsequent ledger entries

### Code Location:
- **Model Event**: `RentInvoice::boot()` (line 69-74)
- **Update Method**: `RentInvoice::updateTenantLedgerEntry()` (line 378-414)

### Important Note:
The tenant ledger entry for the **invoice itself** (debit entry) is NOT modified when marking as paid. The debit entry remains as it was created when the invoice was generated.

**However**, if you want to create a **credit entry** for the payment, that would typically be done separately through the Tenant Ledger interface, not automatically when marking the invoice as paid.

### SQL Equivalent:
```sql
-- Find the ledger entry
SELECT * FROM tenant_ledgers 
WHERE reference_no = 'INV-250115-123' 
AND tenant_id = {tenant_id};

-- Update if needed (usually not needed for debit entries)
UPDATE tenant_ledgers 
SET 
    debit_amount = {total_amount},
    description = 'Rent Invoice INV-250115-123 - Unit 101',
    remarks = {notes},
    updated_at = NOW()
WHERE ledger_id = {ledger_id};

-- Recalculate balances for subsequent entries
-- (Complex query that updates all entries after this one)
```

---

## File Storage (If Payment Slips Uploaded)

### What Gets Stored:
If payment slip files (images/PDFs) are uploaded:

1. **Files are stored** in: `storage/app/public/payment-slips/`
2. **File paths are saved** in the `rent_invoices.payment_slip_files` column
3. **Multiple files** can be stored (comma-separated paths)

### Code Location:
- **Controller**: `RentInvoiceController::markAsPaid()` (line 508-520)

### Example:
```
File stored at: storage/app/public/payment-slips/1705123456_abc123_payment_slip.jpg
Saved in DB: payment-slips/1705123456_abc123_payment_slip.jpg
```

---

## Complete Flow Diagram

```
User clicks "Mark as Paid"
    ↓
RentInvoiceController::markAsPaid()
    ↓
1. Validate payment details
2. Upload payment slip files (if any)
3. Call RentInvoice::markAsPaid()
    ↓
RentInvoice::markAsPaid()
    ↓
┌─────────────────────────────────────┐
│ 1. UPDATE rent_invoices             │
│    - status = 'paid'                │
│    - paid_date = now()              │
│    - payment_details = {...}        │
│    - payment_slip_files = [...]     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. CREATE payments record           │
│    - New payment transaction        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. CREATE payment_records record    │
│    - Detailed payment tracking      │
└─────────────────────────────────────┘
    ↓
Model Event Triggered (status changed)
    ↓
┌─────────────────────────────────────┐
│ 4. UPDATE tenant_ledgers            │
│    - Update existing entry          │
│    - Recalculate balances           │
└─────────────────────────────────────┘
    ↓
Return success response
```

---

## Summary

When you mark an invoice as paid, the system:

1. ✅ **Updates** `rent_invoices` table (status, paid_date, payment_details, payment_slip_files)
2. ✅ **Creates** a new record in `payments` table
3. ✅ **Creates** a new record in `payment_records` table
4. ✅ **Updates** `tenant_ledgers` table (via model event, recalculates balances)
5. ✅ **Stores** payment slip files (if uploaded) in `storage/app/public/payment-slips/`

---

## Error Handling

- If creating payment records fails, the invoice is still marked as paid (payment records are secondary)
- Errors are logged but don't prevent the invoice from being marked as paid
- Check `backend/storage/logs/laravel.log` for any errors

---

## Notes

- **Tenant Ledger Credit Entry**: The system does NOT automatically create a credit entry in the tenant ledger when marking an invoice as paid. The debit entry (created when invoice was generated) remains. If you need a credit entry, it should be created separately through the Tenant Ledger interface.

- **Payment Records**: The `payments` and `payment_records` tables are created for comprehensive payment tracking and reporting, even though the invoice itself already contains payment information.

- **Model Events**: The tenant ledger update is triggered automatically via Laravel model events when the invoice status changes, ensuring data consistency.


