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
            // Financial information columns - only add if they don't already exist
            if (!Schema::hasColumn('rental_units', 'rent_amount')) {
                $table->decimal('rent_amount', 10, 2)->nullable()->after('unit_type');
            }
            if (!Schema::hasColumn('rental_units', 'deposit_amount')) {
                $table->decimal('deposit_amount', 10, 2)->nullable()->after('rent_amount');
            }
            if (!Schema::hasColumn('rental_units', 'currency')) {
                $table->string('currency', 3)->default('MVR')->after('deposit_amount');
            }
            
            // Unit details columns - only add if they don't already exist
            if (!Schema::hasColumn('rental_units', 'number_of_rooms')) {
                $table->integer('number_of_rooms')->nullable()->after('currency');
            }
            if (!Schema::hasColumn('rental_units', 'number_of_toilets')) {
                $table->integer('number_of_toilets')->nullable()->after('number_of_rooms');
            }
            if (!Schema::hasColumn('rental_units', 'square_feet')) {
                $table->decimal('square_feet', 8, 2)->nullable()->after('number_of_toilets');
            }
            
            // Add indexes for frequently searched fields (only if columns exist)
            if (Schema::hasColumn('rental_units', 'rent_amount')) {
                try {
                    $table->index('rent_amount', 'rental_units_rent_amount_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('rental_units', 'number_of_rooms')) {
                try {
                    $table->index('number_of_rooms', 'rental_units_number_of_rooms_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('rental_units', 'number_of_toilets')) {
                try {
                    $table->index('number_of_toilets', 'rental_units_number_of_toilets_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('rental_units', 'square_feet')) {
                try {
                    $table->index('square_feet', 'rental_units_square_feet_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['rent_amount']);
            $table->dropIndex(['number_of_rooms']);
            $table->dropIndex(['number_of_toilets']);
            $table->dropIndex(['square_feet']);
            
            // Drop columns
            $table->dropColumn([
                'rent_amount', 'deposit_amount', 'currency',
                'number_of_rooms', 'number_of_toilets', 'square_feet'
            ]);
        });
    }
};
