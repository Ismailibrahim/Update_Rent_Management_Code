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
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Add currency_id column
            $table->unsignedBigInteger('currency_id')->nullable()->after('repair_cost');
            $table->foreign('currency_id')->references('id')->on('currencies')->onDelete('restrict');
        });

        // Migrate existing currency data
        // First, ensure we have default currencies
        $defaultCurrencies = [
            'MVR' => DB::table('currencies')->where('code', 'MVR')->first(),
            'USD' => DB::table('currencies')->where('code', 'USD')->first(),
        ];

        // Create default currencies if they don't exist
        if (!$defaultCurrencies['MVR']) {
            $mvrId = DB::table('currencies')->insertGetId([
                'code' => 'MVR',
                'is_default' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $defaultCurrencies['MVR'] = (object)['id' => $mvrId];
        }

        if (!$defaultCurrencies['USD']) {
            $usdId = DB::table('currencies')->insertGetId([
                'code' => 'USD',
                'is_default' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $defaultCurrencies['USD'] = (object)['id' => $usdId];
        }

        // Migrate existing currency string values to currency_id
        DB::statement('UPDATE maintenance_costs SET currency_id = CASE 
            WHEN currency = "MVR" THEN ' . $defaultCurrencies['MVR']->id . '
            WHEN currency = "USD" THEN ' . $defaultCurrencies['USD']->id . '
            ELSE ' . $defaultCurrencies['MVR']->id . '
        END WHERE currency_id IS NULL');

        // Make currency_id not nullable after migration
        Schema::table('maintenance_costs', function (Blueprint $table) {
            $table->unsignedBigInteger('currency_id')->nullable(false)->change();
        });

        // Drop the old currency column
        Schema::table('maintenance_costs', function (Blueprint $table) {
            $table->dropColumn('currency');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_costs', function (Blueprint $table) {
            // Add back currency column
            $table->string('currency', 3)->default('MVR')->after('repair_cost');
        });

        // Migrate currency_id back to currency string
        $currencies = DB::table('currencies')->pluck('code', 'id');
        
        DB::statement('UPDATE maintenance_costs SET currency = CASE ' . 
            implode(' ', array_map(function($id, $code) {
                return "WHEN currency_id = {$id} THEN '{$code}'";
            }, array_keys($currencies->toArray()), $currencies->toArray())) . 
            " ELSE 'MVR' END");

        Schema::table('maintenance_costs', function (Blueprint $table) {
            $table->dropForeign(['currency_id']);
            $table->dropColumn('currency_id');
        });
    }
};

