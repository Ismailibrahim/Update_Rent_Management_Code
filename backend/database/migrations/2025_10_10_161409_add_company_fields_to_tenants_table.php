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
            // Only add tenant_type if it doesn't already exist
            // The create_tenants_table migration already creates tenant_type as string
            if (!Schema::hasColumn('tenants', 'tenant_type')) {
                $table->enum('tenant_type', ['individual', 'company'])->default('individual')->after('id');
            }
            
            // Add company-specific fields - only if they don't already exist
            if (!Schema::hasColumn('tenants', 'company_name')) {
                $table->string('company_name')->nullable()->after('lease_end_date');
            }
            if (!Schema::hasColumn('tenants', 'company_address')) {
                $table->text('company_address')->nullable()->after('company_name');
            }
            if (!Schema::hasColumn('tenants', 'company_registration_number')) {
                $table->string('company_registration_number')->nullable()->after('company_address');
            }
            if (!Schema::hasColumn('tenants', 'company_gst_tin')) {
                $table->string('company_gst_tin')->nullable()->after('company_registration_number');
            }
            if (!Schema::hasColumn('tenants', 'company_telephone')) {
                $table->string('company_telephone')->nullable()->after('company_gst_tin');
            }
            if (!Schema::hasColumn('tenants', 'company_email')) {
                $table->string('company_email')->nullable()->after('company_telephone');
            }
            
            // Add indexes for company fields (only if columns exist)
            if (Schema::hasColumn('tenants', 'tenant_type')) {
                try {
                    $table->index('tenant_type', 'tenants_tenant_type_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('tenants', 'company_name')) {
                try {
                    $table->index('company_name', 'tenants_company_name_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('tenants', 'company_registration_number')) {
                try {
                    $table->index('company_registration_number', 'tenants_company_registration_number_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
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
