<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Temporarily disable caching to debug the issue
        $query = ProductCategory::with(['parent:id,name', 'children:id,name,parent_id'])
            ->where('is_active', true)
            ->withCount('products');

        if ($request->has('category_type')) {
            $query->where('category_type', $request->category_type);
        }

        if ($request->has('parent_only')) {
            $query->whereNull('parent_id');
        }

        $categories = $query->orderBy('category_type')->orderBy('name')->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:product_categories,id',
            'category_type' => 'required|in:services,hardware,software,spare_parts',
            'description' => 'nullable|string',
        ]);

        $category = ProductCategory::create($validated);
        $category->load(['parent', 'children']);

        // Clear category cache
        Cache::flush();

        return response()->json($category, 201);
    }

    public function show(ProductCategory $category): JsonResponse
    {
        $category->load(['parent', 'children', 'products']);
        return response()->json($category);
    }

    public function update(Request $request, ProductCategory $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'parent_id' => 'nullable|exists:product_categories,id',
            'category_type' => 'in:services,hardware,software,spare_parts',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $category->update($validated);
        $category->load(['parent', 'children']);

        // Clear category cache
        Cache::flush();

        return response()->json($category);
    }

    public function destroy(ProductCategory $category): JsonResponse
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category with existing products'
            ], 400);
        }

        if ($category->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category with subcategories'
            ], 400);
        }

        $category->delete();

        // Clear category cache
        Cache::flush();

        return response()->json(['message' => 'Category deleted successfully']);
    }

    // Additional endpoints for enhanced functionality
    public function getTree(): JsonResponse
    {
        $tree = ProductCategory::getTree();
        return response()->json($tree);
    }

    public function getSelectOptions(Request $request): JsonResponse
    {
        $excludeId = $request->query('exclude_id');
        $options = ProductCategory::getSelectOptions($excludeId);
        return response()->json($options);
    }

    public function getParents(Request $request): JsonResponse
    {
        $categoryType = $request->query('category_type');
        $query = ProductCategory::whereNull('parent_id')->where('is_active', true);

        if ($categoryType) {
            $query->where('category_type', $categoryType);
        }

        $parents = $query->orderBy('category_type')->orderBy('name')->get();
        return response()->json($parents);
    }

    public function getChildren(ProductCategory $category): JsonResponse
    {
        $children = $category->children()->where('is_active', true)->orderBy('name')->get();
        return response()->json($children);
    }

    public function getDescendants(ProductCategory $category): JsonResponse
    {
        $descendants = $category->getAllDescendants();
        return response()->json($descendants);
    }
}