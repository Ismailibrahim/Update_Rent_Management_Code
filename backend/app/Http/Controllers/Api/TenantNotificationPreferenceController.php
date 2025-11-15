<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TenantNotificationPreference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TenantNotificationPreferenceController extends Controller
{
    /**
     * Get preference for a tenant
     */
    public function show(int $tenantId): JsonResponse
    {
        try {
            $preference = TenantNotificationPreference::getOrCreateForTenant($tenantId);

            return response()->json([
                'success' => true,
                'data' => $preference
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notification preferences',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update tenant notification preferences
     */
    public function update(Request $request, int $tenantId): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email_enabled' => 'boolean',
                'sms_enabled' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $preference = TenantNotificationPreference::getOrCreateForTenant($tenantId);
            $preference->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Notification preferences updated successfully',
                'data' => $preference
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update notification preferences',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

