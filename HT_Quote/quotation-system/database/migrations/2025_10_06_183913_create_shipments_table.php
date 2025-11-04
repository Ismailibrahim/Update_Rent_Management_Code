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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Shipment name (auto-generated or custom)
            $table->text('description')->nullable();
            $table->date('shipment_date');
            $table->enum('calculation_method', ['proportional', 'equal', 'weight_based', 'quantity_based'])->default('proportional');
            $table->string('base_currency', 3)->default('USD'); // USD, MVR, etc.
            $table->decimal('exchange_rate', 10, 4)->default(1.0000); // Exchange rate to base currency
            $table->decimal('total_base_cost', 15, 2)->default(0.00);
            $table->decimal('total_shared_cost', 15, 2)->default(0.00);
            $table->decimal('total_landed_cost', 15, 2)->default(0.00);
            $table->boolean('is_finalized')->default(false); // Whether prices have been updated to products
            $table->timestamps();
            $table->unsignedBigInteger('created_by');
            
            $table->foreign('created_by')->references('id')->on('users');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};