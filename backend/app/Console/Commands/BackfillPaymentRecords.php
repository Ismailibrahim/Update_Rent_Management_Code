<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RentInvoice;
use App\Models\PaymentRecord;
use App\Models\PaymentType;
use App\Models\PaymentMode;
use App\Models\Currency;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Log;

class BackfillPaymentRecords extends Command
{
    protected $signature = 'payments:backfill';
    protected $description = 'Create payment records for invoices already marked as paid but missing payment records';

    public function handle(): int
    {
        $this->info('Backfilling payment records for paid invoices...');

        if (!Schema::hasTable('payment_records')) {
            $this->error('Payment records table does not exist. Please run migrations first.');
            return Command::FAILURE;
        }

        // Check and create default payment type, mode, and currency if they don't exist
        $this->ensureDefaultRecords();

        $count = 0;
        $skipped = 0;
        $errors = 0;
        $invoices = RentInvoice::with('tenant')
            ->where('status', 'paid')
            ->get();

        $this->info("Found {$invoices->count()} paid invoices to process.");

        foreach ($invoices as $invoice) {
            // Check if payment record already exists for this invoice
            $hasRentInvoiceIdColumn = Schema::hasColumn('payment_records', 'rent_invoice_id');
            
            if ($hasRentInvoiceIdColumn) {
                $existingRecord = PaymentRecord::where('rent_invoice_id', $invoice->id)->first();
                if ($existingRecord) {
                    $this->line("Skipping invoice {$invoice->invoice_number} - payment record already exists (ID: {$existingRecord->id})");
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
                $this->line("Skipping invoice {$invoice->invoice_number} - similar payment record already exists (ID: {$existingRecord->id})");
                $skipped++;
                continue;
            }

            // Create payment record using the model's markAsPaid method
            // But we need to skip the status update since it's already paid
            try {
                $invoice->markAsPaid($invoice->payment_details ?? null);
                $count++;
                $this->info("✅ Created payment record for invoice {$invoice->invoice_number}");
            } catch (\Exception $e) {
                $errors++;
                $this->error("❌ Failed to create payment record for invoice {$invoice->invoice_number}: {$e->getMessage()}");
                Log::error("Backfill payment record error for invoice {$invoice->invoice_number}", [
                    'invoice_id' => $invoice->id,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        $this->info("\n=== Backfill Summary ===");
        $this->info("✅ Created: {$count}");
        $this->info("⏭️  Skipped: {$skipped}");
        if ($errors > 0) {
            $this->error("❌ Errors: {$errors}");
            $this->warn("Check Laravel logs for details: storage/logs/laravel.log");
        }
        
        // Verify final count
        $finalCount = PaymentRecord::count();
        $this->info("📊 Total payment records in database: {$finalCount}");
        
        return Command::SUCCESS;
    }

    /**
     * Ensure default payment type, mode, and currency exist
     */
    private function ensureDefaultRecords(): void
    {
        // Check PaymentType with ID 1
        $paymentType = PaymentType::find(1);
        if (!$paymentType) {
            $firstType = PaymentType::first();
            if ($firstType) {
                $this->warn("PaymentType ID 1 does not exist. Using first available: ID {$firstType->id}");
            } else {
                $this->warn("No payment types found. Creating default 'Rent' type...");
                PaymentType::create([
                    'name' => 'Rent',
                    'code' => 'rent',
                    'description' => 'Rent payment',
                    'is_active' => true,
                ]);
                $this->info("✅ Created default PaymentType");
            }
        }

        // Check PaymentMode with ID 1
        $paymentMode = PaymentMode::find(1);
        if (!$paymentMode) {
            $firstMode = PaymentMode::first();
            if ($firstMode) {
                $this->warn("PaymentMode ID 1 does not exist. Using first available: ID {$firstMode->id}");
            } else {
                $this->warn("No payment modes found. Creating default 'Cash' mode...");
                PaymentMode::create([
                    'name' => 'Cash',
                    'code' => 'cash',
                    'description' => 'Cash payment',
                    'is_active' => true,
                ]);
                $this->info("✅ Created default PaymentMode");
            }
        }

        // Check Currency with ID 1
        $currency = Currency::find(1);
        if (!$currency) {
            $firstCurrency = Currency::first();
            if ($firstCurrency) {
                $this->warn("Currency ID 1 does not exist. Using first available: ID {$firstCurrency->id}");
            } else {
                $this->warn("No currencies found. Creating default 'MVR' currency...");
                Currency::create([
                    'code' => 'MVR',
                    'name' => 'Maldivian Rufiyaa',
                    'symbol' => 'Rf',
                    'is_default' => true,
                ]);
                $this->info("✅ Created default Currency");
            }
        }
    }
}


