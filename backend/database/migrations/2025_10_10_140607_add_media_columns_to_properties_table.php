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
            // Media columns
            $table->text('photo_paths')->nullable()->after('photos'); // Store as comma-separated paths
            $table->text('amenity_list')->nullable()->after('amenities'); // Store as comma-separated amenities
            
            // Add indexes for frequently searched fields
            $table->index('amenity_list');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['amenity_list']);
            
            // Drop columns
            $table->dropColumn(['photo_paths', 'amenity_list']);
        });
    }
};
