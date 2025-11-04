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
        Schema::create('hardware_repair_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->onDelete('cascade');
            $table->text('case_numbers')->nullable(); // Multiple case numbers separated by newlines
            $table->decimal('labour_charges', 10, 2)->nullable();
            $table->boolean('labour_inclusive')->default(false);
            $table->decimal('import_duty_freight', 10, 2)->nullable();
            $table->boolean('import_duty_inclusive')->default(false);
            $table->text('serial_numbers')->nullable(); // Multiple serial numbers separated by newlines
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hardware_repair_details');
    }
};
