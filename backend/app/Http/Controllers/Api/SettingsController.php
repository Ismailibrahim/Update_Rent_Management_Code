<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

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
}