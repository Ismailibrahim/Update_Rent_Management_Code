<?php

namespace App\Http\Controllers;

use App\Models\TermsConditionsTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TermsConditionsTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = TermsConditionsTemplate::where('is_active', true);

        // Filter by category type if provided
        if ($request->has('category_type')) {
            $query->where('category_type', $request->category_type);
        }

        $templates = $query->orderBy('category_type')->orderBy('title')->get();

        return response()->json($templates);
    }

    public function getForProducts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.category_type' => 'required|string',
            'products.*.category_id' => 'nullable|integer',
        ]);

        $templates = TermsConditionsTemplate::getTemplatesForProducts($validated['products']);

        return response()->json($templates);
    }
}
