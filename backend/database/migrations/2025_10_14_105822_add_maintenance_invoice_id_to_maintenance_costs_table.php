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
            $table->unsignedBigInteger('maintenance_invoice_id')->nullable()->after('maintenance_request_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('maintenance_costs', function (Blueprint $table) {
            $table->dropColumn('maintenance_invoice_id');
        });
    }
};
