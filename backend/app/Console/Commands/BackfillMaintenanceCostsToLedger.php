<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MaintenanceCost;
use App\Models\TenantLedger;
use App\Models\PaymentType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BackfillMaintenanceCostsToLedger extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ledger:backfill-maintenance-costs {--dry-run : Simulate the backfill process without making changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfills existing maintenance costs into the tenant ledger.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $isDryRun = $this->option('dry-run');

        if ($isDryRun) {
            $this->info('Running in DRY RUN mode. No changes will be made to the database.');
        }

        $this->info('Starting backfill of maintenance costs to tenant ledger...');

        $maintenanceCosts = MaintenanceCost::with(['rentalUnitAsset.rentalUnit.tenant', 'rentalUnitAsset.asset'])->get();
        $count = 0;
        $skipped = 0;

        DB::beginTransaction();
        try {
            foreach ($maintenanceCosts as $maintenanceCost) {
                // Check if a ledger entry for this maintenance cost already exists
                $existingLedgerEntry = TenantLedger::where('reference_no', 'MAINT-' . $maintenanceCost->id)
                    ->first();

                if ($existingLedgerEntry) {
                    $this->warn("Skipping maintenance cost {$maintenanceCost->id}: Ledger entry already exists.");
                    $skipped++;
                    continue;
                }

                // Check if maintenance cost has a tenant
                $tenant = $maintenanceCost->getTenant();
                if (!$tenant) {
                    $this->warn("Skipping maintenance cost {$maintenanceCost->id}: No tenant found.");
                    $skipped++;
                    continue;
                }

                if (!$isDryRun) {
                    $maintenanceCost->createTenantLedgerEntry();
                }
                $count++;
                $this->info("Processed maintenance cost: {$maintenanceCost->id} for tenant: {$tenant->full_name}");
            }

            if ($isDryRun) {
                DB::rollBack();
                $this->info("Dry run complete. Would have processed {$count} maintenance costs, skipped {$skipped}.");
            } else {
                DB::commit();
                $this->info("Backfill complete. Processed {$count} maintenance costs, skipped {$skipped}.");
            }
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Backfill failed: " . $e->getMessage());
            Log::error("BackfillMaintenanceCostsToLedger command failed: " . $e->getMessage());
        }
    }
}