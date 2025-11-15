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
        Schema::table('hardware_repair_details', function (Blueprint $table) {
            $table->dropColumn(['import_duty_freight', 'import_duty_inclusive']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hardware_repair_details', function (Blueprint $table) {
            $table->decimal('import_duty_freight', 12, 2)->nullable()->after('labour_inclusive');
            $table->boolean('import_duty_inclusive')->default(false)->after('import_duty_freight');
        });
    }
};
