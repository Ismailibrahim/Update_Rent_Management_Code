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
        Schema::table('rental_unit_assets', function (Blueprint $table) {
            $table->enum('status', ['working', 'maintenance'])->default('working')->after('quantity');
            $table->text('maintenance_notes')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_unit_assets', function (Blueprint $table) {
            $table->dropColumn(['status', 'maintenance_notes']);
        });
    }
};
