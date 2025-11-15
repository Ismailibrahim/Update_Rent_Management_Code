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
        Schema::create('payment_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Rent, Deposit, Maintenance, Utilities, etc.
            $table->string('code')->unique(); // rent, deposit, maintenance, utilities
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_recurring')->default(false); // Is this a recurring payment type?
            $table->boolean('requires_approval')->default(false); // Does this require approval?
            $table->json('settings')->nullable(); // Additional settings
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_types');
    }
};
