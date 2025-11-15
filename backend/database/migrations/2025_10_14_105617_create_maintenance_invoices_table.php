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
        Schema::create('maintenance_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->unsignedBigInteger('maintenance_cost_id');
            $table->unsignedBigInteger('tenant_id');
            $table->unsignedBigInteger('property_id');
            $table->unsignedBigInteger('rental_unit_id');
            $table->unsignedBigInteger('rental_unit_asset_id');
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('maintenance_amount', 10, 2);
            $table->decimal('total_amount', 10, 2);
            $table->string('currency', 3)->default('MVR');
            $table->enum('status', ['pending', 'paid', 'overdue', 'cancelled'])->default('pending');
            $table->date('paid_date')->nullable();
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->string('repair_provider')->nullable();
            $table->date('repair_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_invoices');
    }
};
