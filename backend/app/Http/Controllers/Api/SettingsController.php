<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettingsController extends Controller
{
    /**
     * Get dropdown options for forms
     */
    public function getDropdowns(): JsonResponse
    {
        try {
            $dropdownOptions = [
                'cities' => [
                    'Male', 'Addu City', 'Fuvahmulah', 'Kulhudhuffushi', 'Thinadhoo', 'Eydhafushi',
                    'Vilufushi', 'Funadhoo', 'Dhidhdhoo', 'Kudahuvadhoo', 'Thulusdhoo', 'Mahibadhoo',
                    'Naifaru', 'Rasdhoo', 'Thoddoo', 'Dhigurah', 'Dhiggaru', 'Kandholhudhoo',
                    'Kulhudhuffushi', 'Thulusdhoo', 'Hinnavaru', 'Naifaru', 'Kurendhoo', 'Maafushi',
                    'Guraidhoo', 'Thoddoo', 'Rasdhoo', 'Thoddoo', 'Mathiveri', 'Himmafushi',
                    'Thulusdhoo', 'Hulhumale', 'Vilimalé', 'Malé'
                ],
                'islands' => [
                    'Male' => ['Male', 'Hulhumale', 'Vilimalé'],
                    'Addu City' => ['Addu City', 'Hithadhoo', 'Maradhoo', 'Feydhoo', 'Hulhudhoo'],
                    'Fuvahmulah' => ['Fuvahmulah'],
                    'Kulhudhuffushi' => ['Kulhudhuffushi'],
                    'Thinadhoo' => ['Thinadhoo'],
                    'Eydhafushi' => ['Eydhafushi'],
                    'Vilufushi' => ['Vilufushi'],
                    'Funadhoo' => ['Funadhoo'],
                    'Dhidhdhoo' => ['Dhidhdhoo'],
                    'Kudahuvadhoo' => ['Kudahuvadhoo'],
                    'Thulusdhoo' => ['Thulusdhoo'],
                    'Mahibadhoo' => ['Mahibadhoo'],
                    'Naifaru' => ['Naifaru'],
                    'Rasdhoo' => ['Rasdhoo'],
                    'Thoddoo' => ['Thoddoo'],
                    'Dhigurah' => ['Dhigurah'],
                    'Dhiggaru' => ['Dhiggaru'],
                    'Kandholhudhoo' => ['Kandholhudhoo'],
                    'Hinnavaru' => ['Hinnavaru'],
                    'Kurendhoo' => ['Kurendhoo'],
                    'Maafushi' => ['Maafushi'],
                    'Guraidhoo' => ['Guraidhoo'],
                    'Mathiveri' => ['Mathiveri'],
                    'Himmafushi' => ['Himmafushi'],
                ],
                'propertyTypes' => [
                    'house', 'apartment', 'villa', 'commercial', 'office', 'shop', 'warehouse', 'land'
                ],
                'propertyStatuses' => [
                    'occupied', 'vacant', 'maintenance', 'renovation'
                ],
                'rentalUnitStatuses' => [
                    'available', 'occupied', 'maintenance', 'renovation'
                ],
                'assetCategories' => [
                    'furniture', 'appliance', 'electronics', 'plumbing', 'electrical', 'hvac', 'security', 'other'
                ],
                'assetStatuses' => [
                    'working', 'faulty', 'repairing', 'replaced', 'disposed'
                ],
                'tenantStatuses' => [
                    'active', 'inactive', 'suspended'
                ],
                'userRoles' => [
                    'admin', 'property_manager', 'accountant'
                ],
                'currencies' => [
                    'MVR', 'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'INR'
                ]
            ];

            return response()->json([
                'dropdownOptions' => $dropdownOptions
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch dropdown options',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get invoice generation settings
     */
    public function getInvoiceGenerationSettings(): JsonResponse
    {
        try {
            $settings = [
                'invoice_generation_date' => (int) SystemSetting::getValue('invoice_generation_date', '1'),
                'invoice_generation_enabled' => SystemSetting::getValue('invoice_generation_enabled', 'false') === 'true',
                'invoice_due_date_offset' => (int) SystemSetting::getValue('invoice_due_date_offset', '7'),
            ];

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch invoice generation settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update invoice generation settings
     */
    public function updateInvoiceGenerationSettings(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'invoice_generation_date' => 'required|integer|between:1,31',
            'invoice_generation_enabled' => 'required|boolean',
            'invoice_due_date_offset' => 'nullable|integer|min:1|max:31',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            SystemSetting::setValue('invoice_generation_date', (string) $request->invoice_generation_date);
            SystemSetting::setValue('invoice_generation_enabled', $request->invoice_generation_enabled ? 'true' : 'false');
            
            if ($request->has('invoice_due_date_offset')) {
                SystemSetting::setValue('invoice_due_date_offset', (string) $request->invoice_due_date_offset);
            }

            $settings = [
                'invoice_generation_date' => (int) SystemSetting::getValue('invoice_generation_date', '1'),
                'invoice_generation_enabled' => SystemSetting::getValue('invoice_generation_enabled', 'false') === 'true',
                'invoice_due_date_offset' => (int) SystemSetting::getValue('invoice_due_date_offset', '7'),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Invoice generation settings updated successfully',
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update invoice generation settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}