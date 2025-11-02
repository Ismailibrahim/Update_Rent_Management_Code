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
            $table->foreignId('rental_unit_id')->nullable()->constrained('rental_units')->onDelete('set null');
            $table->index(['tenant_id', 'rental_unit_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_ledgers', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'rental_unit_id']);
            $table->dropForeign(['rental_unit_id']);
            $table->dropColumn('rental_unit_id');
        });
    }
};
