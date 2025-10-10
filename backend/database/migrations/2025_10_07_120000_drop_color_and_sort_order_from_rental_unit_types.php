<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('rental_unit_types', function (Blueprint $table) {
            if (Schema::hasColumn('rental_unit_types', 'color')) {
                $table->dropColumn('color');
            }
            if (Schema::hasColumn('rental_unit_types', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('rental_unit_types', function (Blueprint $table) {
            if (!Schema::hasColumn('rental_unit_types', 'color')) {
                $table->string('color', 7)->default('#3B82F6');
            }
            if (!Schema::hasColumn('rental_unit_types', 'sort_order')) {
                $table->integer('sort_order')->default(0);
            }
        });
    }
};


