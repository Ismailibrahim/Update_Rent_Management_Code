<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditLogController extends Controller
{
    /**
     * Get all audit logs with filtering options.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user');

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by action
        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        // Filter by model type
        if ($request->has('model_type')) {
            $query->where('model_type', $request->model_type);
        }

        // Filter by model ID
        if ($request->has('model_id')) {
            $query->where('model_id', $request->model_id);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        // Filter by recent hours
        if ($request->has('recent_hours')) {
            $query->recent($request->recent_hours);
        }

        // Exclude authentication logs
        if ($request->boolean('exclude_auth')) {
            $query->excludeAuth();
        }

        // Only authentication logs
        if ($request->boolean('only_auth')) {
            $query->onlyAuth();
        }

        // Search in description
        if ($request->has('search')) {
            $query->where('description', 'like', '%' . $request->search . '%');
        }

        // Pagination
        $perPage = $request->get('per_page', 50);
        $logs = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Get a specific audit log.
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        $auditLog->load('user');

        return response()->json([
            'data' => $auditLog,
            'changes_diff' => $auditLog->getChangesDiff(),
        ]);
    }

    /**
     * Get logs for a specific model.
     */
    public function modelLogs(Request $request): JsonResponse
    {
        $request->validate([
            'model_type' => 'required|string',
            'model_id' => 'required|integer',
        ]);

        $logs = AuditLog::forModel($request->model_type, $request->model_id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Get logs for a specific user.
     */
    public function userLogs(Request $request, int $userId): JsonResponse
    {
        $logs = AuditLog::forUser($userId)
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 50));

        return response()->json([
            'data' => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * Get recent activity.
     */
    public function recentActivity(Request $request): JsonResponse
    {
        $hours = $request->get('hours', 24);
        $limit = $request->get('limit', 100);

        $logs = AuditLog::recent($hours)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'data' => $logs,
            'count' => $logs->count(),
        ]);
    }

    /**
     * Get audit log statistics.
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = AuditLog::query();

        // Apply date filter if provided
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        } else {
            // Default to last 30 days
            $query->recent(24 * 30);
        }

        // Total logs
        $totalLogs = $query->count();

        // Logs by action
        $byAction = (clone $query)
            ->selectRaw('action, COUNT(*) as count')
            ->groupBy('action')
            ->orderBy('count', 'desc')
            ->get()
            ->pluck('count', 'action');

        // Logs by user (top 10)
        $byUser = (clone $query)
            ->selectRaw('user_id, COUNT(*) as count')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->with('user')
            ->orderBy('count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'user_id' => $item->user_id,
                    'user_name' => $item->user?->name ?? 'Unknown',
                    'count' => $item->count,
                ];
            });

        // Logs by model type
        $byModel = (clone $query)
            ->selectRaw('model_type, COUNT(*) as count')
            ->whereNotNull('model_type')
            ->groupBy('model_type')
            ->orderBy('count', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'model_type' => $item->model_type,
                    'model_name' => class_basename($item->model_type),
                    'count' => $item->count,
                ];
            });

        // Activity trends (last 7 days)
        $dailyActivity = (clone $query)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->limit(7)
            ->get()
            ->pluck('count', 'date');

        // Hourly activity (last 24 hours)
        $hourlyActivity = (clone $query)
            ->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDay())
            ->groupBy('hour')
            ->orderBy('hour')
            ->get()
            ->pluck('count', 'hour');

        // Performance metrics
        $performanceMetrics = (clone $query)
            ->selectRaw('
                AVG(execution_time) as avg_execution_time,
                MAX(execution_time) as max_execution_time,
                MIN(execution_time) as min_execution_time,
                COUNT(CASE WHEN execution_time > 1000 THEN 1 END) as slow_requests
            ')
            ->whereNotNull('execution_time')
            ->first();

        // Response status distribution
        $statusDistribution = (clone $query)
            ->selectRaw('response_status, COUNT(*) as count')
            ->whereNotNull('response_status')
            ->groupBy('response_status')
            ->orderBy('count', 'desc')
            ->get()
            ->pluck('count', 'response_status');

        // Error rate
        $errorRate = 0;
        if ($totalLogs > 0 && $statusDistribution->isNotEmpty()) {
            $errors = $statusDistribution->filter(function ($count, $status) {
                return $status >= 400;
            })->sum();
            $errorRate = round(($errors / $totalLogs) * 100, 2);
        }

        // Most active day of week
        $dayOfWeekActivity = (clone $query)
            ->selectRaw('DAYNAME(created_at) as day_name, DAYOFWEEK(created_at) as day_num, COUNT(*) as count')
            ->groupBy('day_name', 'day_num')
            ->orderBy('count', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'day' => $item->day_name,
                    'count' => $item->count,
                ];
            });

        // Security metrics
        $securityMetrics = [
            'failed_logins' => (clone $query)->where('action', 'login_failed')->count(),
            'successful_logins' => (clone $query)->where('action', 'login')->count(),
            'unique_ips' => (clone $query)->distinct('ip_address')->count('ip_address'),
        ];

        // Change frequency (most frequently changed models)
        $changeFrequency = (clone $query)
            ->whereIn('action', ['created', 'updated', 'deleted'])
            ->selectRaw('model_type, COUNT(*) as change_count')
            ->whereNotNull('model_type')
            ->groupBy('model_type')
            ->orderBy('change_count', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($item) {
                return [
                    'model_type' => $item->model_type,
                    'model_name' => class_basename($item->model_type),
                    'change_count' => $item->change_count,
                ];
            });

        return response()->json([
            'total_logs' => $totalLogs,
            'by_action' => $byAction,
            'top_users' => $byUser,
            'by_model' => $byModel,
            'daily_activity' => $dailyActivity,
            'hourly_activity' => $hourlyActivity,
            'performance' => [
                'avg_execution_time' => $performanceMetrics->avg_execution_time ?? 0,
                'max_execution_time' => $performanceMetrics->max_execution_time ?? 0,
                'min_execution_time' => $performanceMetrics->min_execution_time ?? 0,
                'slow_requests' => $performanceMetrics->slow_requests ?? 0,
            ],
            'status_distribution' => $statusDistribution,
            'error_rate' => $errorRate,
            'day_of_week_activity' => $dayOfWeekActivity,
            'security' => $securityMetrics,
            'change_frequency' => $changeFrequency,
        ]);
    }

    /**
     * Get activity timeline report.
     */
    public function timelineReport(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'group_by' => 'sometimes|in:hour,day,week,month',
        ]);

        $groupBy = $request->get('group_by', 'day');
        $query = AuditLog::query()
            ->whereBetween('created_at', [$request->start_date, $request->end_date]);

        $formatMap = [
            'hour' => '%Y-%m-%d %H:00:00',
            'day' => '%Y-%m-%d',
            'week' => '%Y Week %u',
            'month' => '%Y-%m',
        ];

        $format = $formatMap[$groupBy] ?? $formatMap['day'];

        $timeline = $query
            ->selectRaw("DATE_FORMAT(created_at, '{$format}') as period, COUNT(*) as count")
            ->groupBy('period')
            ->orderBy('period')
            ->get();

        return response()->json([
            'data' => $timeline,
            'period' => $groupBy,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
        ]);
    }

    /**
     * Get top performers/changes report.
     */
    public function topChangesReport(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $days = $request->get('days', 30);

        $query = AuditLog::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->whereIn('action', ['created', 'updated', 'deleted']);

        // Top changed models
        $topModels = (clone $query)
            ->selectRaw('model_type, COUNT(*) as change_count')
            ->whereNotNull('model_type')
            ->groupBy('model_type')
            ->orderBy('change_count', 'desc')
            ->limit($limit)
            ->get()
            ->map(function ($item) {
                return [
                    'model_type' => $item->model_type,
                    'model_name' => class_basename($item->model_type),
                    'change_count' => $item->change_count,
                ];
            });

        // Top users by activity
        $topUserStats = (clone $query)
            ->selectRaw('user_id, COUNT(*) as activity_count')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderBy('activity_count', 'desc')
            ->limit($limit)
            ->get();
        
        $userIds = $topUserStats->pluck('user_id')->toArray();
        $users = \App\Models\User::whereIn('id', $userIds)->get()->keyBy('id');
        
        $topUsers = $topUserStats->map(function ($stat) use ($users) {
            return [
                'user_id' => $stat->user_id,
                'user_name' => $users->get($stat->user_id)?->name ?? 'Unknown',
                'activity_count' => $stat->activity_count,
            ];
        });

        // Most frequently changed fields
        $topFields = AuditLog::query()
            ->where('created_at', '>=', now()->subDays($days))
            ->where('action', 'updated')
            ->whereNotNull('changes')
            ->get()
            ->flatMap(function ($log) {
                $changes = is_array($log->changes) ? $log->changes : json_decode($log->changes, true) ?? [];
                return array_keys($changes);
            })
            ->countBy()
            ->sortDesc()
            ->take($limit)
            ->map(function ($count, $field) {
                return [
                    'field' => $field,
                    'change_count' => $count,
                ];
            })
            ->values();

        return response()->json([
            'top_models' => $topModels,
            'top_users' => $topUsers,
            'top_fields' => $topFields,
            'period_days' => $days,
        ]);
    }
}

