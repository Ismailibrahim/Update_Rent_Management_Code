<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'reminder_type',
        'notification_type',
        'recipient_email',
        'recipient_phone',
        'subject',
        'message',
        'status',
        'error_message',
        'metadata',
        'sent_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at' => 'datetime',
    ];

    /**
     * Relationship with Tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Mark as sent
     */
    public function markAsSent(): void
    {
        $this->status = 'sent';
        $this->sent_at = now();
        $this->save();
    }

    /**
     * Mark as failed
     */
    public function markAsFailed(string $errorMessage): void
    {
        $this->status = 'failed';
        $this->error_message = $errorMessage;
        $this->save();
    }

    /**
     * Get recent logs
     */
    public static function getRecent(int $limit = 50)
    {
        return self::with('tenant')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get logs by status
     */
    public static function getByStatus(string $status, int $limit = 50)
    {
        return self::with('tenant')
            ->where('status', $status)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}

