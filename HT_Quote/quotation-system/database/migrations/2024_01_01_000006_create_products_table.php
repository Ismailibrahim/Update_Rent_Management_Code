<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('sku', 100)->unique()->nullable();
            $table->foreignId('category_id')->constrained('product_categories');
            $table->decimal('unit_price', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->boolean('is_man_day_based')->default(false);
            $table->boolean('has_amc_option')->default(false);
            $table->decimal('amc_unit_price', 12, 2)->default(0);
            $table->foreignId('amc_description_id')->nullable()->constrained('amc_descriptions');
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('part_number', 100)->nullable();
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('products');
    }
};