<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SmsLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SmsLog::with(['tenant', 'rentalUnit', 'template']);

            // Filter by status
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Filter by tenant
            if ($request->has('tenant_id') && $request->tenant_id) {
                $query->where('tenant_id', $request->tenant_id);
            }

            // Filter by date range
            if ($request->has('from_date') && $request->from_date) {
                $query->whereDate('created_at', '>=', $request->from_date);
            }

            if ($request->has('to_date') && $request->to_date) {
                $query->whereDate('created_at', '<=', $request->to_date);
            }

            // Search by phone number
            if ($request->has('search') && $request->search) {
                $query->where('phone_number', 'like', '%' . $request->search . '%');
            }

            $logs = $query->orderBy('created_at', 'desc')
                ->paginate($request->per_page ?? 50);

            return response()->json([
                'success' => true,
                'data' => [
                    'logs' => $logs->items(),
                    'pagination' => [
                        'current_page' => $logs->currentPage(),
                        'per_page' => $logs->perPage(),
                        'total' => $logs->total(),
                        'last_page' => $logs->lastPage(),
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch logs: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $log = SmsLog::with(['tenant', 'rentalUnit', 'template'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'log' => $log
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Log not found'
            ], 404);
        }
    }
}
