<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Carbon\Carbon;

class AuditLog extends Model
{
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'old_values',
        'new_values',
        'changes',
        'description',
        'ip_address',
        'user_agent',
        'request_id',
        'route',
        'method',
        'url',
        'response_status',
        'execution_time',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'changes' => 'array',
        'metadata' => 'array',
        'response_status' => 'integer',
        'execution_time' => 'decimal:3',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the model that was audited (polymorphic relation).
     */
    public function model(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope a query to only include logs from a specific user.
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope a query to only include logs for a specific action.
     */
    public function scopeForAction($query, $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope a query to only include logs for a specific model type.
     */
    public function scopeForModel($query, $modelType, $modelId = null)
    {
        $query = $query->where('model_type', $modelType);
        
        if ($modelId !== null) {
            $query->where('model_id', $modelId);
        }
        
        return $query;
    }

    /**
     * Scope a query to only include recent logs.
     */
    public function scopeRecent($query, $hours = 24)
    {
        return $query->where('created_at', '>=', Carbon::now()->subHours($hours));
    }

    /**
     * Scope a query to only include logs within a date range.
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope a query to exclude authentication logs.
     */
    public function scopeExcludeAuth($query)
    {
        return $query->whereNotIn('action', ['login', 'logout', 'password_changed']);
    }

    /**
     * Scope a query to only include authentication logs.
     */
    public function scopeOnlyAuth($query)
    {
        return $query->whereIn('action', ['login', 'logout', 'password_changed', 'token_created', 'token_revoked']);
    }

    /**
     * Get formatted description with contextual information.
     */
    public function getFormattedDescriptionAttribute(): string
    {
        if ($this->description) {
            return $this->description;
        }

        $description = ucfirst($this->action);
        
        if ($this->model_type) {
            $modelName = class_basename($this->model_type);
            $description .= " {$modelName}";
            
            if ($this->model_id) {
                $description .= " #{$this->model_id}";
            }
        }
        
        if ($this->user) {
            $description .= " by {$this->user->name}";
        }
        
        return $description;
    }

    /**
     * Check if this log represents a data change.
     */
    public function isDataChange(): bool
    {
        return in_array($this->action, ['created', 'updated', 'deleted', 'restored']);
    }

    /**
     * Check if this log represents an authentication event.
     */
    public function isAuthEvent(): bool
    {
        return in_array($this->action, ['login', 'logout', 'password_changed', 'token_created', 'token_revoked']);
    }

    /**
     * Get the number of fields changed.
     */
    public function getChangesCountAttribute(): int
    {
        return $this->changes ? count($this->changes) : 0;
    }

    /**
     * Get a human-readable diff of changes.
     */
    public function getChangesDiff(): array
    {
        if (!$this->isDataChange() || !$this->changes) {
            return [];
        }

        $diff = [];
        foreach ($this->changes as $field => $value) {
            $oldValue = $this->old_values[$field] ?? null;
            $newValue = $this->new_values[$field] ?? null;
            
            $diff[] = [
                'field' => $field,
                'old' => $oldValue,
                'new' => $newValue,
            ];
        }

        return $diff;
    }

    /**
     * Get the model instance (if still exists).
     */
    public function getModelInstance()
    {
        if (!$this->model_type || !$this->model_id) {
            return null;
        }

        try {
            return $this->model_type::find($this->model_id);
        } catch (\Exception $e) {
            return null;
        }
    }
}

