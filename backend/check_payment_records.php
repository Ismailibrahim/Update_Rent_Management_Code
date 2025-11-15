<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\PaymentRecord;
use App\Models\RentInvoice;
use Illuminate\Support\Facades\DB;

echo "=== Payment Records Check ===\n\n";

// Check if payment_records table exists
try {
    $tableExists = DB::select("SHOW TABLES LIKE 'payment_records'");
    if (empty($tableExists)) {
        echo "❌ payment_records table does not exist!\n";
        echo "Please run: php artisan migrate\n";
        exit(1);
    }
    echo "✅ payment_records table exists\n";
} catch (\Exception $e) {
    echo "❌ Error checking table: " . $e->getMessage() . "\n";
    exit(1);
}

// Check if rent_invoice_id column exists
try {
    $columns = DB::select("SHOW COLUMNS FROM payment_records LIKE 'rent_invoice_id'");
    if (empty($columns)) {
        echo "⚠️  rent_invoice_id column does not exist in payment_records table\n";
        echo "Please run: php artisan migrate\n";
    } else {
        echo "✅ rent_invoice_id column exists\n";
    }
} catch (\Exception $e) {
    echo "⚠️  Error checking column: " . $e->getMessage() . "\n";
}

// Count payment records
try {
    $count = PaymentRecord::count();
    echo "\n📊 Total Payment Records: {$count}\n";
    
    if ($count > 0) {
        echo "\n=== Sample Payment Records ===\n";
        $records = PaymentRecord::with(['tenant', 'property', 'rentalUnit', 'rentInvoice'])
            ->limit(5)
            ->get();
        
        foreach ($records as $record) {
            echo "\nID: {$record->id}\n";
            echo "  Amount: {$record->amount}\n";
            echo "  Payment Date: {$record->payment_date}\n";
            echo "  Status: {$record->status}\n";
            echo "  Tenant: " . ($record->tenant ? $record->tenant->full_name : 'N/A') . "\n";
            echo "  Property: " . ($record->property ? $record->property->name : 'N/A') . "\n";
            echo "  Rent Invoice ID: " . ($record->rent_invoice_id ?? 'NULL') . "\n";
            echo "  Rent Invoice: " . ($record->rentInvoice ? $record->rentInvoice->invoice_number : 'N/A') . "\n";
        }
    }
} catch (\Exception $e) {
    echo "❌ Error counting payment records: " . $e->getMessage() . "\n";
}

// Check paid rent invoices
try {
    $paidInvoicesCount = RentInvoice::where('status', 'paid')->count();
    echo "\n\n📊 Total Paid Rent Invoices: {$paidInvoicesCount}\n";
    
    if ($paidInvoicesCount > 0) {
        echo "\n=== Sample Paid Rent Invoices ===\n";
        $paidInvoices = RentInvoice::where('status', 'paid')
            ->limit(5)
            ->get();
        
        foreach ($paidInvoices as $invoice) {
            echo "\nInvoice: {$invoice->invoice_number}\n";
            echo "  Amount: {$invoice->total_amount}\n";
            echo "  Paid Date: " . ($invoice->paid_date ?? 'N/A') . "\n";
            
            // Check if payment record exists for this invoice
            $paymentRecord = PaymentRecord::where('rent_invoice_id', $invoice->id)->first();
            if ($paymentRecord) {
                echo "  ✅ Payment Record exists (ID: {$paymentRecord->id})\n";
            } else {
                echo "  ❌ No Payment Record found for this invoice\n";
            }
        }
    }
} catch (\Exception $e) {
    echo "❌ Error checking paid invoices: " . $e->getMessage() . "\n";
}

echo "\n=== Check Complete ===\n";
