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
        Schema::create('rental_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('property_id')->constrained()->onDelete('cascade');
            $table->string('unit_number');
            $table->string('unit_type');
            $table->integer('floor_number');
            $table->decimal('rent_amount', 10, 2)->default(0);
            $table->decimal('deposit_amount', 10, 2)->default(0);
            $table->string('currency')->default('MVR');
            $table->integer('number_of_rooms')->default(0);
            $table->integer('number_of_toilets')->default(0);
            $table->decimal('square_feet', 8, 2)->default(0);
            $table->string('status')->default('available');
            $table->foreignId('tenant_id')->nullable()->constrained()->onDelete('set null');
            $table->date('move_in_date')->nullable();
            $table->date('lease_end_date')->nullable();
            $table->json('amenities')->nullable();
            $table->json('photos')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rental_units');
    }
};