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
        Schema::table('tenants', function (Blueprint $table) {
            // Only add columns if they don't already exist
            if (!Schema::hasColumn('tenants', 'lease_start_date')) {
                $table->date('lease_start_date')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('tenants', 'lease_end_date')) {
                $table->date('lease_end_date')->nullable()->after('lease_start_date');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['lease_start_date', 'lease_end_date']);
        });
    }
};
