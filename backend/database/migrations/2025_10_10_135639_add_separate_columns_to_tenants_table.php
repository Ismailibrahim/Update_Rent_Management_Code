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
            $table->string('first_name')->nullable()->after('id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->date('date_of_birth')->nullable()->after('last_name');
            $table->string('national_id')->nullable()->after('date_of_birth');
            $table->string('gender')->nullable()->after('national_id');
            
            // Contact Information
            $table->string('email')->nullable()->after('gender');
            $table->string('phone')->nullable()->after('email');
            $table->text('address')->nullable()->after('phone');
            $table->string('city')->nullable()->after('address');
            $table->string('postal_code')->nullable()->after('city');
            
            // Emergency Contact
            $table->string('emergency_contact_name')->nullable()->after('postal_code');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_relationship')->nullable()->after('emergency_contact_phone');
            
            // Employment Information
            $table->string('employment_company')->nullable()->after('emergency_contact_relationship');
            $table->string('employment_position')->nullable()->after('employment_company');
            $table->decimal('employment_salary', 10, 2)->nullable()->after('employment_position');
            $table->string('employment_phone')->nullable()->after('employment_salary');
            
            // Financial Information
            $table->string('bank_name')->nullable()->after('employment_phone');
            $table->string('account_number')->nullable()->after('bank_name');
            $table->string('account_holder_name')->nullable()->after('account_number');
            
            // Add indexes for frequently searched fields
            $table->index(['first_name', 'last_name']);
            $table->index('email');
            $table->index('phone');
            $table->index('national_id');
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
