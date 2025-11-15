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
        Schema::table('payment_records', function (Blueprint $table) {
            // Add rent_invoice_id column after rental_unit_id
            $table->foreignId('rent_invoice_id')
                  ->nullable()
                  ->after('rental_unit_id')
                  ->constrained('rent_invoices')
                  ->onDelete('set null');
            
            // Add index for better query performance
            $table->index('rent_invoice_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_records', function (Blueprint $table) {
            // Drop foreign key constraint first
            $table->dropForeign(['rent_invoice_id']);
            
            // Drop index
            $table->dropIndex(['rent_invoice_id']);
            
            // Drop column
            $table->dropColumn('rent_invoice_id');
        });
    }
};

