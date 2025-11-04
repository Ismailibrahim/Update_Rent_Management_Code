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
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Bill files column
            $table->text('bill_file_paths')->nullable()->after('attached_bills'); // Store as comma-separated paths
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Drop column
            $table->dropColumn('bill_file_paths');
        });
    }
};
