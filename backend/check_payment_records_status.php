<?php

/**
 * Diagnostic script to check payment records status
 * Run: php check_payment_records_status.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\PaymentRecord;
use App\Models\RentInvoice;

echo "=== Payment Records Diagnostic ===\n\n";

// 1. Check if table exists
echo "1. Checking if payment_records table exists...\n";
if (!Schema::hasTable('payment_records')) {
    echo "   ❌ payment_records table does NOT exist!\n";
    echo "   → Run: php artisan migrate\n\n";
    exit(1);
} else {
    echo "   ✅ payment_records table exists\n\n";
}

// 2. Check if rent_invoice_id column exists
echo "2. Checking if rent_invoice_id column exists...\n";
if (Schema::hasColumn('payment_records', 'rent_invoice_id')) {
    echo "   ✅ rent_invoice_id column exists\n\n";
} else {
    echo "   ⚠️  rent_invoice_id column does NOT exist\n";
    echo "   → Run: php artisan migrate\n\n";
}

// 3. Count payment records
echo "3. Counting payment records...\n";
$paymentRecordCount = PaymentRecord::count();
echo "   Total payment records: {$paymentRecordCount}\n\n";

if ($paymentRecordCount > 0) {
    echo "4. Sample payment records:\n";
    $samples = PaymentRecord::with(['tenant', 'property', 'rentalUnit', 'paymentType', 'paymentMode'])
        ->limit(3)
        ->get();
    
    foreach ($samples as $record) {
        echo "   - ID: {$record->id}\n";
        echo "     Amount: {$record->amount}\n";
        echo "     Payment Date: {$record->payment_date}\n";
        echo "     Tenant: " . ($record->tenant ? $record->tenant->full_name ?? 'N/A' : 'N/A') . "\n";
        echo "     Property: " . ($record->property ? $record->property->name : 'N/A') . "\n";
        echo "     Rent Invoice ID: " . ($record->rent_invoice_id ?? 'NULL') . "\n";
        echo "\n";
    }
} else {
    echo "   ⚠️  No payment records found in database\n\n";
}

// 4. Count paid invoices
echo "5. Checking paid invoices...\n";
$paidInvoiceCount = RentInvoice::where('status', 'paid')->count();
echo "   Total paid invoices: {$paidInvoiceCount}\n\n";

if ($paidInvoiceCount > 0) {
    echo "6. Checking if paid invoices have payment records...\n";
    
    if (Schema::hasColumn('payment_records', 'rent_invoice_id')) {
        $invoicesWithRecords = RentInvoice::where('status', 'paid')
            ->whereHas('paymentRecords')
            ->count();
        $invoicesWithoutRecords = $paidInvoiceCount - $invoicesWithRecords;
        
        echo "   Paid invoices WITH payment records: {$invoicesWithRecords}\n";
        echo "   Paid invoices WITHOUT payment records: {$invoicesWithoutRecords}\n\n";
        
        if ($invoicesWithoutRecords > 0) {
            echo "   → Run backfill command: php artisan payments:backfill\n\n";
        }
    } else {
        echo "   ⚠️  Cannot check (rent_invoice_id column missing)\n\n";
    }
    
    // Show sample paid invoices
    echo "7. Sample paid invoices:\n";
    $sampleInvoices = RentInvoice::where('status', 'paid')
        ->with('tenant')
        ->limit(3)
        ->get();
    
    foreach ($sampleInvoices as $invoice) {
        echo "   - Invoice #: {$invoice->invoice_number}\n";
        echo "     Amount: {$invoice->total_amount}\n";
        echo "     Paid Date: " . ($invoice->paid_date ?? 'N/A') . "\n";
        echo "     Tenant: " . ($invoice->tenant ? $invoice->tenant->full_name ?? 'N/A' : 'N/A') . "\n";
        echo "\n";
    }
} else {
    echo "   ⚠️  No paid invoices found\n";
    echo "   → Mark some invoices as paid to generate payment records\n\n";
}

// 5. Check required tables
echo "8. Checking required relationships...\n";
$requiredTables = ['tenants', 'properties', 'rental_units', 'payment_types', 'payment_modes', 'currencies'];
foreach ($requiredTables as $table) {
    if (Schema::hasTable($table)) {
        $count = DB::table($table)->count();
        echo "   ✅ {$table}: {$count} records\n";
    } else {
        echo "   ❌ {$table}: table does NOT exist\n";
    }
}

echo "\n=== Diagnostic Complete ===\n";

