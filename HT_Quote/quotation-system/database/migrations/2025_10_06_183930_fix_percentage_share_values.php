<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix percentage_share values that are stored as percentages (>= 1) instead of decimals (< 1)
        DB::table('shipment_items')
            ->where('percentage_share', '>=', 1)
            ->update([
                'percentage_share' => DB::raw('percentage_share / 100')
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convert back to percentages (multiply by 100)
        DB::table('shipment_items')
            ->where('percentage_share', '<', 1)
            ->update([
                'percentage_share' => DB::raw('percentage_share * 100')
            ]);
    }
};
