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
            $table->integer('quantity')->default(1)->after('asset_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_unit_assets', function (Blueprint $table) {
            $table->dropColumn('quantity');
        });
    }
};
