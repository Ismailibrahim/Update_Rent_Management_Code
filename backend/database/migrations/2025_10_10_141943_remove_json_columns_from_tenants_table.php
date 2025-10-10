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
            // Remove old JSON columns
            $table->dropColumn([
                'personal_info', 'contact_info', 'emergency_contact', 
                'employment_info', 'financial_info', 'documents'
            ]);
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
