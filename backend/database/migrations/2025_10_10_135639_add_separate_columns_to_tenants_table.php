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
            // Personal Information
            // Only add columns if they don't already exist
            if (!Schema::hasColumn('tenants', 'first_name')) {
                $table->string('first_name')->nullable()->after('id');
            }
            if (!Schema::hasColumn('tenants', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }
            // Only add columns if they don't already exist
            if (!Schema::hasColumn('tenants', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('last_name');
            }
            if (!Schema::hasColumn('tenants', 'national_id')) {
                $table->string('national_id')->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('tenants', 'gender')) {
                $table->string('gender')->nullable()->after('national_id');
            }
            
            // Contact Information
            if (!Schema::hasColumn('tenants', 'email')) {
                $table->string('email')->nullable()->after('gender');
            }
            if (!Schema::hasColumn('tenants', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            if (!Schema::hasColumn('tenants', 'address')) {
                $table->text('address')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('tenants', 'city')) {
                $table->string('city')->nullable()->after('address');
            }
            if (!Schema::hasColumn('tenants', 'postal_code')) {
                $table->string('postal_code')->nullable()->after('city');
            }
            
            // Emergency Contact
            if (!Schema::hasColumn('tenants', 'emergency_contact_name')) {
                $table->string('emergency_contact_name')->nullable()->after('postal_code');
            }
            if (!Schema::hasColumn('tenants', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            }
            if (!Schema::hasColumn('tenants', 'emergency_contact_relationship')) {
                $table->string('emergency_contact_relationship')->nullable()->after('emergency_contact_phone');
            }
            
            // Employment Information
            if (!Schema::hasColumn('tenants', 'employment_company')) {
                $table->string('employment_company')->nullable()->after('emergency_contact_relationship');
            }
            if (!Schema::hasColumn('tenants', 'employment_position')) {
                $table->string('employment_position')->nullable()->after('employment_company');
            }
            if (!Schema::hasColumn('tenants', 'employment_salary')) {
                $table->decimal('employment_salary', 10, 2)->nullable()->after('employment_position');
            }
            if (!Schema::hasColumn('tenants', 'employment_phone')) {
                $table->string('employment_phone')->nullable()->after('employment_salary');
            }
            
            // Financial Information
            if (!Schema::hasColumn('tenants', 'bank_name')) {
                $table->string('bank_name')->nullable()->after('employment_phone');
            }
            if (!Schema::hasColumn('tenants', 'account_number')) {
                $table->string('account_number')->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('tenants', 'account_holder_name')) {
                $table->string('account_holder_name')->nullable()->after('account_number');
            }
            
            // Add indexes for frequently searched fields (only if they don't exist)
            // Check if composite index exists by checking individual columns exist first
            if (Schema::hasColumn('tenants', 'first_name') && Schema::hasColumn('tenants', 'last_name')) {
                try {
                    $table->index(['first_name', 'last_name'], 'tenants_first_name_last_name_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('tenants', 'email')) {
                try {
                    $table->index('email', 'tenants_email_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('tenants', 'phone')) {
                try {
                    $table->index('phone', 'tenants_phone_index');
                } catch (\Exception $e) {
                    // Index might already exist, ignore
                }
            }
            if (Schema::hasColumn('tenants', 'national_id')) {
                try {
                    $table->index('national_id', 'tenants_national_id_index');
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
            $table->dropIndex(['first_name', 'last_name']);
            $table->dropIndex(['email']);
            $table->dropIndex(['phone']);
            $table->dropIndex(['national_id']);
            
            // Drop columns
            $table->dropColumn([
                'first_name', 'last_name', 'date_of_birth', 'national_id', 'gender',
                'email', 'phone', 'address', 'city', 'postal_code',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
                'employment_company', 'employment_position', 'employment_salary', 'employment_phone',
                'bank_name', 'account_number', 'account_holder_name'
            ]);
        });
    }
};
