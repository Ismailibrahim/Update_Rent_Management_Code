<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Populate new columns from existing JSON data
        DB::statement("
            UPDATE tenants SET 
                first_name = JSON_UNQUOTE(JSON_EXTRACT(personal_info, '$.firstName')),
                last_name = JSON_UNQUOTE(JSON_EXTRACT(personal_info, '$.lastName')),
                date_of_birth = JSON_UNQUOTE(JSON_EXTRACT(personal_info, '$.dateOfBirth')),
                national_id = JSON_UNQUOTE(JSON_EXTRACT(personal_info, '$.nationalId')),
                gender = JSON_UNQUOTE(JSON_EXTRACT(personal_info, '$.gender')),
                email = JSON_UNQUOTE(JSON_EXTRACT(contact_info, '$.email')),
                phone = JSON_UNQUOTE(JSON_EXTRACT(contact_info, '$.phone')),
                address = JSON_UNQUOTE(JSON_EXTRACT(contact_info, '$.address')),
                city = JSON_UNQUOTE(JSON_EXTRACT(contact_info, '$.city')),
                postal_code = JSON_UNQUOTE(JSON_EXTRACT(contact_info, '$.postalCode')),
                emergency_contact_name = JSON_UNQUOTE(JSON_EXTRACT(emergency_contact, '$.name')),
                emergency_contact_phone = JSON_UNQUOTE(JSON_EXTRACT(emergency_contact, '$.phone')),
                emergency_contact_relationship = JSON_UNQUOTE(JSON_EXTRACT(emergency_contact, '$.relationship')),
                employment_company = JSON_UNQUOTE(JSON_EXTRACT(employment_info, '$.company')),
                employment_position = JSON_UNQUOTE(JSON_EXTRACT(employment_info, '$.position')),
                employment_salary = JSON_UNQUOTE(JSON_EXTRACT(employment_info, '$.salary')),
                employment_phone = JSON_UNQUOTE(JSON_EXTRACT(employment_info, '$.phone')),
                bank_name = JSON_UNQUOTE(JSON_EXTRACT(financial_info, '$.bankName')),
                account_number = JSON_UNQUOTE(JSON_EXTRACT(financial_info, '$.accountNumber')),
                account_holder_name = JSON_UNQUOTE(JSON_EXTRACT(financial_info, '$.accountHolderName'))
            WHERE personal_info IS NOT NULL 
            AND personal_info != '{}'
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Clear the populated columns
        DB::statement("
            UPDATE tenants SET 
                first_name = NULL,
                last_name = NULL,
                date_of_birth = NULL,
                national_id = NULL,
                gender = NULL,
                email = NULL,
                phone = NULL,
                address = NULL,
                city = NULL,
                postal_code = NULL,
                emergency_contact_name = NULL,
                emergency_contact_phone = NULL,
                emergency_contact_relationship = NULL,
                employment_company = NULL,
                employment_position = NULL,
                employment_salary = NULL,
                employment_phone = NULL,
                bank_name = NULL,
                account_number = NULL,
                account_holder_name = NULL
        ");
    }
};
