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
        Schema::create('payment_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->onDelete('cascade');
            $table->foreignId('tenant_id')->constrained()->onDelete('cascade');
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->foreignId('rental_unit_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('payment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('payment_mode_id')->constrained()->onDelete('cascade');
            $table->foreignId('currency_id')->constrained()->onDelete('cascade');
            $table->decimal('amount', 10, 2);
            $table->decimal('exchange_rate', 10, 4)->default(1.0000);
            $table->decimal('amount_in_base_currency', 10, 2);
            $table->date('payment_date');
            $table->date('due_date')->nullable();
            $table->string('reference_number')->nullable();
            $table->text('description')->nullable();
            $table->string('status')->default('completed'); // pending, completed, failed, refunded, cancelled
            $table->json('metadata')->nullable(); // Additional payment details
            $table->string('processed_by')->nullable(); // Who processed this payment
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_records');
    }
};
