<?php

namespace App\Http\Controllers;

use App\Models\ContactType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ContactTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $contactTypes = ContactType::ordered()->get();
            return response()->json([
                'success' => true,
                'data' => $contactTypes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contact types',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:contact_types,name',
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $contactType = ContactType::create($validated);
            return response()->json([
                'success' => true,
                'message' => 'Contact type created successfully',
                'data' => $contactType
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create contact type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(ContactType $contactType): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $contactType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch contact type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, ContactType $contactType): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:contact_types,name,' . $contactType->id,
            'description' => 'nullable|string|max:500',
            'color' => 'nullable|string|max:7|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $contactType->update($validated);
            return response()->json([
                'success' => true,
                'message' => 'Contact type updated successfully',
                'data' => $contactType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update contact type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(ContactType $contactType): JsonResponse
    {
        try {
            // Check if contact type is being used
            $usageCount = \App\Models\CustomerContact::where('contact_type', $contactType->name)->count();
            
            if ($usageCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete contact type. It is being used by {$usageCount} contact(s)."
                ], 400);
            }

            $contactType->delete();
            return response()->json([
                'success' => true,
                'message' => 'Contact type deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete contact type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
