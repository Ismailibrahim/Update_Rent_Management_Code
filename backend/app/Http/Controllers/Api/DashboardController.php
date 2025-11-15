<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Tenant;
use App\Models\RentalUnit;
use App\Models\Payment;
use App\Models\MaintenanceRequest;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        // Cache statistics for 5 minutes to improve performance
        $cacheKey = 'dashboard_statistics_' . ($request->user()?->id ?? 'guest');
        
        $statistics = Cache::remember($cacheKey, 300, function () use ($request) {
            $user = $request->user();
            
            // Build base queries with role-based filtering
            $propertiesQuery = Property::query();
            $rentalUnitsQuery = RentalUnit::query();
            $tenantsQuery = Tenant::query();
            
            // Filter by property manager if applicable - cache propertyIds to avoid redundant queries
            $propertyIds = null;
            $rentalUnitIds = null;
            
            if ($user && $user->role && $user->role->name === 'property_manager') {
                // Execute property query once and reuse results
                $propertyIds = Property::where('assigned_manager_id', $user->id)->pluck('id');
                
                $propertiesQuery->where('assigned_manager_id', $user->id);
                $rentalUnitsQuery->whereIn('property_id', $propertyIds);
                $tenantIds = $rentalUnitsQuery->whereNotNull('tenant_id')->pluck('tenant_id');
                $tenantsQuery->whereIn('id', $tenantIds);
                
                // Cache rental unit IDs for later use
                $rentalUnitIds = RentalUnit::whereIn('property_id', $propertyIds)->pluck('id');
            }
            
            // Get counts efficiently using single queries
            $totalProperties = $propertiesQuery->count();
            $totalTenants = $tenantsQuery->count();
            $totalRentalUnits = $rentalUnitsQuery->count();
            
            // Get occupancy stats in a single query
            $occupancyStats = $rentalUnitsQuery
                ->selectRaw('
                    COUNT(*) as total,
                    SUM(CASE WHEN status = "occupied" THEN 1 ELSE 0 END) as occupied,
                    SUM(CASE WHEN status = "available" THEN 1 ELSE 0 END) as available
                ')
                ->first();
            
            $occupiedUnits = $occupancyStats->occupied ?? 0;
            $availableUnits = $occupancyStats->available ?? 0;
            
            // Calculate revenue efficiently - reuse rentalUnitIds if available
            $revenueQuery = Payment::query();
            if ($rentalUnitIds !== null) {
                $revenueQuery->whereIn('rental_unit_id', $rentalUnitIds);
            }
            
            $totalRevenue = $revenueQuery->sum('amount') ?? 0;
            
            // Get maintenance requests count - reuse propertyIds if available
            $maintenanceQuery = MaintenanceRequest::query();
            if ($propertyIds !== null) {
                $maintenanceQuery->whereIn('property_id', $propertyIds);
            }
            $maintenanceRequests = $maintenanceQuery->count();
            
            return [
                'total_properties' => $totalProperties,
                'total_tenants' => $totalTenants,
                'total_rental_units' => $totalRentalUnits,
                'occupied_units' => $occupiedUnits,
                'available_units' => $availableUnits,
                'total_revenue' => $totalRevenue,
                'maintenance_requests' => $maintenanceRequests,
            ];
        });
        
        return response()->json([
            'success' => true,
            'statistics' => $statistics
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