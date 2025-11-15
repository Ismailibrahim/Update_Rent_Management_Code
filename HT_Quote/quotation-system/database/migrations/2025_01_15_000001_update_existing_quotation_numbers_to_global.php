<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Get all existing quotations grouped by year
        $quotations = DB::table('quotations')
            ->select('id', 'quotation_number', 'customer_id', 'created_at')
            ->orderBy('created_at')
            ->get();

        // Group by year and assign new global sequence numbers
        $yearGroups = [];
        foreach ($quotations as $quotation) {
            $year = date('Y', strtotime($quotation->created_at));
            if (!isset($yearGroups[$year])) {
                $yearGroups[$year] = [];
            }
            $yearGroups[$year][] = $quotation;
        }

        // Update quotation numbers for each year
        foreach ($yearGroups as $year => $yearQuotations) {
            $sequence = 1;
            
            foreach ($yearQuotations as $quotation) {
                // Get customer to retrieve resort_code
                $customer = DB::table('customers')->where('id', $quotation->customer_id)->first();
                $resortCode = $customer ? $customer->resort_code : 'UNK';
                
                // Generate new quotation number with global sequence
                $newQuotationNumber = $this->generateNewQuotationNumber($year, $sequence, $resortCode);
                
                // Update the quotation
                DB::table('quotations')
                    ->where('id', $quotation->id)
                    ->update(['quotation_number' => $newQuotationNumber]);
                
                $sequence++;
            }
        }

        // Update the quotation_sequence table to reflect the highest sequence for each year
        foreach ($yearGroups as $year => $yearQuotations) {
            $highestSequence = count($yearQuotations);
            
            DB::table('quotation_sequence')
                ->where('year', $year)
                ->update(['last_number' => $highestSequence]);
        }
    }

    public function down()
    {
        // This migration is not easily reversible as we don't store the original numbers
        // In a real scenario, you might want to backup the original numbers first
        throw new Exception('This migration cannot be reversed. Please restore from backup if needed.');
    }

    private function generateNewQuotationNumber($year, $sequence, $resortCode)
    {
        // Get prefix from system settings
        $prefix = DB::table('system_settings')
            ->where('setting_key', 'quotation_number_prefix')
            ->value('setting_value') ?? 'Q';
        
        // Format: {prefix}-{year}-{sequence}-{resort_code}
        return sprintf('%s-%s-%03d-%s', $prefix, $year, $sequence, $resortCode);
    }
};
