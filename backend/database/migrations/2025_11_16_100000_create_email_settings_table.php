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
        Schema::create('email_settings', function (Blueprint $table) {
            $table->id();
            $table->enum('provider', ['smtp', 'office365'])->default('smtp');
            $table->string('host')->nullable();
            $table->integer('port')->default(587);
            $table->enum('encryption', ['tls', 'ssl', 'none'])->default('tls');
            $table->string('username')->nullable();
            $table->string('password')->nullable(); // Encrypted
            $table->string('from_address');
            $table->string('from_name')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_settings');
    }
};

