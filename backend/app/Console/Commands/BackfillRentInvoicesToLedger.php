<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RentInvoice;
use App\Models\TenantLedger;
use App\Models\PaymentType;
use Illuminate\Support\Facades\DB;

class BackfillRentInvoicesToLedger extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ledger:backfill-rent-invoices {--dry-run : Show what would be done without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill existing rent invoices into tenant ledger entries';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        
        if ($dryRun) {
            $this->info('DRY RUN MODE - No changes will be made');
        }

        $this->info('Starting backfill of rent invoices to tenant ledger...');

        // Get or create payment types
        $rentPaymentType = PaymentType::firstOrCreate(
            ['name' => 'Rent'],
            [
                'code' => 'rent',
                'description' => 'Monthly rent payment',
                'is_active' => true,
                'is_recurring' => true,
                'requires_approval' => false,
                'settings' => []
            ]
        );

        $rentPaymentReceivedType = PaymentType::firstOrCreate(
            ['name' => 'Rent Payment'],
            [
                'code' => 'rent_payment',
                'description' => 'Payment received for rent',
                'is_active' => true,
                'is_recurring' => false,
                'requires_approval' => false,
                'settings' => []
            ]
        );

        $this->info("Using payment types: Rent (ID: {$rentPaymentType->id}), Rent Payment (ID: {$rentPaymentReceivedType->id})");

        // Get all rent invoices
        $invoices = RentInvoice::with(['tenant', 'rentalUnit'])->orderBy('invoice_date')->get();
        
        $this->info("Found {$invoices->count()} rent invoices to process");

        $processedCount = 0;
        $skippedCount = 0;
        $errorCount = 0;

        foreach ($invoices as $invoice) {
            try {
                // Check if ledger entry already exists for this invoice
                $existingEntry = TenantLedger::where('reference_no', $invoice->invoice_number)
                    ->where('tenant_id', $invoice->tenant_id)
                    ->first();

                if ($existingEntry) {
                    $this->warn("Skipping invoice {$invoice->invoice_number} - ledger entry already exists");
                    $skippedCount++;
                    continue;
                }

                if (!$dryRun) {
                    DB::beginTransaction();

                    // Calculate the current balance for the tenant before this invoice
                    $lastBalance = TenantLedger::where('tenant_id', $invoice->tenant_id)
                        ->where('transaction_date', '<', $invoice->invoice_date)
                        ->orderBy('transaction_date', 'desc')
                        ->orderBy('ledger_id', 'desc')
                        ->first();
                    $currentBalance = $lastBalance ? $lastBalance->balance : 0;
                    $newBalance = $currentBalance + $invoice->total_amount; // Add to balance (debit)

                    // Create debit entry for the invoice
                    TenantLedger::create([
                        'tenant_id' => $invoice->tenant_id,
                        'payment_type_id' => $rentPaymentType->id,
                        'transaction_date' => $invoice->invoice_date,
                        'description' => "Rent Invoice {$invoice->invoice_number} - " . ($invoice->rentalUnit ? $invoice->rentalUnit->unit_number : 'Unit'),
                        'reference_no' => $invoice->invoice_number,
                        'debit_amount' => $invoice->total_amount,
                        'credit_amount' => 0,
                        'balance' => $newBalance,
                        'payment_method' => null,
                        'transfer_reference_no' => null,
                        'remarks' => $invoice->notes,
                        'created_by' => 'Backfill Command',
                    ]);

                    // If invoice is paid, create credit entry
                    if ($invoice->status === 'paid' && $invoice->paid_date) {
                        $paymentBalance = $newBalance - $invoice->total_amount; // Subtract payment

                        TenantLedger::create([
                            'tenant_id' => $invoice->tenant_id,
                            'payment_type_id' => $rentPaymentReceivedType->id,
                            'transaction_date' => $invoice->paid_date,
                            'description' => "Payment for Rent Invoice {$invoice->invoice_number}",
                            'reference_no' => $invoice->invoice_number . '-PAY',
                            'debit_amount' => 0,
                            'credit_amount' => $invoice->total_amount,
                            'balance' => $paymentBalance,
                            'payment_method' => $invoice->payment_method,
                            'transfer_reference_no' => $invoice->payment_reference,
                            'remarks' => "Payment received for invoice {$invoice->invoice_number}",
                            'created_by' => 'Backfill Command',
                        ]);
                    }

                    DB::commit();
                }

                $this->info("Processed invoice {$invoice->invoice_number} for tenant {$invoice->tenant->full_name}");
                $processedCount++;

            } catch (\Exception $e) {
                if (!$dryRun) {
                    DB::rollBack();
                }
                $this->error("Error processing invoice {$invoice->invoice_number}: " . $e->getMessage());
                $errorCount++;
            }
        }

        $this->info("\nBackfill completed!");
        $this->info("Processed: {$processedCount}");
        $this->info("Skipped: {$skippedCount}");
        $this->info("Errors: {$errorCount}");

        if ($dryRun) {
            $this->info("\nThis was a dry run. Run without --dry-run to make actual changes.");
        }

        return 0;
    }
}