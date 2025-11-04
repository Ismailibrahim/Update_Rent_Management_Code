<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'mobile',
        'id_card_number',
        'password',
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
        'avatar',
    ];

    protected $hidden = [
        'password',
        'session_token',
        'remember_token',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_online' => 'boolean',
        'last_login' => 'datetime',
        'last_logout' => 'datetime',
        'session_expires' => 'datetime',
        'login_attempts' => 'integer',
        'lock_until' => 'datetime',
        'role_id' => 'integer',
    ];

    protected $attributes = [
        'legacy_role' => 'property_manager',
        'is_active' => true,
        'is_online' => false,
        'login_attempts' => 0,
    ];

    // Relationships
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function assignedProperties(): HasMany
    {
        return $this->hasMany(Property::class, 'assigned_manager_id');
    }

    // Accessors
    public function getIsLockedAttribute(): bool
    {
        return $this->lock_until && $this->lock_until > now();
    }

    // Methods
    public function comparePassword(string $candidatePassword): bool
    {
        return password_verify($candidatePassword, $this->password);
    }

    public function createSession(): string
    {
        $sessionToken = bin2hex(random_bytes(32));
        $sessionExpires = now()->addDay();

        $this->update([
            'session_token' => $sessionToken,
            'session_expires' => $sessionExpires,
            'is_online' => true,
            'last_login' => now(),
        ]);

        return $sessionToken;
    }

    public function endSession(): void
    {
        $this->update([
            'session_token' => null,
            'session_expires' => null,
            'is_online' => false,
            'last_logout' => now(),
        ]);
    }

    public function isSessionValid(): bool
    {
        return $this->session_token &&
               $this->session_expires &&
               $this->session_expires > now() &&
               $this->is_online;
    }

    public function incrementLoginAttempts(): void
    {
        // If we have a previous lock that has expired, restart at 1
        if ($this->lock_until && $this->lock_until < now()) {
            $this->update([
                'lock_until' => null,
                'login_attempts' => 1,
            ]);
            return;
        }

        $updates = ['login_attempts' => $this->login_attempts + 1];

        // Lock account after 5 failed attempts for 2 hours
        if ($this->login_attempts + 1 >= 5 && !$this->is_locked) {
            $updates['lock_until'] = now()->addHours(2);
        }

        $this->update($updates);
    }

    public function resetLoginAttempts(): void
    {
        $this->update([
            'login_attempts' => 0,
            'lock_until' => null,
        ]);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOnline($query)
    {
        return $query->where('is_online', true);
    }
}