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
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'contact_person',
                'designation', 
                'email',
                'phone',
                'contact_type'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->string('contact_person')->nullable();
            $table->string('designation')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->enum('contact_type', ['primary', 'billing', 'technical', 'manager', 'operations', 'other'])->default('primary');
        });
    }
};
