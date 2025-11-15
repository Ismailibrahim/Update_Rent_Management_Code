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
        // Insert the min_per_man_day system setting
        DB::table('system_settings')->insert([
            'setting_key' => 'min_per_man_day',
            'setting_value' => '300',
            'description' => 'Lowest Man Day Price',
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove the min_per_man_day system setting
        DB::table('system_settings')->where('setting_key', 'min_per_man_day')->delete();
    }
};
