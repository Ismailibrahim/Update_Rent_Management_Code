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
        Schema::create('service_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->text('task_description');
            $table->decimal('estimated_man_days', 8, 2)->nullable();
            $table->integer('sequence_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Index for better performance
            $table->index(['product_id', 'sequence_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_tasks');
    }
};

