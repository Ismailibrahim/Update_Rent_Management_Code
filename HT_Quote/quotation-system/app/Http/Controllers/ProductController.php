<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\AmcDescription;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('products.view')) {
            return response()->json(['message' => 'You do not have permission to view products'], 403);
        }

        try {
            $products = Product::with(['category', 'amcDescription'])
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();

            // Add computed fields manually
            $products->each(function($product) {
                $product->man_day_rate = $product->total_man_days && $product->unit_price ? 
                    $product->unit_price / $product->total_man_days : 0;
                $product->is_service_product = $product->category?->category_type === 'services' || $product->is_man_day_based;
            });

            return response()->json(['data' => $products]);
        } catch (\Exception $e) {
            \Log::error('Error in ProductController index: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch products',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('products.create')) {
            return response()->json(['message' => 'You do not have permission to create products'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|unique:products,sku',
            'category_id' => 'required|exists:product_categories,id',
            'unit_price' => 'required|numeric|min:0',
            'landed_cost' => 'nullable|numeric|min:0',
            'total_man_days' => 'nullable|numeric|min:0',
            'currency' => 'string|size:3',
            'is_man_day_based' => 'boolean',
            'has_amc_option' => 'boolean',
            'amc_unit_price' => 'nullable|numeric|min:0',
            'amc_description_id' => 'nullable|exists:amc_descriptions,id',
            'brand' => 'nullable|string|max:100',
            'is_discountable' => 'boolean',
            'is_refurbished' => 'boolean',
            'is_active' => 'boolean',
            'model' => 'nullable|string|max:100',
            'part_number' => 'nullable|string|max:100',
            'tax_rate' => 'numeric|min:0|max:100',
            'sort_order' => 'nullable|integer|min:0',
            'pricing_model' => 'nullable|string|in:one_time,per_day,per_month,per_year,recurring',
        ]);

        $product = Product::create($validated);
        $product->load(['category', 'amcDescription']);

        return response()->json($product, 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('products.view')) {
            return response()->json(['message' => 'You do not have permission to view products'], 403);
        }

        $product->load(['category', 'amcDescription', 'serviceTasks' => function($query) {
            $query->where('is_active', true)->orderBy('sequence_order');
        }]);

        return response()->json([
            'id' => $product->id,
            'name' => $product->name,
            'description' => $product->description,
            'sku' => $product->sku,
            'category_id' => $product->category_id,
            'unit_price' => $product->unit_price,
            'landed_cost' => $product->landed_cost,
            'total_man_days' => $product->total_man_days,
            'currency' => $product->currency,
            'is_man_day_based' => $product->is_man_day_based,
            'has_amc_option' => $product->has_amc_option,
            'amc_unit_price' => $product->amc_unit_price,
            'amc_description_id' => $product->amc_description_id,
            'brand' => $product->brand,
            'model' => $product->model,
            'part_number' => $product->part_number,
            'tax_rate' => $product->tax_rate,
            'is_discountable' => $product->is_discountable,
            'is_refurbished' => $product->is_refurbished,
            'is_active' => $product->is_active,
            'sort_order' => $product->sort_order,
            'pricing_model' => $product->pricing_model,
            'created_by' => $product->created_by,
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
            'category' => $product->category,
            'amc_description' => $product->amc_description,
            'is_service_product' => $product->isServiceProduct(),
            'man_day_rate' => $product->man_day_rate,
            'has_service_tasks' => $product->has_service_tasks,
            'service_tasks' => $product->serviceTasks->map(function($task) {
                return [
                    'id' => $task->id,
                    'task_description' => $task->task_description,
                    'estimated_man_days' => $task->estimated_man_days,
                    'sequence_order' => $task->sequence_order
                ];
            })
        ]);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('products.edit')) {
            return response()->json(['message' => 'You do not have permission to edit products'], 403);
        }

        \Log::info('Product Update Request', [
            'product_id' => $product->id,
            'request_data' => $request->all(),
            'total_man_days' => $request->input('total_man_days')
        ]);

        $validated = $request->validate([
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'sku' => 'nullable|string|unique:products,sku,' . $product->id,
            'category_id' => 'exists:product_categories,id',
            'unit_price' => 'numeric|min:0',
            'landed_cost' => 'nullable|numeric|min:0',
            'total_man_days' => 'nullable|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'is_man_day_based' => 'boolean',
            'has_amc_option' => 'boolean',
            'amc_unit_price' => 'nullable|numeric|min:0',
            'amc_description_id' => 'nullable|exists:amc_descriptions,id',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'part_number' => 'nullable|string|max:100',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'is_discountable' => 'boolean',
            'is_refurbished' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        \Log::info('Validated Data', ['validated' => $validated]);

        $product->update($validated);
        $product->load(['category', 'amcDescription']);

        \Log::info('Product After Update', [
            'id' => $product->id,
            'total_man_days' => $product->total_man_days
        ]);

        return response()->json($product);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('products.delete')) {
            return response()->json(['message' => 'You do not have permission to delete products'], 403);
        }

        $product->update(['is_active' => false]);
        return response()->json(['message' => 'Product deactivated successfully']);
    }

    public function getAmcDescriptions(Request $request): JsonResponse
    {
        $query = AmcDescription::where('is_active', true);

        if ($request->has('product_type')) {
            $query->where('product_type', $request->product_type);
        }

        $descriptions = $query->orderBy('is_default', 'desc')
                             ->orderBy('description')
                             ->get();

        return response()->json($descriptions);
    }
}