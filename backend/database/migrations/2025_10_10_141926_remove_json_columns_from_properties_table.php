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
        Schema::table('properties', function (Blueprint $table) {
            // Remove old JSON columns - only drop if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('properties', 'photos')) {
                $columnsToDrop[] = 'photos';
            }
            if (Schema::hasColumn('properties', 'amenities')) {
                $columnsToDrop[] = 'amenities';
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
        Schema::table('properties', function (Blueprint $table) {
            // Restore old JSON columns
            $table->json('photos')->nullable();
            $table->json('amenities')->nullable();
        });
    }
};
