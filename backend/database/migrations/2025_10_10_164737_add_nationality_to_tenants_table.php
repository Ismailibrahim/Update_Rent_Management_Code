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
            // Only add nationality if it doesn't already exist
            // The create_tenants_table migration already creates nationality
            if (!Schema::hasColumn('tenants', 'nationality')) {
                $table->string('nationality')->nullable()->after('national_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('nationality');
        });
    }
};
