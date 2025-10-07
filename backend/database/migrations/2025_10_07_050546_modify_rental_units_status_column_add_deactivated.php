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
            // Modify the status column to include 'deactivated' as a valid value
            $table->enum('status', ['available', 'occupied', 'deactivated'])->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            // Revert to original status values (remove 'deactivated')
            $table->enum('status', ['available', 'occupied'])->change();
        });
    }
};
