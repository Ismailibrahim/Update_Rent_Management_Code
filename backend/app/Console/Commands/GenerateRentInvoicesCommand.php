<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SystemSetting;
use App\Models\RentInvoice;
use App\Models\RentalUnit;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class GenerateRentInvoicesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:generate-rent {--force : Force generation even if not the scheduled date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically generate rent invoices for all occupied rental units on the configured date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting automatic rent invoice generation...');

        // Check if automatic generation is enabled
        $enabled = SystemSetting::getValue('invoice_generation_enabled', 'false');
        if ($enabled !== 'true' && !$this->option('force')) {
            $this->warn('Automatic invoice generation is disabled. Use --force to generate anyway.');
            return 0;
        }

        // Get invoice generation date from settings
        $generationDate = (int) SystemSetting::getValue('invoice_generation_date', '1');
        $dueDateOffset = (int) SystemSetting::getValue('invoice_due_date_offset', '7');

        // Check if today is the generation date (unless forced)
        $today = now();
        if (!$this->option('force') && $today->day !== $generationDate) {
            $this->info("Today is not the invoice generation date ({$generationDate}). Skipping.");
            $this->info("Current date: {$today->format('Y-m-d')}, Generation date: {$generationDate}");
            return 0;
        }

        // Get current month and year
        $currentMonth = $today->month;
        $currentYear = $today->year;

        $this->info("Generating invoices for {$currentYear}-{$currentMonth} (Generation date: {$generationDate})");

        try {
            DB::beginTransaction();

            // Get all occupied rental units
            $occupiedUnits = RentalUnit::with(['tenant', 'property'])
                ->where('status', 'occupied')
                ->whereNotNull('tenant_id')
                ->get();

            $this->info("Found {$occupiedUnits->count()} occupied rental units");

            $generatedInvoices = [];
            $errors = [];
            $skippedTenants = [];
            $duplicateInvoices = [];

            $selectedMonthStart = Carbon::create($currentYear, $currentMonth, 1);
            $selectedMonthEnd = Carbon::create($currentYear, $currentMonth, 1)->endOfMonth();

            foreach ($occupiedUnits as $unit) {
                try {
                    // Check if tenant has an active lease for the current month/year
                    $tenant = $unit->tenant;
                    
                    // Skip if tenant doesn't have lease dates set
                    if (!$tenant->lease_start_date || !$tenant->lease_end_date) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'No lease dates set'
                        ];
                        continue;
                    }
                    
                    // Skip if lease starts after the current month
                    if ($tenant->lease_start_date > $selectedMonthEnd) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'Lease starts after current month',
                            'lease_start_date' => $tenant->lease_start_date->format('Y-m-d')
                        ];
                        continue;
                    }
                    
                    // Skip if lease ends before the current month
                    if ($tenant->lease_end_date < $selectedMonthStart) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'Lease ended before current month',
                            'lease_end_date' => $tenant->lease_end_date->format('Y-m-d')
                        ];
                        continue;
                    }

                    // Check if invoice already exists for this rental unit for this month/year
                    $existingInvoice = RentInvoice::where('rental_unit_id', $unit->id)
                        ->whereYear('invoice_date', $currentYear)
                        ->whereMonth('invoice_date', $currentMonth)
                        ->first();

                    if ($existingInvoice) {
                        $duplicateInvoices[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'invoice_number' => $existingInvoice->invoice_number,
                            'invoice_date' => $existingInvoice->invoice_date->format('Y-m-d'),
                            'status' => $existingInvoice->status,
                            'reason' => 'Invoice already exists for this rental unit for the current month'
                        ];
                        continue;
                    }

                    // Generate unique invoice number
                    $shortDate = date('ymd', strtotime("{$currentYear}-{$currentMonth}-01"));
                    $invoiceNumber = 'INV-' . $shortDate . '-' . $unit->id;
                    $invoiceDate = Carbon::create($currentYear, $currentMonth, 1)->toDateString();
                    $dueDate = Carbon::create($currentYear, $currentMonth, 1)->addDays($dueDateOffset)->toDateString();
                    $rentAmount = $unit->rent_amount ?? 0;
                    
                    // Get month name for description
                    $monthName = Carbon::create($currentYear, $currentMonth, 1)->format('F Y');
                    
                    $invoice = RentInvoice::create([
                        'invoice_number' => $invoiceNumber,
                        'tenant_id' => $unit->tenant_id,
                        'property_id' => $unit->property_id,
                        'rental_unit_id' => $unit->id,
                        'invoice_date' => $invoiceDate,
                        'due_date' => $dueDate,
                        'rent_amount' => $rentAmount,
                        'late_fee' => 0,
                        'total_amount' => $rentAmount,
                        'currency' => $unit->currency ?? 'MVR',
                        'status' => 'pending',
                        'notes' => "Rent invoice for {$monthName} - {$unit->property->name} - Unit {$unit->unit_number}",
                    ]);

                    $invoice->load(['tenant', 'property', 'rentalUnit']);
                    $generatedInvoices[] = $invoice;

                    $this->info("Generated invoice {$invoiceNumber} for Unit {$unit->unit_number}");

                } catch (\Exception $e) {
                    $errorMsg = "Failed to generate invoice for Unit {$unit->unit_number}: " . $e->getMessage();
                    $errors[] = $errorMsg;
                    $this->error($errorMsg);
                    Log::error($errorMsg, [
                        'unit_id' => $unit->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }
            }

            DB::commit();

            // Log summary
            Log::info('Automatic Rent Invoice Generation Completed', [
                'month' => $currentMonth,
                'year' => $currentYear,
                'generation_date' => $generationDate,
                'total_occupied_units_checked' => $occupiedUnits->count(),
                'invoices_generated' => count($generatedInvoices),
                'skipped_tenants' => count($skippedTenants),
                'duplicate_invoices' => count($duplicateInvoices),
                'errors' => count($errors),
            ]);

            // Display summary
            $this->info('');
            $this->info('=== Invoice Generation Summary ===');
            $this->info("Total occupied units checked: {$occupiedUnits->count()}");
            $this->info("Invoices generated: " . count($generatedInvoices));
            $this->info("Skipped tenants: " . count($skippedTenants));
            $this->info("Duplicate invoices: " . count($duplicateInvoices));
            $this->info("Errors: " . count($errors));

            if (count($skippedTenants) > 0) {
                $this->warn('');
                $this->warn('Skipped Tenants:');
                foreach ($skippedTenants as $skipped) {
                    $this->warn("  - {$skipped['tenant_name']} (Unit {$skipped['unit_number']}): {$skipped['reason']}");
                }
            }

            if (count($duplicateInvoices) > 0) {
                $this->warn('');
                $this->warn('Duplicate Invoices (already exist):');
                foreach ($duplicateInvoices as $dup) {
                    $this->warn("  - {$dup['tenant_name']} (Unit {$dup['unit_number']}): {$dup['invoice_number']}");
                }
            }

            if (count($errors) > 0) {
                $this->error('');
                $this->error('Errors:');
                foreach ($errors as $error) {
                    $this->error("  - {$error}");
                }
            }

            $this->info('');
            $this->info('Invoice generation completed successfully!');

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('Failed to generate rent invoices: ' . $e->getMessage());
            Log::error('Automatic Rent Invoice Generation Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }
    }
}

