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
        // Migrate existing contact data to the new customer_contacts table
        DB::statement("
            INSERT INTO customer_contacts (
                customer_id, 
                contact_person, 
                designation, 
                email, 
                phone, 
                is_primary, 
                contact_type, 
                created_at, 
                updated_at
            )
            SELECT 
                id as customer_id,
                contact_person,
                designation,
                email,
                phone,
                TRUE as is_primary,
                'primary' as contact_type,
                created_at,
                updated_at
            FROM customers 
            WHERE contact_person IS NOT NULL 
            AND contact_person != ''
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove migrated contact data
        DB::table('customer_contacts')->where('is_primary', true)->delete();
    }
};
