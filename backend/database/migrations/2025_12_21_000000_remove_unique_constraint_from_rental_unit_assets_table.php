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
        // Drop foreign keys first (they depend on the unique index)
        // Use raw SQL to get the actual constraint names
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'rental_unit_assets' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");

        foreach ($foreignKeys as $fk) {
            $constraintName = $fk->CONSTRAINT_NAME;
            DB::statement('ALTER TABLE `rental_unit_assets` DROP FOREIGN KEY `' . $constraintName . '`');
        }

        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Now drop the unique constraint
            // This enables tracking individual asset items with different locations/installation dates
            $table->dropUnique(['rental_unit_id', 'asset_id']);
        });

        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Recreate foreign keys without the unique constraint
            $table->foreign('rental_unit_id')
                  ->references('id')
                  ->on('rental_units')
                  ->onDelete('cascade');
            
            $table->foreign('asset_id')
                  ->references('id')
                  ->on('assets')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign keys first
        $foreignKeys = DB::select("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'rental_unit_assets' 
            AND REFERENCED_TABLE_NAME IS NOT NULL
        ");

        foreach ($foreignKeys as $fk) {
            $constraintName = $fk->CONSTRAINT_NAME;
            DB::statement('ALTER TABLE `rental_unit_assets` DROP FOREIGN KEY `' . $constraintName . '`');
        }

        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Restore the unique constraint
            $table->unique(['rental_unit_id', 'asset_id']);
        });

        Schema::table('rental_unit_assets', function (Blueprint $table) {
            // Recreate foreign keys
            $table->foreign('rental_unit_id')
                  ->references('id')
                  ->on('rental_units')
                  ->onDelete('cascade');
            
            $table->foreign('asset_id')
                  ->references('id')
                  ->on('assets')
                  ->onDelete('cascade');
        });
    }
};

