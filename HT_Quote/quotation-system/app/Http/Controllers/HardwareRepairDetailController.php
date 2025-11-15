<?php

namespace App\Http\Controllers;

use App\Models\HardwareRepairDetail;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class HardwareRepairDetailController extends Controller
{
    public function show($quotationId): JsonResponse
    {
        try {
            $hardwareRepairDetail = HardwareRepairDetail::where('quotation_id', $quotationId)->first();
            
            if (!$hardwareRepairDetail) {
                return response()->json(['data' => null]);
            }

            return response()->json(['data' => $hardwareRepairDetail]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch hardware repair details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'quotation_id' => 'required|exists:quotations,id',
                'case_numbers' => 'nullable|string',
                'labour_charges' => 'nullable|numeric|min:0',
                'labour_inclusive' => 'boolean',
                'serial_numbers' => 'nullable|string',
            ]);

            // Check if hardware repair detail already exists
            $existing = HardwareRepairDetail::where('quotation_id', $validated['quotation_id'])->first();
            
            if ($existing) {
                $hardwareRepairDetail = $existing->update($validated);
                $hardwareRepairDetail = $existing->fresh();
            } else {
                $hardwareRepairDetail = HardwareRepairDetail::create($validated);
            }

            return response()->json([
                'message' => 'Hardware repair details saved successfully',
                'data' => $hardwareRepairDetail
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to save hardware repair details',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $quotationId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'case_numbers' => 'nullable|string',
                'labour_charges' => 'nullable|numeric|min:0',
                'labour_inclusive' => 'boolean',
                'serial_numbers' => 'nullable|string',
            ]);

            $hardwareRepairDetail = HardwareRepairDetail::where('quotation_id', $quotationId)->first();
            
            if (!$hardwareRepairDetail) {
                return response()->json([
                    'message' => 'Hardware repair details not found'
                ], 404);
            }

            $hardwareRepairDetail->update($validated);

            return response()->json([
                'message' => 'Hardware repair details updated successfully',
                'data' => $hardwareRepairDetail
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update hardware repair details',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
