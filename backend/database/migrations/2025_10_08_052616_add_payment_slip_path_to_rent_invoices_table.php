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
        Schema::table('rent_invoices', function (Blueprint $table) {
            $table->string('payment_slip_path')->nullable()->after('payment_details');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rent_invoices', function (Blueprint $table) {
            $table->dropColumn('payment_slip_path');
        });
    }
};