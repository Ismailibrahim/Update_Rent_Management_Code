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
        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('shipment_id');
            $table->unsignedBigInteger('product_id');
            $table->string('item_name');
            $table->integer('quantity');
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('weight', 10, 3)->nullable(); // For weight-based calculations
            $table->decimal('total_item_cost', 15, 2);
            $table->decimal('percentage_share', 8, 4)->default(0.0000); // Percentage of total shipment value
            $table->decimal('allocated_shared_cost', 15, 2)->default(0.00);
            $table->decimal('total_landed_cost', 15, 2)->default(0.00);
            $table->decimal('landed_cost_per_unit', 15, 2)->default(0.00);
            $table->timestamps();
            
            $table->foreign('shipment_id')->references('id')->on('shipments')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipment_items');
    }
};