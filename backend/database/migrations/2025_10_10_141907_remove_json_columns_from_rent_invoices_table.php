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
            // Remove old JSON columns
            $table->dropColumn(['payment_details', 'payment_slip_paths']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rent_invoices', function (Blueprint $table) {
            // Restore old JSON columns
            $table->json('payment_details')->nullable();
            $table->json('payment_slip_paths')->nullable();
        });
    }
};
