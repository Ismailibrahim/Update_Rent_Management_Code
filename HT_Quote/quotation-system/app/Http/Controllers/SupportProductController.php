<?php

namespace App\Http\Controllers;

use App\Models\SupportProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupportProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = SupportProduct::query();

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'active') {
                $query->where('is_active', true);
            } elseif ($request->status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Search
        if ($request->has('search') && $request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $products = $query->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:support_products,name',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Auto-increment sort_order if not provided
        if (!$request->has('sort_order')) {
            $maxSortOrder = SupportProduct::max('sort_order') ?? 0;
            $request->merge(['sort_order' => $maxSortOrder + 1]);
        }

        $product = SupportProduct::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Support product created successfully',
            'data' => $product
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $product = SupportProduct::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $product
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $product = SupportProduct::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:support_products,name,' . $id,
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $product->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Support product updated successfully',
            'data' => $product
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $product = SupportProduct::findOrFail($id);
        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Support product deleted successfully'
        ]);
    }

    public function toggleStatus($id): JsonResponse
    {
        $product = SupportProduct::findOrFail($id);
        $product->is_active = !$product->is_active;
        $product->save();

        return response()->json([
            'success' => true,
            'message' => 'Support product status updated successfully',
            'data' => $product
        ]);
    }

    public function updateSortOrder(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'products' => 'required|array',
            'products.*.id' => 'required|exists:support_products,id',
            'products.*.sort_order' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        foreach ($request->products as $productData) {
            SupportProduct::where('id', $productData['id'])
                ->update(['sort_order' => $productData['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sort order updated successfully'
        ]);
    }

    public function statistics(): JsonResponse
    {
        $total = SupportProduct::count();
        $active = SupportProduct::where('is_active', true)->count();
        $inactive = SupportProduct::where('is_active', false)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'active' => $active,
                'inactive' => $inactive,
            ]
        ]);
    }
}
