<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceInvoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MaintenanceInvoiceController extends Controller
{
    /**
     * Display a listing of maintenance invoices
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = MaintenanceInvoice::with(['tenant', 'property', 'rentalUnit', 'rentalUnitAsset.asset', 'maintenanceCost']);

            // Apply filters if provided
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('invoice_number', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('tenant', function($tenantQuery) use ($search) {
                          $tenantQuery->where('first_name', 'like', "%{$search}%")
                                     ->orWhere('last_name', 'like', "%{$search}%")
                                     ->orWhere('company_name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('property', function($propertyQuery) use ($search) {
                          $propertyQuery->where('name', 'like', "%{$search}%");
                      });
                });
            }

            if ($request->has('status')) {
                $status = $request->get('status');
                if (strpos($status, ',') !== false) {
                    // Handle comma-separated statuses
                    $statuses = array_map('trim', explode(',', $status));
                    $query->whereIn('status', $statuses);
                } else {
                    $query->where('status', $status);
                }
            }

            if ($request->has('tenant_id')) {
                $query->where('tenant_id', $request->get('tenant_id'));
            }

            if ($request->has('rental_unit_id')) {
                $query->where('rental_unit_id', $request->get('rental_unit_id'));
            }

            $maintenanceInvoices = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'maintenance_invoices' => $maintenanceInvoices
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified maintenance invoice
     */
    public function show(MaintenanceInvoice $maintenanceInvoice): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'maintenance_invoice' => $maintenanceInvoice->load(['tenant', 'property', 'rentalUnit', 'rentalUnitAsset.asset', 'maintenanceCost'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified maintenance invoice
     */
    public function update(Request $request, MaintenanceInvoice $maintenanceInvoice): JsonResponse
    {
        try {
            $maintenanceInvoice->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Maintenance invoice updated successfully',
                'maintenance_invoice' => $maintenanceInvoice->load(['tenant', 'property', 'rentalUnit', 'rentalUnitAsset.asset', 'maintenanceCost'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update maintenance invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified maintenance invoice
     */
    public function destroy(MaintenanceInvoice $maintenanceInvoice): JsonResponse
    {
        try {
            $maintenanceInvoice->delete();

            return response()->json([
                'success' => true,
                'message' => 'Maintenance invoice deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete maintenance invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
