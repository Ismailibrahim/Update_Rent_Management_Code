<?php

namespace App\Traits;

use App\Services\AuditLogService;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    /**
     * Store original attributes temporarily for audit logging
     */
    protected static array $auditOriginals = [];

    /**
     * Boot the trait.
     */
    public static function bootAuditable(): void
    {
        // Log when a model is created
        static::created(function ($model) {
            if (static::shouldLog('created')) {
                AuditLogService::logCreated($model);
            }
        });

        // Log when a model is updated
        static::updating(function ($model) {
            // Store original values temporarily for audit logging
            $objectHash = spl_object_hash($model);
            $modelKey = get_class($model) . ':' . $objectHash;
            
            // Store original attributes before update
            static::$auditOriginals[$modelKey] = $model->getOriginal();
        });

        static::updated(function ($model) {
            if (static::shouldLog('updated')) {
                // Get stored original values
                $objectHash = spl_object_hash($model);
                $modelKey = get_class($model) . ':' . $objectHash;
                
                $original = static::$auditOriginals[$modelKey] ?? [];
                
                // Clean up
                unset(static::$auditOriginals[$modelKey]);
                
                // Only log if we have original values and something actually changed
                if (!empty($original) && $model->wasChanged()) {
                    AuditLogService::logUpdated($model, $original);
                }
            }
        });

        // Log when a model is deleted
        static::deleted(function ($model) {
            if (static::shouldLog('deleted')) {
                AuditLogService::logDeleted($model);
            }
        });

        // Log when a soft-deleted model is restored
        // Check if model uses SoftDeletes trait
        $usesSoftDeletes = in_array(
            \Illuminate\Database\Eloquent\SoftDeletes::class,
            class_uses_recursive(static::class)
        );
        
        if ($usesSoftDeletes) {
            static::restored(function ($model) {
                if (static::shouldLog('restored')) {
                    AuditLogService::log('restored', $model, [
                        'description' => "Restored " . class_basename($model),
                    ]);
                }
            });
        }
    }

    /**
     * Determine if the action should be logged.
     */
    protected static function shouldLog(string $action): bool
    {
        // Don't log if user is not authenticated (system operations)
        if (!Auth::check() && !app()->runningInConsole()) {
            return true; // Log system operations too
        }

        // Check if auditing is disabled for this model
        if (isset(static::$auditingDisabled) && static::$auditingDisabled) {
            return false;
        }

        // Check if specific actions are excluded
        $excludedActions = static::$auditExcludedActions ?? [];
        if (in_array($action, $excludedActions)) {
            return false;
        }

        return true;
    }

    /**
     * Manually log a view action.
     */
    public function logView(?string $description = null): void
    {
        AuditLogService::logViewed($this, [
            'description' => $description ?? "Viewed " . class_basename($this),
        ]);
    }

    /**
     * Get audit logs for this model instance.
     */
    public function auditLogs(int $limit = 50)
    {
        return AuditLogService::getModelLogs(get_class($this), $this->id, $limit);
    }

    /**
     * Get the latest audit log for this model.
     */
    public function latestAuditLog()
    {
        return $this->auditLogs(1)->first();
    }

    /**
     * Disable auditing temporarily.
     */
    public static function disableAuditing(): void
    {
        static::$auditingDisabled = true;
    }

    /**
     * Enable auditing.
     */
    public static function enableAuditing(): void
    {
        static::$auditingDisabled = false;
    }

    /**
     * Exclude specific actions from auditing.
     */
    public static function excludeFromAuditing(array $actions): void
    {
        static::$auditExcludedActions = $actions;
    }

    /**
     * Get fields that should be excluded from audit logging.
     */
    public static function getAuditExcludedFields(): array
    {
        return static::$auditExcludedFields ?? [
            'created_at',
            'updated_at',
            'deleted_at',
        ];
    }
}

