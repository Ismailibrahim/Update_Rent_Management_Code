<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\TenantLedger;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

class RecalculateTenantLedgerBalances extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ledger:recalculate-balances {--tenant-id= : Recalculate for specific tenant only} {--dry-run : Show what would be recalculated without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Recalculates all tenant ledger balances to ensure accuracy.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $tenantId = $this->option('tenant-id');
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->info('Running in DRY RUN mode. No changes will be made to the database.');
        }

        $this->info('Starting tenant ledger balance recalculation...');

        // Get tenants to process
        if ($tenantId) {
            $tenants = Tenant::where('id', $tenantId)->get();
            if ($tenants->isEmpty()) {
                $this->error("Tenant with ID {$tenantId} not found.");
                return;
            }
        } else {
            $tenants = Tenant::all();
        }

        $totalProcessed = 0;
        $totalErrors = 0;

        DB::beginTransaction();
        try {
            foreach ($tenants as $tenant) {
                $this->info("Processing tenant: {$tenant->full_name} (ID: {$tenant->id})");
                
                // Get all ledger entries for this tenant
                $entries = TenantLedger::where('tenant_id', $tenant->id)
                    ->orderBy('transaction_date', 'asc')
                    ->orderBy('ledger_id', 'asc')
                    ->get();

                if ($entries->isEmpty()) {
                    $this->warn("  No ledger entries found for tenant {$tenant->full_name}");
                    continue;
                }

                $this->info("  Found {$entries->count()} ledger entries");
                
                $runningBalance = 0.00;
                $processedEntries = 0;

                foreach ($entries as $entry) {
                    $oldBalance = $entry->balance;
                    
                    if ($entry->debit_amount > 0) {
                        // Debit: tenant owes money (increase balance)
                        $runningBalance += $entry->debit_amount;
                    } else {
                        // Credit: tenant paid money (decrease balance)
                        $runningBalance -= $entry->credit_amount;
                    }

                    if (!$isDryRun) {
                        // Update balance without triggering events
                        $entry->timestamps = false;
                        $entry->update(['balance' => $runningBalance]);
                        $entry->timestamps = true;
                    }

                    $processedEntries++;
                    
                    if ($oldBalance != $runningBalance) {
                        $this->line("    Entry {$entry->ledger_id}: {$oldBalance} → {$runningBalance}");
                    }
                }

                $this->info("  Processed {$processedEntries} entries. Final balance: {$runningBalance}");
                $totalProcessed += $processedEntries;
            }

            if ($isDryRun) {
                DB::rollBack();
                $this->info("Dry run complete. Would have processed {$totalProcessed} ledger entries.");
            } else {
                DB::commit();
                $this->info("Recalculation complete. Processed {$totalProcessed} ledger entries.");
            }

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Recalculation failed: " . $e->getMessage());
            $totalErrors++;
        }

        if ($totalErrors > 0) {
            $this->error("Completed with {$totalErrors} errors.");
        } else {
            $this->info("Recalculation completed successfully!");
        }
    }
}