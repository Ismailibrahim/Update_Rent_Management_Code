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
        Schema::table('properties', function (Blueprint $table) {
            $table->integer('number_of_floors')->nullable()->change();
            $table->integer('bedrooms')->nullable()->change();
            $table->integer('bathrooms')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Note: We can't easily revert nullable columns without default values
            // If you need to rollback, you'll need to set default values first
            $table->integer('number_of_floors')->nullable(false)->default(1)->change();
            $table->integer('bedrooms')->nullable(false)->default(1)->change();
            $table->integer('bathrooms')->nullable(false)->default(1)->change();
        });
    }
};

