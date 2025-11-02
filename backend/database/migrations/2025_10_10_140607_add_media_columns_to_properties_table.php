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
            // Media columns - only add if they don't already exist
            // The create_properties_table migration already creates photo_paths as JSON
            // and amenity_list as JSON, so we skip adding them here
            if (!Schema::hasColumn('properties', 'photo_paths')) {
                if (Schema::hasColumn('properties', 'photos')) {
                    $table->text('photo_paths')->nullable()->after('photos'); // Store as comma-separated paths
                } else {
                    // If photos column doesn't exist, add after status or at the end
                    $table->text('photo_paths')->nullable(); // Store as comma-separated paths
                }
            }
            if (!Schema::hasColumn('properties', 'amenity_list')) {
                if (Schema::hasColumn('properties', 'amenities')) {
                    $table->text('amenity_list')->nullable()->after('amenities'); // Store as comma-separated amenities
                } else {
                    // If amenities column doesn't exist, add at the end
                    $table->text('amenity_list')->nullable(); // Store as comma-separated amenities
                }
            }
            
            // Note: JSON columns cannot be directly indexed in MySQL
            // Indexes on JSON columns require generated columns on specific JSON paths
            // Skipping index creation for JSON columns to avoid errors
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Note: We're not dropping indexes for JSON columns since they weren't created
            // Drop columns only if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('properties', 'photo_paths')) {
                $columnsToDrop[] = 'photo_paths';
            }
            if (Schema::hasColumn('properties', 'amenity_list')) {
                $columnsToDrop[] = 'amenity_list';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
