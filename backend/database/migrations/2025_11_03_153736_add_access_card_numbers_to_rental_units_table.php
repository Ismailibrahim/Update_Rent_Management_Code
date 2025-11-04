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
            $table->text('access_card_numbers')->nullable()->after('electricity_billing_account');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            $table->dropColumn('access_card_numbers');
        });
    }
};
