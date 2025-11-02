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
            // Make optional fields nullable
            $table->integer('square_feet')->nullable()->change();
            $table->integer('year_built')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            // Revert to not nullable
            $table->integer('square_feet')->nullable(false)->change();
            $table->integer('year_built')->nullable(false)->change();
        });
    }
};