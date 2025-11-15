<?php

namespace App\Http\Controllers;

use App\Models\ServiceTermsTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ServiceTermsController extends Controller
{
    /**
     * Get all active service terms templates
     */
    public function index(): JsonResponse
    {
        try {
            $templates = ServiceTermsTemplate::getActiveTemplates();
            
            return response()->json([
                'success' => true,
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching service terms: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service terms'
            ], 500);
        }
    }

    /**
     * Get a specific service terms template by ID
     */
    public function show($id): JsonResponse
    {
        try {
            $serviceTermsTemplate = ServiceTermsTemplate::findOrFail($id);
            
            return response()->json([
                'success' => true,
                'data' => $serviceTermsTemplate
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching service term: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service term'
            ], 500);
        }
    }

    /**
     * Get default service terms templates
     */
    public function getDefault(): JsonResponse
    {
        try {
            $templates = ServiceTermsTemplate::getDefaultTemplates();
            
            return response()->json([
                'success' => true,
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching default service terms: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch default service terms'
            ], 500);
        }
    }

    /**
     * Get service terms by page number
     */
    public function getByPage($pageNumber): JsonResponse
    {
        try {
            $templates = ServiceTermsTemplate::getTemplatesByPage($pageNumber);
            
            return response()->json([
                'success' => true,
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching service terms by page: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch service terms'
            ], 500);
        }
    }

    /**
     * Store a new service terms template
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'content' => 'required|string',
                'category_type' => 'nullable|string|max:50',
                'page_number' => 'nullable|integer|min:1',
                'display_order' => 'nullable|integer|min:1',
                'is_default' => 'nullable|boolean',
                'is_active' => 'nullable|boolean'
            ]);

            $template = ServiceTermsTemplate::create($validated);

            return response()->json([
                'success' => true,
                'data' => $template,
                'message' => 'Service terms template created successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error creating service terms template: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create service terms template'
            ], 500);
        }
    }

    /**
     * Update a service terms template
     */
    public function update(Request $request, ServiceTermsTemplate $serviceTermsTemplate): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'sometimes|required|string|max:255',
                'content' => 'sometimes|required|string',
                'category_type' => 'nullable|string|max:50',
                'page_number' => 'nullable|integer|min:1',
                'display_order' => 'nullable|integer|min:1',
                'is_default' => 'nullable|boolean',
                'is_active' => 'nullable|boolean'
            ]);

            $serviceTermsTemplate->update($validated);

            return response()->json([
                'success' => true,
                'data' => $serviceTermsTemplate,
                'message' => 'Service terms template updated successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error updating service terms template: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update service terms template'
            ], 500);
        }
    }

    /**
     * Delete a service terms template
     */
    public function destroy(ServiceTermsTemplate $serviceTermsTemplate): JsonResponse
    {
        try {
            $serviceTermsTemplate->delete();

            return response()->json([
                'success' => true,
                'message' => 'Service terms template deleted successfully'
            ]);
        } catch (\Exception $e) {
            \Log::error('Error deleting service terms template: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete service terms template'
            ], 500);
        }
    }
}