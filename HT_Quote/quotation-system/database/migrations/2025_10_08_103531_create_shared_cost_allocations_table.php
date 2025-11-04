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
        Schema::create('shared_cost_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shared_cost_id')->constrained('shared_costs')->onDelete('cascade');
            $table->foreignId('shipment_item_id')->constrained('shipment_items')->onDelete('cascade');
            $table->decimal('allocated_amount', 12, 2);
            $table->boolean('is_manual_override')->default(false);
            $table->timestamps();
            
            // Unique constraint: one allocation per shared cost per item
            $table->unique(['shared_cost_id', 'shipment_item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shared_cost_allocations');
    }
};
