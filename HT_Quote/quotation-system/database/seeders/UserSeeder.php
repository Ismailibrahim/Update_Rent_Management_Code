<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Idempotent seeding by unique email
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'System Administrator',
                'username' => 'admin',
                'password_hash' => Hash::make('password'),
                'full_name' => 'System Administrator',
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        User::updateOrCreate(
            ['email' => 'demo@example.com'],
            [
                'name' => 'Demo User',
                'username' => 'demo',
                'password_hash' => Hash::make('demo123'),
                'full_name' => 'Demo User',
                'role' => 'user',
                'is_active' => true,
            ]
        );
    }
}
