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
        Schema::create('reminder_configurations', function (Blueprint $table) {
            $table->id();
            $table->enum('reminder_type', ['rent_due', 'rent_overdue', 'payment_due', 'payment_overdue', 'maintenance_due', 'maintenance_overdue'])->index();
            $table->enum('timing_type', ['before', 'on_date', 'after']); // before due date, on due date, after due date
            $table->integer('days_offset')->default(0); // e.g., 7 days before, 0 for on date, 3 for 3 days after
            $table->enum('frequency', ['daily', 'weekly', 'once'])->default('daily');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            
            $table->index(['reminder_type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminder_configurations');
    }
};

