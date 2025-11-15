<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class SmsSettingController extends Controller
{
    public function index(): JsonResponse
    {
        try {
            $settings = SmsSetting::all()->keyBy('setting_key');
            
            return response()->json([
                'success' => true,
                'data' => [
                    'settings' => $settings
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch settings: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updated = [];
            
            foreach ($request->settings as $setting) {
                $smsSetting = SmsSetting::setValue(
                    $setting['key'],
                    $setting['value'] ?? '',
                    $setting['description'] ?? null
                );
                $updated[] = $smsSetting;
            }

            return response()->json([
                'success' => true,
                'message' => 'Settings updated successfully',
                'data' => [
                    'settings' => $updated
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update settings: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getSetting(string $key): JsonResponse
    {
        try {
            $setting = SmsSetting::where('setting_key', $key)->first();
            
            if (!$setting) {
                return response()->json([
                    'success' => false,
                    'message' => 'Setting not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'setting' => $setting
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch setting: ' . $e->getMessage()
            ], 500);
        }
    }
}
