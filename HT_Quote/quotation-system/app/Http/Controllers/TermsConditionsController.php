<?php

namespace App\Http\Controllers;

use App\Models\TermsConditionsTemplate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TermsConditionsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TermsConditionsTemplate::query();

        // Search functionality
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('content', 'like', "%{$search}%")
                  ->orWhere('category_type', 'like', "%{$search}%");
            });
        }

        // Filter by category type
        if ($request->has('category_type')) {
            $query->where('category_type', $request->category_type);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $templates = $query->orderBy('category_type')
                          ->orderBy('title')
                          ->paginate(15);

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'category_type' => 'required|string|in:general,hardware,service,amc',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'display_in_quotation' => 'boolean'
        ]);

        // If this is being set as default, remove default from others of same category
        if ($validated['is_default'] ?? false) {
            TermsConditionsTemplate::where('category_type', $validated['category_type'])
                ->where('is_default', true)
                ->update(['is_default' => false]);
        }

        $template = TermsConditionsTemplate::create($validated);

        return response()->json([
            'message' => 'Terms & Conditions template created successfully',
            'data' => $template
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $template = TermsConditionsTemplate::findOrFail($id);
        return response()->json($template);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $template = TermsConditionsTemplate::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'sometimes|required|string',
            'category_type' => 'sometimes|required|string|in:general,hardware,service,amc',
            'is_default' => 'boolean',
            'is_active' => 'boolean',
            'display_in_quotation' => 'boolean'
        ]);

        // If this is being set as default, remove default from others of same category
        if (isset($validated['is_default']) && $validated['is_default']) {
            TermsConditionsTemplate::where('category_type', $validated['category_type'] ?? $template->category_type)
                ->where('is_default', true)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

        $template->update($validated);

        return response()->json([
            'message' => 'Terms & Conditions template updated successfully',
            'data' => $template
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $template = TermsConditionsTemplate::findOrFail($id);
        
        // Don't allow deletion of default templates
        if ($template->is_default) {
            return response()->json([
                'message' => 'Cannot delete default template. Set another template as default first.'
            ], 422);
        }

        $template->delete();

        return response()->json([
            'message' => 'Terms & Conditions template deleted successfully'
        ]);
    }

    public function setDefault($id): JsonResponse
    {
        $template = TermsConditionsTemplate::findOrFail($id);

        // Remove default from others of same category
        TermsConditionsTemplate::where('category_type', $template->category_type)
            ->where('is_default', true)
            ->update(['is_default' => false]);

        // Set this as default
        $template->update(['is_default' => true]);

        return response()->json([
            'message' => 'Default template updated successfully',
            'data' => $template
        ]);
    }

    public function getByCategory($categoryType): JsonResponse
    {
        $templates = TermsConditionsTemplate::where('category_type', $categoryType)
            ->where('is_active', true)
            ->orderBy('is_default', 'desc')
            ->orderBy('title')
            ->get();

        return response()->json($templates);
    }

    public function getSparePartsTemplate(): JsonResponse
    {
        $template = TermsConditionsTemplate::where('title', 'Spare Parts Quote Terms')
            ->where('is_active', true)
            ->first();

        if (!$template) {
            return response()->json(['error' => 'Spare Parts template not found'], 404);
        }

        return response()->json($template);
    }
}

