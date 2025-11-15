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
            // Payment details columns
            $table->string('payment_method')->nullable()->after('payment_details');
            $table->string('payment_reference')->nullable()->after('payment_method');
            $table->string('payment_bank')->nullable()->after('payment_reference');
            $table->string('payment_account')->nullable()->after('payment_bank');
            $table->text('payment_notes')->nullable()->after('payment_account');
            
            // Payment slip paths as separate table (better normalization)
            $table->text('payment_slip_files')->nullable()->after('payment_notes'); // Store as comma-separated paths
            
            // Add indexes for frequently searched fields
            $table->index('payment_method');
            $table->index('payment_reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rent_invoices', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['payment_method']);
            $table->dropIndex(['payment_reference']);
            
            // Drop columns
            $table->dropColumn([
                'payment_method', 'payment_reference', 'payment_bank', 
                'payment_account', 'payment_notes', 'payment_slip_files'
            ]);
        });
    }
};
