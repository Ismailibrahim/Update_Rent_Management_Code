<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationSequence extends Model
{
    protected $table = 'quotation_sequence';

    protected $fillable = [
        'year',
        'last_number',
        'prefix'
    ];

    public static function getNextNumber($year = null)
    {
        $year = $year ?: date('Y');

        // Get prefix from system settings
        $prefix = \App\Models\SystemSetting::getValue('quotation_number_prefix', 'Q');
        
        $sequence = static::firstOrCreate(
            ['year' => $year],
            ['last_number' => 0, 'prefix' => $prefix]
        );

        $sequence->increment('last_number');

        return $sequence->last_number;
    }

    /**
     * Get next number for preview (without incrementing)
     */
    public static function getNextPreviewNumber($year = null)
    {
        $year = $year ?: date('Y');

        // Get prefix from system settings
        $prefix = \App\Models\SystemSetting::getValue('quotation_number_prefix', 'Q');
        
        $sequence = static::firstOrCreate(
            ['year' => $year],
            ['last_number' => 0, 'prefix' => $prefix]
        );

        return $sequence->last_number + 1;
    }

    /**
     * Generate quotation number using the format from system settings
     */
    public static function generateQuotationNumber($customerId, $year = null, $month = null)
    {
        $year = $year ?: date('Y');
        $month = $month ?: date('m');
        
        // Get customer to retrieve resort_code
        $customer = \App\Models\Customer::find($customerId);
        if (!$customer) {
            throw new \Exception("Customer not found with ID: {$customerId}");
        }
        
        // Ensure customer has resort_code
        if (!$customer->resort_code) {
            $customer->resort_code = static::generateResortCode($customer->resort_name);
            $customer->save();
        }
        
        // Get the format from system settings (keep resort_code but use global sequence)
        $format = SystemSetting::getValue('quotation_number_format', '{prefix}-{year}-{sequence}-{resort_code}');
        
        // Get global sequence number for the year
        $sequence = static::getNextNumber($year);
        
        // Replace placeholders in the format
        $quotationNumber = static::formatQuotationNumber($format, $year, $month, $sequence, $customer->resort_code);
        
        return $quotationNumber;
    }

    /**
     * Generate preview quotation number (without saving to database)
     */
    public static function generatePreviewQuotationNumber($customerId, $year = null, $month = null)
    {
        $year = $year ?: date('Y');
        $month = $month ?: date('m');
        
        // Get customer to retrieve resort_code
        $customer = \App\Models\Customer::find($customerId);
        if (!$customer) {
            throw new \Exception("Customer not found with ID: {$customerId}");
        }
        
        // Ensure customer has resort_code
        if (!$customer->resort_code) {
            $customer->resort_code = static::generateResortCode($customer->resort_name);
            $customer->save();
        }
        
        // Get the format from system settings
        $format = SystemSetting::getValue('quotation_number_format', '{prefix}-{year}-{sequence}-{resort_code}');
        
        // Get preview sequence number (without incrementing)
        $sequence = static::getNextPreviewNumber($year);
        
        // Replace placeholders in the format
        $quotationNumber = static::formatQuotationNumber($format, $year, $month, $sequence, $customer->resort_code);
        
        return $quotationNumber;
    }

    /**
     * Format quotation number by replacing placeholders
     */
    protected static function formatQuotationNumber($format, $year, $month, $sequence, $resortCode)
    {
        // Get prefix from system settings
        $prefix = SystemSetting::getValue('quotation_number_prefix', 'Q');
        
        // Replace placeholders
        $formatted = str_replace([
            '{prefix}',
            '{year}',
            '{month}',
            '{day}',
            '{sequence}',
            '{resort_code}'
        ], [
            $prefix,
            $year,
            str_pad($month, 2, '0', STR_PAD_LEFT),
            str_pad(date('d'), 2, '0', STR_PAD_LEFT),
            str_pad($sequence, 3, '0', STR_PAD_LEFT),
            $resortCode
        ], $format);
        
        return $formatted;
    }

    /**
     * Generate resort code from resort name
     * Uses first letter of each word, up to 3 characters
     */
    public static function generateResortCode($resortName)
    {
        if (empty($resortName)) {
            return 'UNK'; // Unknown
        }
        
        // Split by spaces and get first letter of each word
        $words = explode(' ', trim($resortName));
        $code = '';
        
        foreach ($words as $word) {
            if (strlen($code) >= 3) break; // Limit to 3 characters
            if (!empty($word)) {
                $code .= strtoupper(substr($word, 0, 1));
            }
        }
        
        // If we have less than 3 characters, pad with numbers or letters
        while (strlen($code) < 3) {
            $code .= 'X';
        }
        
        // Ensure uniqueness by checking existing codes
        $originalCode = $code;
        $counter = 1;
        
        while (\App\Models\Customer::where('resort_code', $code)->exists()) {
            $code = substr($originalCode, 0, 2) . $counter;
            $counter++;
        }
        
        return $code;
    }
}