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
        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Modify the status enum to include 'repaired'
            $table->enum('status', ['working', 'maintenance', 'repaired'])->default('working')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Revert the status enum to original values
            $table->enum('status', ['working', 'maintenance'])->default('working')->change();
        });
    }
};
