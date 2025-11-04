<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * This is a consolidated migration that combines all products table migrations
     * into a single, logically ordered structure.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            // ==========================================
            // BASIC IDENTIFICATION
            // ==========================================
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('sku', 100)->unique()->nullable();
            
            // ==========================================
            // CATEGORIZATION
            // ==========================================
            $table->foreignId('category_id')->constrained('product_categories');
            
            // ==========================================
            // PRICING INFORMATION
            // ==========================================
            $table->decimal('unit_price', 12, 2);
            $table->decimal('landed_cost', 15, 2)->nullable();
            $table->decimal('total_man_days', 8, 2)->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->string('pricing_model', 20)->nullable();
            
            // ==========================================
            // AMC (Annual Maintenance Contract) INFORMATION
            // ==========================================
            $table->boolean('has_amc_option')->default(false);
            $table->decimal('amc_unit_price', 12, 2)->default(0);
            $table->foreignId('amc_description_id')->nullable()->constrained('amc_descriptions');
            
            // ==========================================
            // PRODUCT DETAILS
            // ==========================================
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->string('part_number', 100)->nullable();
            
            // ==========================================
            // FEATURE FLAGS AND SETTINGS
            // ==========================================
            $table->boolean('is_man_day_based')->default(false);
            $table->boolean('is_discountable')->default(true);
            $table->boolean('is_refurbished')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            
            // ==========================================
            // METADATA
            // ==========================================
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            
            // ==========================================
            // INDEXES FOR PERFORMANCE
            // ==========================================
            $table->index('category_id');
            $table->index('is_active');
            $table->index('sort_order');
            $table->index('is_discountable');
            $table->index('created_by');
            $table->index('sku');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};

