<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\User;
use Illuminate\Support\Facades\Hash;

$user = User::updateOrCreate(
    ['email' => 'admin@rentmanagement.com'],
    [
        'name' => 'Admin User',
        'password' => Hash::make('admin123'),
        'email_verified_at' => now(),
        'legacy_role' => 'admin',
        'is_active' => true,
        'is_online' => false,
        'login_attempts' => 0,
    ]
);

echo "✓ Admin user created successfully!\n";
echo "Email: admin@rentmanagement.com\n";
echo "Password: admin123\n";
echo "\nUser ID: {$user->id}\n";
echo "User Name: {$user->name}\n";

