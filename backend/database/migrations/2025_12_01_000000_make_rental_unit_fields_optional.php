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
            // Make floor_number nullable
            $table->integer('floor_number')->nullable()->change();
            
            // Make number_of_rooms nullable
            $table->integer('number_of_rooms')->nullable()->change();
            
            // Make number_of_toilets nullable
            $table->integer('number_of_toilets')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            // Revert floor_number to NOT NULL with default
            $table->integer('floor_number')->nullable(false)->default(1)->change();
            
            // Revert number_of_rooms to NOT NULL with default
            $table->integer('number_of_rooms')->nullable(false)->default(0)->change();
            
            // Revert number_of_toilets to NOT NULL with default
            $table->integer('number_of_toilets')->nullable(false)->default(0)->change();
        });
    }
};

