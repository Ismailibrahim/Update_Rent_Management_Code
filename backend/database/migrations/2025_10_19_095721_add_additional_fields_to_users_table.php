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
        Schema::table('users', function (Blueprint $table) {
            $table->string('mobile')->nullable();
            $table->string('id_card_number')->nullable();
            $table->foreignId('role_id')->nullable()->constrained()->onDelete('set null');
            $table->string('legacy_role')->default('property_manager');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_login')->nullable();
            $table->timestamp('last_logout')->nullable();
            $table->boolean('is_online')->default(false);
            $table->string('session_token')->nullable();
            $table->timestamp('session_expires')->nullable();
            $table->integer('login_attempts')->default(0);
            $table->timestamp('lock_until')->nullable();
            $table->string('avatar')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'mobile',
                'id_card_number',
                'role_id',
                'legacy_role',
                'is_active',
                'last_login',
                'last_logout',
                'is_online',
                'session_token',
                'session_expires',
                'login_attempts',
                'lock_until',
                'avatar'
            ]);
        });
    }
};