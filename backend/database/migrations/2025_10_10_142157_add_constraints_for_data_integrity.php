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
        // Add constraints for rental_units table
        Schema::table('rental_units', function (Blueprint $table) {
            $table->decimal('rent_amount', 10, 2)->nullable(false)->change();
            $table->integer('number_of_rooms')->nullable(false)->change();
            $table->integer('number_of_toilets')->nullable(false)->change();
        });

        // Add constraints for tenants table
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('first_name')->nullable(false)->change();
            $table->string('last_name')->nullable(false)->change();
            $table->string('email')->nullable(false)->change();
            $table->string('phone')->nullable(false)->change();
        });

        // Add constraints for rent_invoices table
        Schema::table('rent_invoices', function (Blueprint $table) {
            $table->decimal('rent_amount', 10, 2)->nullable(false)->change();
            $table->decimal('total_amount', 10, 2)->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove constraints for rental_units table
        Schema::table('rental_units', function (Blueprint $table) {
            $table->decimal('rent_amount', 10, 2)->nullable()->change();
            $table->integer('number_of_rooms')->nullable()->change();
            $table->integer('number_of_toilets')->nullable()->change();
        });

        // Remove constraints for tenants table
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('first_name')->nullable()->change();
            $table->string('last_name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('phone')->nullable()->change();
        });

        // Remove constraints for rent_invoices table
        Schema::table('rent_invoices', function (Blueprint $table) {
            $table->decimal('rent_amount', 10, 2)->nullable()->change();
            $table->decimal('total_amount', 10, 2)->nullable()->change();
        });
    }
};
