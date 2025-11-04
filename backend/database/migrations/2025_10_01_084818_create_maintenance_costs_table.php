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
        Schema::create('maintenance_costs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('rental_unit_asset_id');
            $table->decimal('repair_cost', 10, 2);
            $table->string('currency', 3)->default('USD');
            $table->text('description')->nullable();
            $table->json('attached_bills')->nullable(); // Store file paths/names
            $table->date('repair_date')->nullable();
            $table->string('repair_provider')->nullable();
            $table->enum('status', ['draft', 'pending', 'paid', 'rejected'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('rental_unit_asset_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_costs');
    }
};
