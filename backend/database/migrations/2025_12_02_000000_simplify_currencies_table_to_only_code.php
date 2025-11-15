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
        Schema::table('currencies', function (Blueprint $table) {
            // Drop columns that are not needed - only drop if they exist
            $columnsToDrop = [];
            
            if (Schema::hasColumn('currencies', 'name')) {
                $columnsToDrop[] = 'name';
            }
            if (Schema::hasColumn('currencies', 'symbol')) {
                $columnsToDrop[] = 'symbol';
            }
            if (Schema::hasColumn('currencies', 'exchange_rate')) {
                $columnsToDrop[] = 'exchange_rate';
            }
            if (Schema::hasColumn('currencies', 'is_base')) {
                $columnsToDrop[] = 'is_base';
            }
            if (Schema::hasColumn('currencies', 'is_active')) {
                $columnsToDrop[] = 'is_active';
            }
            if (Schema::hasColumn('currencies', 'decimal_places')) {
                $columnsToDrop[] = 'decimal_places';
            }
            if (Schema::hasColumn('currencies', 'thousands_separator')) {
                $columnsToDrop[] = 'thousands_separator';
            }
            if (Schema::hasColumn('currencies', 'decimal_separator')) {
                $columnsToDrop[] = 'decimal_separator';
            }
            
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }

            // Add is_default column if it doesn't exist
            if (!Schema::hasColumn('currencies', 'is_default')) {
                $table->boolean('is_default')->default(false)->after('code');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            // Drop is_default column if it exists
            if (Schema::hasColumn('currencies', 'is_default')) {
                $table->dropColumn('is_default');
            }
            
            // Restore dropped columns
            $table->string('name')->nullable();
            $table->string('symbol', 10)->nullable();
            $table->decimal('exchange_rate', 10, 4)->default(1.0000);
            $table->boolean('is_base')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('decimal_places')->default(2);
            $table->string('thousands_separator', 1)->default(',');
            $table->string('decimal_separator', 1)->default('.');
        });
    }
};

