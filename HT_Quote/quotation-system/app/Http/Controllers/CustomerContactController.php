<?php

namespace App\Http\Controllers;

use App\Models\CustomerContact;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomerContactController extends Controller
{
    /**
     * Display a listing of all contacts.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $contacts = CustomerContact::with(['customer:id,resort_name,resort_code', 'creator:id,name,email'])
                ->orderBy('is_primary', 'desc')
                ->orderBy('contact_type')
                ->orderBy('contact_person')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $contacts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contacts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of contacts for a specific customer.
     */
    public function getByCustomer(Request $request, $customerId): JsonResponse
    {
        try {
            $contacts = CustomerContact::where('customer_id', $customerId)
                ->with('creator:id,name,email')
                ->orderBy('is_primary', 'desc')
                ->orderBy('contact_type')
                ->orderBy('contact_person')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $contacts
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch customer contacts',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created contact.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'contact_person' => 'required|string|max:255',
            'designation' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'mobile' => 'nullable|string|max:50',
            'is_primary' => 'boolean',
            'contact_type' => 'nullable|in:primary,billing,technical,manager,operations,other',
            'notes' => 'nullable|string'
        ]);

        try {
            // If this is being set as primary, unset other primary contacts for this customer
            if ($validated['is_primary'] ?? false) {
                CustomerContact::where('customer_id', $validated['customer_id'])
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            $validated['created_by'] = auth()->id();
            $contact = CustomerContact::create($validated);

            return response()->json([
                'success' => true,
                'message' => 'Contact created successfully',
                'data' => $contact->load('creator:id,name,email')
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create contact',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified contact.
     */
    public function show(CustomerContact $customerContact): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $customerContact->load('creator:id,name,email')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contact',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified contact.
     */
    public function update(Request $request, CustomerContact $customerContact): JsonResponse
    {
        $validated = $request->validate([
            'contact_person' => 'required|string|max:255',
            'designation' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'mobile' => 'nullable|string|max:50',
            'is_primary' => 'boolean',
            'contact_type' => 'nullable|in:primary,billing,technical,manager,operations,other',
            'notes' => 'nullable|string'
        ]);

        try {
            // If this is being set as primary, unset other primary contacts for this customer
            if ($validated['is_primary'] ?? false) {
                CustomerContact::where('customer_id', $customerContact->customer_id)
                    ->where('id', '!=', $customerContact->id)
                    ->where('is_primary', true)
                    ->update(['is_primary' => false]);
            }

            $customerContact->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Contact updated successfully',
                'data' => $customerContact->load('creator:id,name,email')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update contact',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified contact.
     */
    public function destroy(CustomerContact $customerContact): JsonResponse
    {
        try {
            // Don't allow deletion of the last primary contact
            $primaryContactsCount = CustomerContact::where('customer_id', $customerContact->customer_id)
                ->where('is_primary', true)
                ->count();

            if ($customerContact->is_primary && $primaryContactsCount <= 1) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete the last primary contact. Please set another contact as primary first.'
                ], 400);
            }

            $customerContact->delete();

            return response()->json([
                'success' => true,
                'message' => 'Contact deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete contact',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set a contact as primary for a customer.
     */
    public function setPrimary(CustomerContact $customerContact): JsonResponse
    {
        try {
            // Unset other primary contacts for this customer
            CustomerContact::where('customer_id', $customerContact->customer_id)
                ->where('id', '!=', $customerContact->id)
                ->update(['is_primary' => false]);

            // Set this contact as primary
            $customerContact->update(['is_primary' => true]);

            return response()->json([
                'success' => true,
                'message' => 'Contact set as primary successfully',
                'data' => $customerContact
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to set primary contact',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
