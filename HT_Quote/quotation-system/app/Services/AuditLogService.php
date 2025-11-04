<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Str;

class AuditLogService
{
    /**
     * Log an action.
     *
     * @param string $action Action name (created, updated, deleted, etc.)
     * @param Model|null $model The model instance (optional)
     * @param array $options Additional options
     * @return AuditLog
     */
    public static function log(string $action, ?Model $model = null, array $options = []): AuditLog
    {
        $data = [
            'user_id' => Auth::id(),
            'action' => $action,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'request_id' => Str::uuid()->toString(),
            'route' => Request::route()?->getName(),
            'method' => Request::method(),
            'url' => Request::fullUrl(),
            'description' => $options['description'] ?? null,
            'metadata' => $options['metadata'] ?? [],
        ];

        // Add model information if provided
        if ($model) {
            $data['model_type'] = get_class($model);
            $data['model_id'] = $model->id;
        }

        // Add old/new values for updates
        if (isset($options['old_values'])) {
            $data['old_values'] = $options['old_values'];
        }

        if (isset($options['new_values'])) {
            $data['new_values'] = $options['new_values'];
        }

        // Calculate changes diff
        if (isset($data['old_values']) && isset($data['new_values'])) {
            $data['changes'] = static::calculateChanges($data['old_values'], $data['new_values']);
        }

        // Add response status if provided
        if (isset($options['response_status'])) {
            $data['response_status'] = $options['response_status'];
        }

        // Add execution time if provided
        if (isset($options['execution_time'])) {
            $data['execution_time'] = $options['execution_time'];
        }

        return AuditLog::create($data);
    }

    /**
     * Log a model creation.
     */
    public static function logCreated(Model $model, array $options = []): AuditLog
    {
        $attributes = $model->getAttributes();
        
        // Remove sensitive fields
        $attributes = static::sanitizeAttributes($attributes);
        
        return static::log('created', $model, [
            'new_values' => $attributes,
            'description' => $options['description'] ?? "Created " . class_basename($model),
            ...$options,
        ]);
    }

    /**
     * Log a model update.
     */
    public static function logUpdated(Model $model, array $original, array $options = []): AuditLog
    {
        $current = $model->getAttributes();
        
        // Remove sensitive fields
        $original = static::sanitizeAttributes($original);
        $current = static::sanitizeAttributes($current);
        
        $changes = static::calculateChanges($original, $current);
        
        // Don't log if nothing changed (except timestamps)
        if (empty($changes) || (count($changes) === 1 && isset($changes['updated_at']))) {
            return static::log('updated', $model, [
                'description' => "No significant changes to " . class_basename($model),
                ...$options,
            ]);
        }

        return static::log('updated', $model, [
            'old_values' => $original,
            'new_values' => $current,
            'description' => $options['description'] ?? "Updated " . class_basename($model),
            ...$options,
        ]);
    }

    /**
     * Log a model deletion.
     */
    public static function logDeleted(Model $model, array $options = []): AuditLog
    {
        $attributes = $model->getAttributes();
        $attributes = static::sanitizeAttributes($attributes);
        
        return static::log('deleted', $model, [
            'old_values' => $attributes,
            'description' => $options['description'] ?? "Deleted " . class_basename($model),
            ...$options,
        ]);
    }

    /**
     * Log a model view.
     */
    public static function logViewed(Model $model, array $options = []): AuditLog
    {
        return static::log('viewed', $model, [
            'description' => $options['description'] ?? "Viewed " . class_basename($model),
            ...$options,
        ]);
    }

    /**
     * Log an authentication event.
     */
    public static function logAuth(string $action, ?int $userId = null, array $options = []): AuditLog
    {
        $data = [
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'request_id' => Str::uuid()->toString(),
            'route' => Request::route()?->getName(),
            'method' => Request::method(),
            'url' => Request::fullUrl(),
            'description' => $options['description'] ?? ucfirst($action),
            'metadata' => $options['metadata'] ?? [],
        ];

        if (isset($options['response_status'])) {
            $data['response_status'] = $options['response_status'];
        }

        return AuditLog::create($data);
    }

    /**
     * Log an API request.
     */
    public static function logApiRequest(float $executionTime = 0, array $options = []): AuditLog
    {
        return static::log('api_request', null, [
            'execution_time' => $executionTime,
            'response_status' => $options['response_status'] ?? 200,
            'description' => "API Request: " . Request::method() . " " . Request::path(),
            'metadata' => [
                'parameters' => static::sanitizeAttributes(Request::all()),
                ...($options['metadata'] ?? []),
            ],
            ...$options,
        ]);
    }

    /**
     * Calculate the difference between old and new values.
     */
    protected static function calculateChanges(array $old, array $new): array
    {
        $changes = [];
        
        // Get all unique keys
        $keys = array_unique(array_merge(array_keys($old), array_keys($new)));
        
        foreach ($keys as $key) {
            $oldValue = $old[$key] ?? null;
            $newValue = $new[$key] ?? null;
            
            // Only include if values actually changed
            if ($oldValue !== $newValue) {
                $changes[$key] = [
                    'old' => $oldValue,
                    'new' => $newValue,
                ];
            }
        }
        
        return $changes;
    }

    /**
     * Remove sensitive fields from attributes.
     */
    protected static function sanitizeAttributes(array $attributes): array
    {
        $sensitiveFields = [
            'password',
            'password_hash',
            'password_confirmation',
            'api_token',
            'remember_token',
            'secret',
            'private_key',
            'credit_card',
            'cvv',
            'ssn',
        ];

        foreach ($sensitiveFields as $field) {
            if (isset($attributes[$field])) {
                $attributes[$field] = '***REDACTED***';
            }
        }

        return $attributes;
    }

    /**
     * Get logs for a specific model.
     */
    public static function getModelLogs(string $modelType, int $modelId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::forModel($modelType, $modelId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get logs for a specific user.
     */
    public static function getUserLogs(int $userId, int $limit = 50): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::forUser($userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent activity logs.
     */
    public static function getRecentActivity(int $hours = 24, int $limit = 100): \Illuminate\Database\Eloquent\Collection
    {
        return AuditLog::recent($hours)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }
}

