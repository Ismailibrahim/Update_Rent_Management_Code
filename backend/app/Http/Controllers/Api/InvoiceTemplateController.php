<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InvoiceTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class InvoiceTemplateController extends Controller
{
    /**
     * Display a listing of invoice templates
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = InvoiceTemplate::query();

            // Filter by type
            if ($request->has('type') && $request->type) {
                if ($request->type === 'both') {
                    $query->whereIn('type', ['rent', 'maintenance', 'both']);
                } else {
                    $query->where(function($q) use ($request) {
                        $q->where('type', $request->type)
                          ->orWhere('type', 'both');
                    });
                }
            }

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }

            $templates = $query->orderBy('is_default', 'desc')
                              ->orderBy('name')
                              ->get();

            return response()->json([
                'templates' => $templates
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch invoice templates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created invoice template
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:500',
                'type' => 'required|in:rent,maintenance,both',
                'template_data' => 'required|array',
                'html_content' => 'nullable|string',
                'styles' => 'nullable|array',
                'logo_path' => 'nullable|string',
                'is_active' => 'boolean',
                'is_default' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // If setting as default, unset other defaults of the same type
            if (isset($data['is_default']) && $data['is_default']) {
                InvoiceTemplate::where('type', $data['type'])
                    ->update(['is_default' => false]);
            }

            $template = InvoiceTemplate::create($data);

            return response()->json([
                'message' => 'Invoice template created successfully',
                'template' => $template
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create invoice template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice template
     */
    public function show($id): JsonResponse
    {
        try {
            $template = InvoiceTemplate::findOrFail($id);

            return response()->json([
                'template' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Invoice template not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified invoice template
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $template = InvoiceTemplate::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|required|string|max:255',
                'description' => 'nullable|string|max:500',
                'type' => 'sometimes|required|in:rent,maintenance,both',
                'template_data' => 'sometimes|required|array',
                'html_content' => 'nullable|string',
                'styles' => 'nullable|array',
                'logo_path' => 'nullable|string',
                'is_active' => 'boolean',
                'is_default' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();

            // If setting as default, unset other defaults of the same type
            if (isset($data['is_default']) && $data['is_default']) {
                InvoiceTemplate::where('type', $data['type'] ?? $template->type)
                    ->where('id', '!=', $id)
                    ->update(['is_default' => false]);
            }

            $template->update($data);

            return response()->json([
                'message' => 'Invoice template updated successfully',
                'template' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update invoice template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified invoice template
     */
    public function destroy($id): JsonResponse
    {
        try {
            $template = InvoiceTemplate::findOrFail($id);
            
            // Don't allow deletion of default template
            if ($template->is_default) {
                return response()->json([
                    'message' => 'Cannot delete default template. Please set another template as default first.'
                ], 422);
            }

            // Delete logo if exists
            if ($template->logo_path && Storage::exists($template->logo_path)) {
                Storage::delete($template->logo_path);
            }

            $template->delete();

            return response()->json([
                'message' => 'Invoice template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete invoice template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Set template as default
     */
    public function setDefault($id): JsonResponse
    {
        try {
            $template = InvoiceTemplate::findOrFail($id);
            $template->setAsDefault();

            return response()->json([
                'message' => 'Template set as default successfully',
                'template' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to set default template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate a template
     */
    public function duplicate($id): JsonResponse
    {
        try {
            $original = InvoiceTemplate::findOrFail($id);
            
            $newTemplate = $original->replicate();
            $newTemplate->name = $original->name . ' (Copy)';
            $newTemplate->is_default = false;
            $newTemplate->save();

            return response()->json([
                'message' => 'Template duplicated successfully',
                'template' => $newTemplate
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to duplicate template',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

