<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class SmsTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        try {
            $query = SmsTemplate::query();

            // Filter by type
            if ($request->has('type') && $request->type) {
                $query->where('type', $request->type);
            }

            // Filter by active status
            if ($request->has('is_active')) {
                $query->where('is_active', $request->is_active === 'true' || $request->is_active === true);
            }

            $templates = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch templates: ' . $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:rent_reminder,payment_confirmation,lease_expiry,custom',
            'content' => 'required|string|max:1000',
            'variables' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $template = SmsTemplate::create([
                'name' => $request->name,
                'type' => $request->type,
                'content' => $request->content,
                'variables' => $request->variables ?? [],
                'is_active' => $request->is_active ?? true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Template created successfully',
                'data' => [
                    'template' => $template
                ]
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create template: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(string $id): JsonResponse
    {
        try {
            $template = SmsTemplate::findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'template' => $template
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Template not found'
            ], 404);
        }
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:rent_reminder,payment_confirmation,lease_expiry,custom',
            'content' => 'sometimes|string|max:1000',
            'variables' => 'nullable|array',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $template = SmsTemplate::findOrFail($id);
            
            $template->update($request->only([
                'name', 'type', 'content', 'variables', 'is_active'
            ]));

            return response()->json([
                'success' => true,
                'message' => 'Template updated successfully',
                'data' => [
                    'template' => $template
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update template: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(string $id): JsonResponse
    {
        try {
            $template = SmsTemplate::findOrFail($id);
            $template->delete();

            return response()->json([
                'success' => true,
                'message' => 'Template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete template: ' . $e->getMessage()
            ], 500);
        }
    }
}
