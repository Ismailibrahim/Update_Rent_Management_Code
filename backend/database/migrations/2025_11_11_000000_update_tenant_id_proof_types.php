<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE tenants MODIFY COLUMN id_proof_type ENUM('aadhaar', 'pan', 'driving_license', 'passport', 'other', 'national_id') NULL");

        DB::table('tenants')
            ->where('id_proof_type', 'aadhaar')
            ->update(['id_proof_type' => 'national_id']);

        DB::table('tenants')
            ->whereIn('id_proof_type', ['pan', 'driving_license', 'other'])
            ->update(['id_proof_type' => null]);

        DB::statement("ALTER TABLE tenants MODIFY COLUMN id_proof_type ENUM('national_id', 'passport') NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE tenants MODIFY COLUMN id_proof_type ENUM('national_id', 'passport', 'aadhaar', 'pan', 'driving_license', 'other') NULL");

        DB::table('tenants')
            ->where('id_proof_type', 'national_id')
            ->update(['id_proof_type' => 'aadhaar']);

        DB::statement("ALTER TABLE tenants MODIFY COLUMN id_proof_type ENUM('aadhaar', 'pan', 'driving_license', 'passport', 'other') NULL");
    }
};

