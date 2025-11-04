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
        Schema::table('rental_units', function (Blueprint $table) {
            $table->string('water_meter_number', 100)->nullable()->after('square_feet');
            $table->string('water_billing_account', 100)->nullable()->after('water_meter_number');
            $table->string('electricity_meter_number', 100)->nullable()->after('water_billing_account');
            $table->string('electricity_billing_account', 100)->nullable()->after('electricity_meter_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            $table->dropColumn([
                'water_meter_number',
                'water_billing_account',
                'electricity_meter_number',
                'electricity_billing_account'
            ]);
        });
    }
};
