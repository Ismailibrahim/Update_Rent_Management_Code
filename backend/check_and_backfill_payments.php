<?php

/**
 * Quick script to check payment records status and backfill if needed
 * Run: php check_and_backfill_payments.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\PaymentRecord;
use App\Models\RentInvoice;

echo "=== Payment Records Diagnostic & Backfill ===\n\n";

// 1. Check if table exists
if (!Schema::hasTable('payment_records')) {
    echo "❌ payment_records table does NOT exist!\n";
    echo "→ Run: php artisan migrate\n\n";
    exit(1);
}
echo "✅ payment_records table exists\n";

// 2. Count payment records
$paymentRecordCount = PaymentRecord::count();
echo "📊 Current payment records: {$paymentRecordCount}\n\n";

// 3. Count paid invoices
$paidInvoiceCount = RentInvoice::where('status', 'paid')->count();
echo "📋 Paid invoices: {$paidInvoiceCount}\n\n";

if ($paidInvoiceCount === 0) {
    echo "⚠️  No paid invoices found!\n";
    echo "→ You need to mark some invoices as paid first.\n";
    echo "→ Go to: /rent-invoices and mark invoices as paid\n\n";
    exit(0);
}

// 4. Check how many paid invoices have payment records
$hasRentInvoiceIdColumn = Schema::hasColumn('payment_records', 'rent_invoice_id');
$invoicesWithRecords = 0;
$invoicesWithoutRecords = 0;

if ($hasRentInvoiceIdColumn) {
    $invoicesWithRecords = RentInvoice::where('status', 'paid')
        ->whereHas('paymentRecords')
        ->count();
    $invoicesWithoutRecords = $paidInvoiceCount - $invoicesWithRecords;
    
    echo "📊 Paid invoices WITH payment records: {$invoicesWithRecords}\n";
    echo "📊 Paid invoices WITHOUT payment records: {$invoicesWithoutRecords}\n\n";
} else {
    // Fallback: check by matching details
    $paidInvoices = RentInvoice::where('status', 'paid')->get();
    foreach ($paidInvoices as $invoice) {
        $exists = PaymentRecord::where('tenant_id', $invoice->tenant_id)
            ->where('property_id', $invoice->property_id)
            ->where('amount', $invoice->total_amount)
            ->where('payment_date', $invoice->paid_date ?? $invoice->invoice_date)
            ->exists();
        
        if ($exists) {
            $invoicesWithRecords++;
        } else {
            $invoicesWithoutRecords++;
        }
    }
    
    echo "📊 Paid invoices WITH payment records: {$invoicesWithRecords}\n";
    echo "📊 Paid invoices WITHOUT payment records: {$invoicesWithoutRecords}\n\n";
}

if ($invoicesWithoutRecords > 0) {
    echo "🔄 Starting backfill process...\n\n";
    
    $count = 0;
    $skipped = 0;
    $errors = 0;
    
    $invoices = RentInvoice::with('tenant')
        ->where('status', 'paid')
        ->get();
    
    foreach ($invoices as $invoice) {
        // Check if payment record already exists
        if ($hasRentInvoiceIdColumn) {
            $existingRecord = PaymentRecord::where('rent_invoice_id', $invoice->id)->first();
            if ($existingRecord) {
                echo "⏭️  Skipping invoice {$invoice->invoice_number} - payment record exists (ID: {$existingRecord->id})\n";
                $skipped++;
                continue;
            }
        }
        
        // Check if payment record exists by matching payment details
        $existingRecord = PaymentRecord::where('tenant_id', $invoice->tenant_id)
            ->where('property_id', $invoice->property_id)
            ->where('amount', $invoice->total_amount)
            ->where('payment_date', $invoice->paid_date ?? $invoice->invoice_date)
            ->first();
        
        if ($existingRecord) {
            echo "⏭️  Skipping invoice {$invoice->invoice_number} - similar payment record exists (ID: {$existingRecord->id})\n";
            $skipped++;
            continue;
        }
        
        // Create payment record
        try {
            $invoice->markAsPaid($invoice->payment_details ?? null);
            $count++;
            echo "✅ Created payment record for invoice {$invoice->invoice_number}\n";
        } catch (\Exception $e) {
            $errors++;
            echo "❌ Failed to create payment record for invoice {$invoice->invoice_number}: {$e->getMessage()}\n";
        }
    }
    
    echo "\n=== Backfill Complete ===\n";
    echo "✅ Created: {$count}\n";
    echo "⏭️  Skipped: {$skipped}\n";
    if ($errors > 0) {
        echo "❌ Errors: {$errors}\n";
    }
    
    // Final count
    $finalCount = PaymentRecord::count();
    echo "\n📊 Total payment records now: {$finalCount}\n";
} else {
    echo "✅ All paid invoices already have payment records!\n";
    echo "📊 Total payment records: {$paymentRecordCount}\n";
}

echo "\n=== Done ===\n";

