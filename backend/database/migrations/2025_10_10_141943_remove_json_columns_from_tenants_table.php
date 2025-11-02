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
            // Remove old JSON columns - only drop if they exist
            $columnsToDrop = [];
            if (Schema::hasColumn('tenants', 'personal_info')) {
                $columnsToDrop[] = 'personal_info';
            }
            if (Schema::hasColumn('tenants', 'contact_info')) {
                $columnsToDrop[] = 'contact_info';
            }
            if (Schema::hasColumn('tenants', 'emergency_contact')) {
                $columnsToDrop[] = 'emergency_contact';
            }
            if (Schema::hasColumn('tenants', 'employment_info')) {
                $columnsToDrop[] = 'employment_info';
            }
            if (Schema::hasColumn('tenants', 'financial_info')) {
                $columnsToDrop[] = 'financial_info';
            }
            if (Schema::hasColumn('tenants', 'documents')) {
                $columnsToDrop[] = 'documents';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Restore old JSON columns
            $table->json('personal_info')->nullable();
            $table->json('contact_info')->nullable();
            $table->json('emergency_contact')->nullable();
            $table->json('employment_info')->nullable();
            $table->json('financial_info')->nullable();
            $table->json('documents')->nullable();
        });
    }
};
