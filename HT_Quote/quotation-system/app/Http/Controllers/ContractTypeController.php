<?php

namespace App\Http\Controllers;

use App\Models\ContractType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContractTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ContractType::query();

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

        $contractTypes = $query->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $contractTypes
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:contract_types,name',
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
            $maxSortOrder = ContractType::max('sort_order') ?? 0;
            $request->merge(['sort_order' => $maxSortOrder + 1]);
        }

        $contractType = ContractType::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Contract type created successfully',
            'data' => $contractType
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $contractType = ContractType::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $contractType
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $contractType = ContractType::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255|unique:contract_types,name,' . $id,
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $contractType->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Contract type updated successfully',
            'data' => $contractType
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $contractType = ContractType::findOrFail($id);
        $contractType->delete();

        return response()->json([
            'success' => true,
            'message' => 'Contract type deleted successfully'
        ]);
    }

    public function toggleStatus($id): JsonResponse
    {
        $contractType = ContractType::findOrFail($id);
        $contractType->is_active = !$contractType->is_active;
        $contractType->save();

        return response()->json([
            'success' => true,
            'message' => 'Contract type status updated successfully',
            'data' => $contractType
        ]);
    }

    public function updateSortOrder(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'contract_types' => 'required|array',
            'contract_types.*.id' => 'required|exists:contract_types,id',
            'contract_types.*.sort_order' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        foreach ($request->contract_types as $contractTypeData) {
            ContractType::where('id', $contractTypeData['id'])
                ->update(['sort_order' => $contractTypeData['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Sort order updated successfully'
        ]);
    }

    public function statistics(): JsonResponse
    {
        $total = ContractType::count();
        $active = ContractType::where('is_active', true)->count();
        $inactive = ContractType::where('is_active', false)->count();

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
