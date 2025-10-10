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
            // Add tenant type field
            $table->enum('tenant_type', ['individual', 'company'])->default('individual')->after('id');
            
            // Add company-specific fields
            $table->string('company_name')->nullable()->after('lease_end_date');
            $table->text('company_address')->nullable()->after('company_name');
            $table->string('company_registration_number')->nullable()->after('company_address');
            $table->string('company_gst_tin')->nullable()->after('company_registration_number');
            $table->string('company_telephone')->nullable()->after('company_gst_tin');
            $table->string('company_email')->nullable()->after('company_telephone');
            
            // Add indexes for company fields
            $table->index('tenant_type');
            $table->index('company_name');
            $table->index('company_registration_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['tenant_type']);
            $table->dropIndex(['company_name']);
            $table->dropIndex(['company_registration_number']);
            
            // Drop company-specific fields
            $table->dropColumn([
                'tenant_type',
                'company_name',
                'company_address',
                'company_registration_number',
                'company_gst_tin',
                'company_telephone',
                'company_email'
            ]);
        });
    }
};
