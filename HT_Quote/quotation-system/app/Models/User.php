<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Auditable, HasRoles;

    protected $fillable = [
        'name',
        'username',
        'email',
        'password',
        'password_hash',
        'full_name',
        'role',
        'is_active',
        'last_login'
    ];

    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'last_login' => 'datetime'
        ];
    }

    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
