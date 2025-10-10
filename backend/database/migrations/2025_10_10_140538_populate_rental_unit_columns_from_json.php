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
        // Populate new columns from existing JSON data
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
