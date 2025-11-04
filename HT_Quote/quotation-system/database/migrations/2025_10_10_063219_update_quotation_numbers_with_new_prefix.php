<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Get the current prefix from system settings
        $newPrefix = \App\Models\SystemSetting::getValue('quotation_number_prefix', 'Q');
        
        // Update all existing quotations to use the new prefix
        $quotations = \App\Models\Quotation::with('customer')->get();
        
        foreach ($quotations as $quotation) {
            if ($quotation->customer && $quotation->customer->resort_code) {
                // Extract year, sequence, and resort_code from current quotation number
                // Current format: Q-2025-001-ATM -> New format: HTM-2025-001-ATM
                $currentNumber = $quotation->quotation_number;
                
                // Parse the current number to extract components
                $parts = explode('-', $currentNumber);
                if (count($parts) >= 4) {
                    // Rebuild with new prefix
                    $newNumber = $newPrefix . '-' . $parts[1] . '-' . $parts[2] . '-' . $parts[3];
                    
                    $quotation->quotation_number = $newNumber;
                    $quotation->save();
                }
            }
        }
        
        // Update quotation sequence table to use new prefix
        \App\Models\QuotationSequence::query()->update(['prefix' => $newPrefix]);
        
        echo "Updated " . $quotations->count() . " quotations with new prefix: " . $newPrefix . "\n";
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not easily reversible as it modifies existing data
        // You would need to restore from backup if you want to revert
    }
};
