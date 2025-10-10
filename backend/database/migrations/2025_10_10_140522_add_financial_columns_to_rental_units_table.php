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
        Schema::table('rental_units', function (Blueprint $table) {
            // Financial information columns
            $table->decimal('rent_amount', 10, 2)->nullable()->after('unit_type');
            $table->decimal('deposit_amount', 10, 2)->nullable()->after('rent_amount');
            $table->string('currency', 3)->default('MVR')->after('deposit_amount');
            
            // Unit details columns
            $table->integer('number_of_rooms')->nullable()->after('currency');
            $table->integer('number_of_toilets')->nullable()->after('number_of_rooms');
            $table->decimal('square_feet', 8, 2)->nullable()->after('number_of_toilets');
            
            // Add indexes for frequently searched fields
            $table->index('rent_amount');
            $table->index('number_of_rooms');
            $table->index('number_of_toilets');
            $table->index('square_feet');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rental_units', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['rent_amount']);
            $table->dropIndex(['number_of_rooms']);
            $table->dropIndex(['number_of_toilets']);
            $table->dropIndex(['square_feet']);
            
            // Drop columns
            $table->dropColumn([
                'rent_amount', 'deposit_amount', 'currency',
                'number_of_rooms', 'number_of_toilets', 'square_feet'
            ]);
        });
    }
};
