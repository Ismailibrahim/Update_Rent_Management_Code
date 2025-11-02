<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Only populate columns from JSON data if the JSON columns exist
        // This migration is only needed when migrating from an older schema that had JSON columns
        if (!Schema::hasColumn('rental_units', 'financial')) {
            // JSON columns don't exist, skip data population
            return;
        }

        // Populate new columns from existing JSON data
        try {
            DB::statement("
                UPDATE rental_units SET 
                    rent_amount = JSON_UNQUOTE(JSON_EXTRACT(financial, '$.rentAmount')),
                    deposit_amount = JSON_UNQUOTE(JSON_EXTRACT(financial, '$.depositAmount')),
                    currency = COALESCE(JSON_UNQUOTE(JSON_EXTRACT(financial, '$.currency')), 'MVR'),
                    number_of_rooms = JSON_UNQUOTE(JSON_EXTRACT(unit_details, '$.numberOfRooms')),
                    number_of_toilets = JSON_UNQUOTE(JSON_EXTRACT(unit_details, '$.numberOfToilets')),
                    square_feet = JSON_UNQUOTE(JSON_EXTRACT(unit_details, '$.squareFeet'))
                WHERE financial IS NOT NULL 
                AND financial != '[]'
            ");
        } catch (\Exception $e) {
            // If JSON columns don't exist or extraction fails, skip silently
            // This is expected in fresh migrations
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear the populated columns
        DB::statement("
            UPDATE rental_units SET 
                rent_amount = NULL,
                deposit_amount = NULL,
                currency = 'MVR',
                number_of_rooms = NULL,
                number_of_toilets = NULL,
                square_feet = NULL
        ");
    }
};
