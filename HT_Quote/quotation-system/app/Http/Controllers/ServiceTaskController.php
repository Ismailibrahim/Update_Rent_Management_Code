<?php

namespace App\Http\Controllers;

use App\Models\ServiceTask;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ServiceTaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ServiceTask::with(['product.category'])->where('is_active', true);

        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $tasks = $query->orderBy('sequence_order')->get();

        return response()->json($tasks);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'task_description' => 'required|string',
            'estimated_man_days' => 'nullable|numeric|min:0',
            'sequence_order' => 'required|integer|min:0',
        ]);

        $task = ServiceTask::create($validated);
        $task->load('product.category');

        return response()->json($task, 201);
    }

    public function show(ServiceTask $serviceTask): JsonResponse
    {
        $serviceTask->load('product.category');
        return response()->json($serviceTask);
    }

    public function update(Request $request, ServiceTask $serviceTask): JsonResponse
    {
        $validated = $request->validate([
            'task_description' => 'string',
            'estimated_man_days' => 'nullable|numeric|min:0',
            'sequence_order' => 'integer|min:0',
            'is_active' => 'boolean',
        ]);

        $serviceTask->update($validated);
        $serviceTask->load('product.category');

        return response()->json($serviceTask);
    }

    public function destroy(ServiceTask $serviceTask): JsonResponse
    {
        $serviceTask->update(['is_active' => false]);
        return response()->json(['message' => 'Service task deactivated successfully']);
    }

    /**
     * Get service tasks for a specific product
     */
    public function getByProduct(Product $product): JsonResponse
    {
        $tasks = $product->serviceTasks()
            ->where('is_active', true)
            ->orderBy('sequence_order')
            ->get();

        return response()->json([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'total_man_days' => $product->total_man_days,
            'man_day_rate' => $product->man_day_rate,
            'service_tasks' => $tasks->map(function($task) {
                return [
                    'id' => $task->id,
                    'task_description' => $task->task_description,
                    'estimated_man_days' => $task->estimated_man_days,
                    'sequence_order' => $task->sequence_order
                ];
            })
        ]);
    }

    /**
     * Reorder service tasks for a product
     */
    public function reorder(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'task_orders' => 'required|array',
            'task_orders.*.id' => 'required|exists:service_tasks,id',
            'task_orders.*.sequence_order' => 'required|integer|min:0',
        ]);

        foreach ($validated['task_orders'] as $taskOrder) {
            ServiceTask::where('id', $taskOrder['id'])
                ->where('product_id', $product->id)
                ->update(['sequence_order' => $taskOrder['sequence_order']]);
        }

        return response()->json(['message' => 'Service tasks reordered successfully']);
    }
}
