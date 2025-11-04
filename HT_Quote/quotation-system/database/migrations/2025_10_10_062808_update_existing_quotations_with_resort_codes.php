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
        // First, ensure all customers have resort codes
        $customers = \App\Models\Customer::whereNull('resort_code')->orWhere('resort_code', '')->get();
        
        foreach ($customers as $customer) {
            $customer->resort_code = \App\Models\QuotationSequence::generateResortCode($customer->resort_name);
            $customer->save();
        }
        
        // Update existing quotations with new format
        $quotations = \App\Models\Quotation::with('customer')->get();
        
        foreach ($quotations as $quotation) {
            if ($quotation->customer && $quotation->customer->resort_code) {
                // Extract year and sequence from current quotation number
                // Format: Q-2025-001 -> Q-2025-001-ATM
                $currentNumber = $quotation->quotation_number;
                
                // Add resort code to the end
                $newNumber = $currentNumber . '-' . $quotation->customer->resort_code;
                
                $quotation->quotation_number = $newNumber;
                $quotation->save();
            }
        }
        
        // Reset sequences per customer for the current year
        $currentYear = date('Y');
        $customers = \App\Models\Customer::all();
        
        foreach ($customers as $customer) {
            // Get all quotations for this customer in current year
            $customerQuotations = \App\Models\Quotation::where('customer_id', $customer->id)
                ->whereYear('created_at', $currentYear)
                ->orderBy('created_at')
                ->get();
            
            // Reset sequence numbers starting from 001
            $sequence = 1;
            foreach ($customerQuotations as $quotation) {
                // Update quotation number with correct sequence
                $newNumber = 'Q-' . $currentYear . '-' . str_pad($sequence, 3, '0', STR_PAD_LEFT) . '-' . $customer->resort_code;
                $quotation->quotation_number = $newNumber;
                $quotation->save();
                $sequence++;
            }
            
            // Update quotation sequence table
            \App\Models\QuotationSequence::updateOrCreate(
                ['customer_id' => $customer->id, 'year' => $currentYear],
                ['last_number' => $sequence - 1, 'prefix' => 'Q']
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // This migration is not easily reversible as it modifies existing data
        // In a production environment, you would need to backup the data first
        // For now, we'll leave this empty as the changes are significant
    }
};
