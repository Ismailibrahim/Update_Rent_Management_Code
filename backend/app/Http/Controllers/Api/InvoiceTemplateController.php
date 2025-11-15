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
            // Get all request data
            $requestData = $request->all();
            
            // Log incoming request for debugging
            \Log::info('InvoiceTemplate store request:', [
                'all_data' => $requestData,
                'json_content' => $request->getContent(),
                'has_template_data' => isset($requestData['template_data']),
                'template_data_value' => $requestData['template_data'] ?? 'NOT SET',
                'template_data_type' => isset($requestData['template_data']) ? gettype($requestData['template_data']) : 'NOT SET',
                'all_keys' => array_keys($requestData),
            ]);
            
            // Ensure template_data is always present and is an array
            if (!isset($requestData['template_data']) || $requestData['template_data'] === null) {
                $requestData['template_data'] = [];
            }
            // Convert object to array if needed (JSON objects come as stdClass in PHP)
            if (is_object($requestData['template_data'])) {
                $requestData['template_data'] = json_decode(json_encode($requestData['template_data']), true) ?? [];
            }
            // Ensure it's an array
            if (!is_array($requestData['template_data'])) {
                $requestData['template_data'] = [];
            }
            
            // Set defaults for boolean fields if not provided
            if (!isset($requestData['is_active'])) {
                $requestData['is_active'] = true;
            } else {
                // Convert string booleans to actual booleans
                $requestData['is_active'] = filter_var($requestData['is_active'], FILTER_VALIDATE_BOOLEAN);
            }
            if (!isset($requestData['is_default'])) {
                $requestData['is_default'] = false;
            } else {
                $requestData['is_default'] = filter_var($requestData['is_default'], FILTER_VALIDATE_BOOLEAN);
            }
            
            $validator = Validator::make($requestData, [
                'name' => 'required|string|max:255',
                'description' => 'nullable|string|max:500',
                'type' => 'required|in:rent,maintenance,both',
                'template_data' => 'nullable|array', // Changed to nullable - we provide default below
                'html_content' => 'nullable|string',
                'styles' => 'nullable|array',
                'logo_path' => 'nullable|string',
                'is_active' => 'sometimes|boolean',
                'is_default' => 'sometimes|boolean',
            ]);
            
            // After validation, ensure template_data is set (validation allows null, but we need array)
            if (!isset($requestData['template_data']) || !is_array($requestData['template_data'])) {
                $requestData['template_data'] = [];
            }

            if ($validator->fails()) {
                \Log::error('InvoiceTemplate validation failed:', [
                    'errors' => $validator->errors()->toArray(),
                    'request_data' => $requestData,
                ]);
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $data = $validator->validated();
            
            // Ensure template_data is always an array in the validated data
            // (it might be null from validation, but we need it as an array)
            if (!isset($data['template_data']) || !is_array($data['template_data'])) {
                $data['template_data'] = [];
            }
            // Convert object to array if needed (shouldn't happen after our preprocessing, but just in case)
            if (is_object($data['template_data'])) {
                $data['template_data'] = json_decode(json_encode($data['template_data']), true) ?? [];
            }

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

            // Merge request data with defaults if template_data is being updated
            $requestData = $request->all();
            if (isset($requestData['template_data']) && $requestData['template_data'] === null) {
                $requestData['template_data'] = [];
            }
            
            $validator = Validator::make($requestData, [
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
            
            // Ensure template_data is always an array if provided
            if (isset($data['template_data'])) {
                if (is_object($data['template_data'])) {
                    $data['template_data'] = (array) $data['template_data'];
                }
                if (!is_array($data['template_data'])) {
                    $data['template_data'] = [];
                }
            }

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

