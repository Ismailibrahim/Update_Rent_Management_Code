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
        Schema::table('tenant_ledgers', function (Blueprint $table) {
            // This migration was intended to add unit financials but is empty
            // Keeping it empty to maintain migration order
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_ledgers', function (Blueprint $table) {
            // This migration was empty, so nothing to rollback
        });
    }
};
