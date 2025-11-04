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
        Schema::create('payment_modes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Cash, Bank Transfer, Check, Credit Card, etc.
            $table->string('code')->unique(); // cash, bank_transfer, check, credit_card
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('requires_reference')->default(false); // Does this mode require a reference number?
            $table->json('settings')->nullable(); // Additional settings like fees, processing time, etc.
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_modes');
    }
};
