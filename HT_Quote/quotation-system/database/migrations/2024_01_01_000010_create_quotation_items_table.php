<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained('products');
            $table->enum('item_type', ['product', 'service', 'amc']);
            $table->text('description');
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('item_total', 12, 2);
            $table->foreignId('parent_item_id')->nullable()->constrained('quotation_items');
            $table->boolean('is_amc_line')->default(false);
            $table->text('amc_description_used')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('quotation_items');
    }
};