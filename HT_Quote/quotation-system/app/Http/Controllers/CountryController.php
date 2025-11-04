<?php

namespace App\Http\Controllers;

use App\Models\Country;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CountryController extends Controller
{
    /**
     * Display a listing of countries.
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $cacheKey = 'countries_all';
            $countries = Cache::remember($cacheKey, 300, function () {
                return Country::active()->ordered()->get();
            });

            return response()->json([
                'success' => true,
                'data' => $countries
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching countries: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch countries',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created country.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:countries,name',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $country = Country::create($validated);

            // Clear countries cache
            Cache::forget('countries_all');

            return response()->json([
                'success' => true,
                'message' => 'Country created successfully',
                'data' => $country
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Error creating country: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create country',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified country.
     */
    public function show(Country $country): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $country
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch country',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified country.
     */
    public function update(Request $request, Country $country): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:countries,name,' . $country->id,
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $country->update($validated);

            // Clear countries cache
            Cache::forget('countries_all');

            return response()->json([
                'success' => true,
                'message' => 'Country updated successfully',
                'data' => $country
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating country: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update country',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified country.
     */
    public function destroy(Country $country): JsonResponse
    {
        try {
            // Check if country is being used by customers
            $customerCount = $country->customers()->count();
            if ($customerCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete country. It is being used by {$customerCount} customer(s)."
                ], 400);
            }

            $country->delete();

            // Clear countries cache
            Cache::forget('countries_all');

            return response()->json([
                'success' => true,
                'message' => 'Country deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error deleting country: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete country',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle country active status.
     */
    public function toggleStatus(Country $country): JsonResponse
    {
        try {
            $country->update(['is_active' => !$country->is_active]);

            // Clear countries cache
            Cache::forget('countries_all');

            return response()->json([
                'success' => true,
                'message' => 'Country status updated successfully',
                'data' => $country
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update country status',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
