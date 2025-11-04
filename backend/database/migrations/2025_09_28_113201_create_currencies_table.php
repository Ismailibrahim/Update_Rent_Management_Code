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
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();
            $table->string('code', 3)->unique(); // USD, MVR, EUR, etc.
            $table->string('name'); // US Dollar, Maldivian Rufiyaa, Euro
            $table->string('symbol', 10); // $, MVR, €
            $table->decimal('exchange_rate', 10, 4)->default(1.0000); // Exchange rate to base currency
            $table->boolean('is_base')->default(false); // Is this the base currency?
            $table->boolean('is_active')->default(true);
            $table->integer('decimal_places')->default(2);
            $table->string('thousands_separator', 1)->default(',');
            $table->string('decimal_separator', 1)->default('.');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};
