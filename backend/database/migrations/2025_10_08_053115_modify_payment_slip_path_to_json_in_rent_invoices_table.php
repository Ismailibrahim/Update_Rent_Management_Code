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
        Schema::table('rent_invoices', function (Blueprint $table) {
            // Drop the old single file path column
            $table->dropColumn('payment_slip_path');
            
            // Add new JSON column for multiple file paths
            $table->json('payment_slip_paths')->nullable()->after('payment_details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rent_invoices', function (Blueprint $table) {
            // Drop the JSON column
            $table->dropColumn('payment_slip_paths');
            
            // Add back the old single file path column
            $table->string('payment_slip_path')->nullable()->after('payment_details');
        });
    }
};