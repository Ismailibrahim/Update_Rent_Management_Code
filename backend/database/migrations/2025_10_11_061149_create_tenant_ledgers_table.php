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
        Schema::create('tenant_ledgers', function (Blueprint $table) {
            // Primary key
            $table->id('ledger_id');
            
            // Foreign keys
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->foreignId('payment_type_id')->constrained('payment_types')->onDelete('restrict');
            
            // Transaction details
            $table->dateTime('transaction_date');
            $table->string('description', 255);
            $table->string('reference_no', 50)->nullable();
            
            // Financial fields - using DECIMAL(12,2) for precision
            $table->decimal('debit_amount', 12, 2)->default(0.00);
            $table->decimal('credit_amount', 12, 2)->default(0.00);
            $table->decimal('balance', 12, 2)->default(0.00);
            
            // Payment details
            $table->string('payment_method', 50)->nullable();
            $table->string('transfer_reference_no', 50)->nullable();
            
            // Additional information
            $table->text('remarks')->nullable();
            
            // Audit fields
            $table->string('created_by', 50)->nullable();
            $table->timestamps();
            
            // Indexes for performance optimization
            $table->index(['tenant_id', 'transaction_date']);
            $table->index(['tenant_id', 'payment_type_id']);
            $table->index('transaction_date');
            $table->index('reference_no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_ledgers');
    }
};
