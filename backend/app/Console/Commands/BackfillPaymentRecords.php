<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\RentInvoice;

class BackfillPaymentRecords extends Command
{
    protected $signature = 'payments:backfill';
    protected $description = 'Create payment records for invoices already marked as paid but missing payment records';

    public function handle(): int
    {
        $this->info('Backfilling payment records for paid invoices...');

        $count = 0;
        $invoices = RentInvoice::with('tenant')
            ->where('status', 'paid')
            ->get();

        foreach ($invoices as $invoice) {
            // Reuse model logic to create record
            $invoice->markAsPaid($invoice->payment_details ?? null);
            $count++;
        }

        $this->info("Created/ensured payment records for {$count} invoices.");
        return Command::SUCCESS;
    }
}


