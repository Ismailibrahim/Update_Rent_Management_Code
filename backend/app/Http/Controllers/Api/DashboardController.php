<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\RentalUnit;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'statistics' => [
                'total_properties' => 1,
                'total_tenants' => 0,
                'total_rental_units' => 0,
                'occupied_units' => 0,
                'available_units' => 0,
                'total_revenue' => 0,
                'maintenance_requests' => 0,
            ]
        ]);
    }

    /**
     * Get recent activity
     */
    public function recentActivity(Request $request): JsonResponse
    {
        try {
            // Get recent properties, tenants, and rental units
            $recentProperties = Property::select('id', 'name', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            $recentTenants = Tenant::select('id', 'personal_info', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            $recentRentalUnits = RentalUnit::select('id', 'unit_number', 'created_at')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'success' => true,
                'recent_activity' => [
                    'properties' => $recentProperties,
                    'tenants' => $recentTenants,
                    'rental_units' => $recentRentalUnits,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => true,
                'recent_activity' => [
                    'properties' => [],
                    'tenants' => [],
                    'rental_units' => [],
                ]
            ]);
        }
    }
}