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
            // Remove old JSON columns - only drop if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('rental_units', 'unit_details')) {
                $columnsToDrop[] = 'unit_details';
            }
            if (Schema::hasColumn('rental_units', 'financial')) {
                $columnsToDrop[] = 'financial';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            // Restore old JSON columns
            $table->json('unit_details')->nullable();
            $table->json('financial')->nullable();
        });
    }
};
