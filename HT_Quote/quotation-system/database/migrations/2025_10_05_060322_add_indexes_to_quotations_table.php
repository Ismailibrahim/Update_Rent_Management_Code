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
        Schema::table('quotations', function (Blueprint $table) {
            // Add indexes for better query performance
            $table->index(['status', 'created_at'], 'quotations_status_created_at_index');
            $table->index(['customer_id', 'created_at'], 'quotations_customer_created_at_index');
            $table->index(['created_at'], 'quotations_created_at_index');
            $table->index(['valid_until'], 'quotations_valid_until_index');
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            // Add indexes for better query performance
            $table->index(['quotation_id', 'item_type'], 'quotation_items_quotation_type_index');
            $table->index(['product_id'], 'quotation_items_product_id_index');
        });

        Schema::table('customers', function (Blueprint $table) {
            // Add indexes for better query performance
            $table->index(['company_name'], 'customers_company_name_index');
            $table->index(['email'], 'customers_email_index');
        });

        Schema::table('products', function (Blueprint $table) {
            // Add indexes for better query performance
            $table->index(['name'], 'products_name_index');
            $table->index(['sku'], 'products_sku_index');
            $table->index(['category_id'], 'products_category_id_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotations', function (Blueprint $table) {
            $table->dropIndex('quotations_status_created_at_index');
            $table->dropIndex('quotations_customer_created_at_index');
            $table->dropIndex('quotations_created_at_index');
            $table->dropIndex('quotations_valid_until_index');
        });

        Schema::table('quotation_items', function (Blueprint $table) {
            $table->dropIndex('quotation_items_quotation_type_index');
            $table->dropIndex('quotation_items_product_id_index');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('customers_company_name_index');
            $table->dropIndex('customers_email_index');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_name_index');
            $table->dropIndex('products_sku_index');
            $table->dropIndex('products_category_id_index');
        });
    }
};