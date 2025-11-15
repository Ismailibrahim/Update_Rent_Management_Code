<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantNotificationPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'email_enabled',
        'sms_enabled',
    ];

    protected $casts = [
        'email_enabled' => 'boolean',
        'sms_enabled' => 'boolean',
    ];

    /**
     * Relationship with Tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get or create preferences for a tenant
     */
    public static function getOrCreateForTenant(int $tenantId): self
    {
        return self::firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'email_enabled' => true,
                'sms_enabled' => true,
            ]
        );
    }

    /**
     * Check if tenant wants email notifications
     */
    public function wantsEmail(): bool
    {
        return $this->email_enabled;
    }

    /**
     * Check if tenant wants SMS notifications
     */
    public function wantsSms(): bool
    {
        return $this->sms_enabled;
    }
}

