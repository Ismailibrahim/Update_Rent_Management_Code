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
        Schema::table('terms_conditions_templates', function (Blueprint $table) {
            $table->boolean('display_in_quotation')->default(false)->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('terms_conditions_templates', function (Blueprint $table) {
            $table->dropColumn('display_in_quotation');
        });
    }
};
