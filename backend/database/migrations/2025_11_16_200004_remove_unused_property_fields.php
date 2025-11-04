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
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn([
                'country',
                'city',
                'postal_code',
                'number_of_floors',
                'bedrooms',
                'bathrooms',
                'square_feet',
                'year_built',
                'description'
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->string('country')->default('Maldives')->after('island');
            $table->string('city')->nullable()->after('street');
            $table->string('postal_code')->nullable()->after('island');
            $table->integer('number_of_floors')->nullable()->after('island');
            $table->integer('bedrooms')->nullable()->after('number_of_rental_units');
            $table->integer('bathrooms')->nullable()->after('bedrooms');
            $table->integer('square_feet')->nullable()->after('bathrooms');
            $table->integer('year_built')->nullable()->after('square_feet');
            $table->text('description')->nullable()->after('year_built');
        });
    }
};

