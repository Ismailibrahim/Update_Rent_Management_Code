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
        Schema::table('rental_units', function (Blueprint $table) {
            // Only add column if it doesn't already exist
            // The create_rental_units_table migration already creates unit_type as string
            // This migration was meant to convert it to enum, but we'll skip if it exists
            if (!Schema::hasColumn('rental_units', 'unit_type')) {
                $table->enum('unit_type', ['residential', 'office', 'shop', 'warehouse', 'other'])
                      ->default('residential')
                      ->after('unit_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            $table->dropColumn('unit_type');
        });
    }
};
