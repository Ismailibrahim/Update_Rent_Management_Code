<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReminderConfiguration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReminderConfigurationController extends Controller
{
    /**
     * Get all reminder configurations
     */
    public function index(): JsonResponse
    {
        try {
            $configurations = ReminderConfiguration::orderBy('reminder_type')
                ->orderBy('sort_order')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $configurations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reminder configurations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create reminder configuration
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'reminder_type' => 'required|in:rent_due,rent_overdue,payment_due,payment_overdue,maintenance_due,maintenance_overdue',
                'timing_type' => 'required|in:before,on_date,after',
                'days_offset' => 'required|integer|min:0',
                'frequency' => 'required|in:daily,weekly,once',
                'is_active' => 'boolean',
                'sort_order' => 'integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $configuration = ReminderConfiguration::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Reminder configuration created successfully',
                'data' => $configuration
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create reminder configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update reminder configuration
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $configuration = ReminderConfiguration::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'reminder_type' => 'sometimes|in:rent_due,rent_overdue,payment_due,payment_overdue,maintenance_due,maintenance_overdue',
                'timing_type' => 'sometimes|in:before,on_date,after',
                'days_offset' => 'sometimes|integer|min:0',
                'frequency' => 'sometimes|in:daily,weekly,once',
                'is_active' => 'boolean',
                'sort_order' => 'integer',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $configuration->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Reminder configuration updated successfully',
                'data' => $configuration
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update reminder configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete reminder configuration
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $configuration = ReminderConfiguration::findOrFail($id);
            $configuration->delete();

            return response()->json([
                'success' => true,
                'message' => 'Reminder configuration deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete reminder configuration',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

