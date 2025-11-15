<?php

/**
 * Test script to verify payment record creation when marking invoice as paid
 * 
 * Usage: php test_payment_record_creation.php [invoice_id]
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\RentInvoice;
use App\Models\PaymentRecord;
use App\Models\Payment;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "=== Payment Record Creation Test ===\n\n";

// Get invoice ID from command line or use first pending invoice
$invoiceId = $argv[1] ?? null;

if ($invoiceId) {
    $invoice = RentInvoice::find($invoiceId);
    if (!$invoice) {
        echo "❌ Invoice with ID {$invoiceId} not found!\n";
        exit(1);
    }
} else {
    // Find first pending invoice
    $invoice = RentInvoice::where('status', 'pending')->first();
    if (!$invoice) {
        echo "❌ No pending invoices found. Please provide an invoice ID or mark an invoice as pending first.\n";
        exit(1);
    }
    echo "Using invoice: {$invoice->invoice_number} (ID: {$invoice->id})\n\n";
}

echo "Invoice Details:\n";
echo "  ID: {$invoice->id}\n";
echo "  Invoice Number: {$invoice->invoice_number}\n";
echo "  Status: {$invoice->status}\n";
echo "  Amount: {$invoice->total_amount}\n";
echo "  Tenant ID: {$invoice->tenant_id}\n";
echo "  Property ID: {$invoice->property_id}\n";
echo "  Rental Unit ID: {$invoice->rental_unit_id}\n\n";

// Check if payment_records table exists
if (!Schema::hasTable('payment_records')) {
    echo "❌ payment_records table does not exist!\n";
    echo "Please run: php artisan migrate\n";
    exit(1);
}
echo "✅ payment_records table exists\n";

// Check if rent_invoice_id column exists
$hasRentInvoiceIdColumn = Schema::hasColumn('payment_records', 'rent_invoice_id');
if ($hasRentInvoiceIdColumn) {
    echo "✅ rent_invoice_id column exists\n";
} else {
    echo "⚠️  rent_invoice_id column does not exist (will be added when migration runs)\n";
}

// Count existing payment records before
$paymentRecordsBefore = PaymentRecord::count();
$paymentsBefore = Payment::count();
echo "\nBefore marking as paid:\n";
echo "  Payment Records: {$paymentRecordsBefore}\n";
echo "  Payments: {$paymentsBefore}\n\n";

// Check if invoice is already paid
if ($invoice->status === 'paid') {
    echo "⚠️  Invoice is already marked as paid. Checking for existing payment records...\n";
    
    $existingPaymentRecord = PaymentRecord::where('rent_invoice_id', $invoice->id)->first();
    if ($existingPaymentRecord) {
        echo "✅ Payment record already exists:\n";
        echo "  Payment Record ID: {$existingPaymentRecord->id}\n";
        echo "  Amount: {$existingPaymentRecord->amount}\n";
        echo "  Payment Date: {$existingPaymentRecord->payment_date}\n";
        exit(0);
    } else {
        echo "❌ Invoice is paid but no payment record found!\n";
        echo "This might mean the payment record creation failed or the invoice was marked as paid before the feature was added.\n";
        exit(1);
    }
}

// Mark invoice as paid with test payment details
echo "Marking invoice as paid...\n";
$paymentDetails = [
    'payment_type' => 1, // Default payment type
    'payment_mode' => 1, // Default payment mode
    'total_amount' => $invoice->total_amount,
    'reference_number' => 'TEST-' . time(),
    'notes' => 'Test payment record creation',
    'payment_date' => now()->toDateString(),
];

try {
    $invoice->markAsPaid($paymentDetails);
    echo "✅ Invoice marked as paid successfully\n\n";
} catch (\Exception $e) {
    echo "❌ Error marking invoice as paid: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}

// Reload invoice to get updated status
$invoice->refresh();

// Count payment records after
$paymentRecordsAfter = PaymentRecord::count();
$paymentsAfter = Payment::count();

echo "After marking as paid:\n";
echo "  Payment Records: {$paymentRecordsAfter} (+" . ($paymentRecordsAfter - $paymentRecordsBefore) . ")\n";
echo "  Payments: {$paymentsAfter} (+" . ($paymentsAfter - $paymentsBefore) . ")\n\n";

// Verify payment record was created
if ($hasRentInvoiceIdColumn) {
    $paymentRecord = PaymentRecord::where('rent_invoice_id', $invoice->id)->first();
} else {
    // Fallback: find by description or metadata
    $paymentRecord = PaymentRecord::where('description', 'like', "%{$invoice->invoice_number}%")
        ->where('tenant_id', $invoice->tenant_id)
        ->orderBy('created_at', 'desc')
        ->first();
}

if ($paymentRecord) {
    echo "✅ Payment Record Created Successfully!\n";
    echo "\nPayment Record Details:\n";
    echo "  ID: {$paymentRecord->id}\n";
    echo "  Payment ID: {$paymentRecord->payment_id}\n";
    echo "  Amount: {$paymentRecord->amount}\n";
    echo "  Payment Date: {$paymentRecord->payment_date}\n";
    echo "  Status: {$paymentRecord->status}\n";
    if ($hasRentInvoiceIdColumn) {
        echo "  Rent Invoice ID: {$paymentRecord->rent_invoice_id}\n";
    } else {
        echo "  Rent Invoice ID: (column not available)\n";
    }
    echo "  Description: {$paymentRecord->description}\n";
    
    // Verify the payment was created
    $payment = Payment::find($paymentRecord->payment_id);
    if ($payment) {
        echo "\n✅ Associated Payment Created:\n";
        echo "  Payment ID: {$payment->id}\n";
        echo "  Amount: {$payment->amount}\n";
        echo "  Payment Type: {$payment->payment_type}\n";
        echo "  Status: {$payment->status}\n";
    }
} else {
    echo "❌ Payment Record NOT Found!\n";
    echo "This means the payment record creation failed. Check the logs for errors.\n";
    echo "Log file: storage/logs/laravel.log\n";
    exit(1);
}

echo "\n=== Test Complete ===\n";

