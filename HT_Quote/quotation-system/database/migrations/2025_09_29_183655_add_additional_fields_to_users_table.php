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
            $table->string('username')->unique()->after('name');
            $table->renameColumn('password', 'password_hash');
            $table->string('full_name')->after('username');
            $table->enum('role', ['admin', 'user'])->default('user')->after('full_name');
            $table->boolean('is_active')->default(true)->after('role');
            $table->timestamp('last_login')->nullable()->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['username', 'full_name', 'role', 'is_active', 'last_login']);
            $table->renameColumn('password_hash', 'password');
        });
    }
};
