<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReminderLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderLogController extends Controller
{
    /**
     * Get reminder logs
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = ReminderLog::with('tenant');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            // Filter by reminder type
            if ($request->has('reminder_type')) {
                $query->where('reminder_type', $request->reminder_type);
            }

            // Filter by tenant
            if ($request->has('tenant_id')) {
                $query->where('tenant_id', $request->tenant_id);
            }

            // Pagination
            $perPage = $request->get('per_page', 50);
            $logs = $query->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $logs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reminder logs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get statistics
     */
    public function statistics(): JsonResponse
    {
        try {
            $stats = [
                'total' => ReminderLog::count(),
                'sent' => ReminderLog::where('status', 'sent')->count(),
                'failed' => ReminderLog::where('status', 'failed')->count(),
                'pending' => ReminderLog::where('status', 'pending')->count(),
                'by_type' => ReminderLog::selectRaw('reminder_type, COUNT(*) as count')
                    ->groupBy('reminder_type')
                    ->get(),
                'recent_failures' => ReminderLog::where('status', 'failed')
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

