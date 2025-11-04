<?php

namespace App\Http\Controllers;

use App\Models\ExpenseCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ExpenseCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = ExpenseCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories',
            'description' => 'nullable|string',
            'allows_item_override' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $category = ExpenseCategory::create($validated);

        return response()->json($category, 201);
    }

    public function show(ExpenseCategory $expenseCategory): JsonResponse
    {
        return response()->json($expenseCategory);
    }

    public function update(Request $request, ExpenseCategory $expenseCategory): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:expense_categories,name,' . $expenseCategory->id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'allows_item_override' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $expenseCategory->update($validated);

        return response()->json($expenseCategory);
    }

    public function destroy(ExpenseCategory $expenseCategory): JsonResponse
    {
        // Check if category is being used
        if ($expenseCategory->sharedCosts()->exists()) {
            return response()->json([
                'message' => 'Cannot delete category that is being used in shipments'
            ], 422);
        }

        $expenseCategory->delete();

        return response()->json(['message' => 'Expense category deleted successfully']);
    }
}