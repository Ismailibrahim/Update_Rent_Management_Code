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
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Remove old JSON column
            $table->dropColumn('attached_bills');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Restore old JSON column
            $table->json('attached_bills')->nullable();
        });
    }
};
