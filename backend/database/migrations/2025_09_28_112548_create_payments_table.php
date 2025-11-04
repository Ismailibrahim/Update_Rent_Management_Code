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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('rental_unit_id')->nullable()->constrained()->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('MVR');
            $table->string('payment_type'); // rent, deposit, maintenance, etc.
            $table->string('payment_method'); // cash, bank_transfer, check, etc.
            $table->date('payment_date');
            $table->date('due_date')->nullable();
            $table->text('description')->nullable();
            $table->string('reference_number')->nullable();
            $table->string('status')->default('completed'); // pending, completed, failed, refunded
            $table->json('metadata')->nullable(); // Additional payment details
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
