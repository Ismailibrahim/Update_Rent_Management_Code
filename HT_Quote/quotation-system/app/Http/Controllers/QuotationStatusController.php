<?php

namespace App\Http\Controllers;

use App\Models\QuotationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class QuotationStatusController extends Controller
{
    public function index(): JsonResponse
    {
        $statuses = QuotationStatus::ordered()->get();
        return response()->json($statuses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status_name' => 'required|string|max:100|unique:quotation_statuses,status_name',
            'status_key' => 'required|string|max:50|unique:quotation_statuses,status_key',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean'
        ]);

        $status = QuotationStatus::create($validated);

        return response()->json($status, 201);
    }

    public function show(QuotationStatus $quotationStatus): JsonResponse
    {
        return response()->json($quotationStatus);
    }

    public function update(Request $request, QuotationStatus $quotationStatus): JsonResponse
    {
        $validated = $request->validate([
            'status_name' => 'required|string|max:100|unique:quotation_statuses,status_name,' . $quotationStatus->id,
            'status_key' => 'required|string|max:50|unique:quotation_statuses,status_key,' . $quotationStatus->id,
            'color' => 'nullable|string|max:50',
            'sort_order' => 'required|integer|min:0',
            'is_active' => 'boolean'
        ]);

        $quotationStatus->update($validated);

        return response()->json($quotationStatus);
    }

    public function destroy(QuotationStatus $quotationStatus): JsonResponse
    {
        $quotationStatus->delete();
        return response()->json(['message' => 'Status deleted successfully']);
    }

    public function getActive(): JsonResponse
    {
        $statuses = QuotationStatus::active()->ordered()->get();
        return response()->json($statuses);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'statuses' => 'required|array',
            'statuses.*.id' => 'required|exists:quotation_statuses,id',
            'statuses.*.sort_order' => 'required|integer|min:0'
        ]);

        foreach ($validated['statuses'] as $statusData) {
            QuotationStatus::where('id', $statusData['id'])
                ->update(['sort_order' => $statusData['sort_order']]);
        }

        return response()->json(['message' => 'Statuses reordered successfully']);
    }
}
