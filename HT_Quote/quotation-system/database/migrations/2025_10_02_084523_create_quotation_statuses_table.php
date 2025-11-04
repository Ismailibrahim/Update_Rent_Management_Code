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
        Schema::create('quotation_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('status_name', 100)->unique();
            $table->string('status_key', 50)->unique(); // For internal reference (e.g., 'draft', 'sent')
            $table->string('color', 50)->nullable(); // Color code for UI (e.g., 'blue', 'green')
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_statuses');
    }
};
