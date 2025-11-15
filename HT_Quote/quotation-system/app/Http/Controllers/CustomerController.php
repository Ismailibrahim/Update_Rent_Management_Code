<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('customers.view')) {
            return response()->json(['message' => 'You do not have permission to view customers'], 403);
        }

        try {
            // Check if we need to include contacts
            $includeContacts = $request->boolean('include_contacts', false);
            
            // Build query
            $query = Customer::select(['id', 'resort_code', 'resort_name', 'holding_company', 'address', 'country', 'tax_number', 'payment_terms', 'created_by', 'created_at', 'updated_at']);
            
            // Eager load creator relationship if it exists
            try {
                $query->with(['creator:id,name,email']);
            } catch (\Exception $e) {
                // If creator relationship fails, continue without it
                \Log::warning('Could not load creator relationship: ' . $e->getMessage());
            }
            
            if ($includeContacts) {
                try {
                    $query->with([
                        'contacts' => function($query) {
                            $query->select(['id', 'customer_id', 'contact_person', 'designation', 'email', 'phone', 'mobile', 'is_primary', 'contact_type'])
                                  ->orderBy('is_primary', 'desc')
                                  ->orderBy('contact_type');
                        }
                    ]);
                } catch (\Exception $e) {
                    // If contacts relationship fails, continue without it
                    \Log::warning('Could not load contacts relationship: ' . $e->getMessage());
                }
            }
            
            // Only cache non-search queries, and handle cache failures gracefully
            if (!$request->has('search')) {
                try {
                    $cacheKey = $includeContacts ? 'customers_all_with_contacts' : 'customers_all';
                    $customers = Cache::remember($cacheKey, 300, function () use ($query) {
                        return $query->orderBy('resort_name')->get();
                    });
                } catch (\Exception $cacheError) {
                    // If cache fails, fetch directly from database
                    \Log::warning('Cache failed, fetching directly from database: ' . $cacheError->getMessage());
                    $customers = $query->orderBy('resort_name')->get();
                }
            } else {
                // For search queries, use the same query builder
                $search = $request->search;
                
                $customers = $query->where(function($q) use ($search, $includeContacts) {
                        $q->where('resort_code', 'like', "%{$search}%")
                          ->orWhere('resort_name', 'like', "%{$search}%")
                          ->orWhere('holding_company', 'like', "%{$search}%")
                          ->orWhere('address', 'like', "%{$search}%")
                          ->orWhere('country', 'like', "%{$search}%");
                        
                        if ($includeContacts) {
                            $q->orWhereHas('contacts', function($contactQuery) use ($search) {
                                $contactQuery->where('contact_person', 'like', "%{$search}%")
                                           ->orWhere('email', 'like', "%{$search}%");
                            });
                        }
                    })
                    ->orderBy('resort_name')
                    ->get();
            }

            return response()->json(['data' => $customers]);
        } catch (\Exception $e) {
            \Log::error('Error fetching customers: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            // Return more detailed error in development
            $errorMessage = app()->environment('production') 
                ? 'Failed to fetch customers' 
                : 'Failed to fetch customers: ' . $e->getMessage();
            
            return response()->json([
                'message' => $errorMessage,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('customers.create')) {
            return response()->json(['message' => 'You do not have permission to create customers'], 403);
        }

        $validated = $request->validate([
            'resort_code' => 'nullable|string|max:50|unique:customers,resort_code',
            'resort_name' => 'required|string|max:255',
            'holding_company' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:100',
        ]);

        // Set the created_by field to the authenticated user's ID
        $validated['created_by'] = auth()->id();

        $customer = Customer::create($validated);

        // Clear customer cache
        Cache::forget('customers_all');

        return response()->json($customer, 201);
    }

    public function show(Request $request, Customer $customer): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('customers.view')) {
            return response()->json(['message' => 'You do not have permission to view customers'], 403);
        }

        $customer->load(['quotations' => function($query) {
            $query->orderBy('created_at', 'desc')->take(5);
        }]);

        return response()->json($customer);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('customers.edit')) {
            return response()->json(['message' => 'You do not have permission to edit customers'], 403);
        }

        $validated = $request->validate([
            'resort_code' => 'nullable|string|max:50|unique:customers,resort_code,' . $customer->id,
            'resort_name' => 'string|max:255',
            'holding_company' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'country' => 'nullable|string|max:100',
            'tax_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:100',
        ]);

        $customer->update($validated);

        // Clear customer cache
        Cache::forget('customers_all');

        return response()->json($customer);
    }

    public function destroy(Request $request, Customer $customer): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('customers.delete')) {
            return response()->json(['message' => 'You do not have permission to delete customers'], 403);
        }

        if ($customer->quotations()->exists()) {
            return response()->json([
                'message' => 'Cannot delete customer with existing quotations'
            ], 400);
        }

        $customer->delete();

        // Clear customer cache
        Cache::forget('customers_all');

        return response()->json(['message' => 'Customer deleted successfully']);
    }

    public function bulkImport(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customers' => 'required|array',
            'customers.*.resort_name' => 'required|string|max:255',
            'customers.*.resort_code' => 'nullable|string|max:50',
            'customers.*.holding_company' => 'nullable|string|max:255',
            'customers.*.address' => 'nullable|string',
            'customers.*.country' => 'nullable|string|max:100',
            'customers.*.tax_number' => 'nullable|string|max:100',
            'customers.*.payment_terms' => 'nullable|string|max:100',
        ]);

        $importedCustomers = [];
        $errors = [];

        foreach ($validated['customers'] as $index => $customerData) {
            try {
                // Check for duplicates by resort name
                $existing = Customer::where('resort_name', $customerData['resort_name'])->first();

                if ($existing) {
                    $errors[] = [
                        'row' => $index + 1,
                        'resort_name' => $customerData['resort_name'],
                        'error' => 'Resort with this name already exists'
                    ];
                    continue;
                }

                // Add created_by field
                $customerData['created_by'] = auth()->id();

                $customer = Customer::create($customerData);
                $importedCustomers[] = $customer;
            } catch (\Exception $e) {
                $errors[] = [
                    'row' => $index + 1,
                    'resort_name' => $customerData['resort_name'] ?? 'N/A',
                    'error' => $e->getMessage()
                ];
            }
        }

        // Clear customer cache
        Cache::forget('customers_all');
        Cache::forget('customers_all_with_contacts');

        return response()->json([
            'success' => count($importedCustomers),
            'errors' => $errors
        ]);
    }
}