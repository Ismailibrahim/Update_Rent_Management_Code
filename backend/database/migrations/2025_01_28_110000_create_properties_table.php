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
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type');
            $table->string('street');
            $table->string('city');
            $table->string('island');
            $table->string('postal_code');
            $table->string('country')->default('Maldives');
            $table->integer('number_of_floors');
            $table->integer('number_of_rental_units');
            $table->integer('bedrooms');
            $table->integer('bathrooms');
            $table->integer('square_feet');
            $table->integer('year_built');
            $table->text('description')->nullable();
            $table->string('status')->default('vacant');
            $table->json('photo_paths')->nullable();
            $table->json('amenity_list')->nullable();
            $table->unsignedBigInteger('assigned_manager_id')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('assigned_manager_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};