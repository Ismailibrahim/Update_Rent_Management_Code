<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AssetController extends Controller
{
    /**
     * Display a listing of assets
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Asset::query();

            // Category filter
            if ($request->has('category') && $request->category) {
                $query->where('category', $request->category);
            }

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('brand', 'like', "%{$search}%")
                      ->orWhere('serial_no', 'like', "%{$search}%");
                });
            }

            $assets = $query->orderBy('created_at', 'desc')->get();

            return response()->json([
                'success' => true,
                'assets' => $assets
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch assets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created asset
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'brand' => 'nullable|string|max:50',
            'serial_no' => 'nullable|string|max:100',
            'category' => ['required', Rule::in(['furniture', 'appliance', 'electronics', 'plumbing', 'electrical', 'hvac', 'security', 'other'])],
            'status' => ['sometimes', Rule::in(['working', 'faulty', 'maintenance', 'retired'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $asset = Asset::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Asset created successfully',
                'asset' => $asset
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create asset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified asset
     */
    public function show(Asset $asset): JsonResponse
    {
        try {
            $asset->load('rentalUnits');

            return response()->json([
                'success' => true,
                'asset' => $asset
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch asset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified asset
     */
    public function update(Request $request, Asset $asset): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100',
            'brand' => 'nullable|string|max:50',
            'serial_no' => 'nullable|string|max:100',
            'category' => ['sometimes', Rule::in(['furniture', 'appliance', 'electronics', 'plumbing', 'electrical', 'hvac', 'security', 'other'])],
            'status' => ['sometimes', Rule::in(['working', 'faulty', 'maintenance', 'retired'])],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $asset->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Asset updated successfully',
                'asset' => $asset
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update asset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update asset status
     */
    public function updateStatus(Request $request, Asset $asset): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', Rule::in(['working', 'maintenance'])],
            'maintenance_notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updateData = ['status' => $request->status];
            
            // Only update maintenance notes if status is maintenance
            if ($request->status === 'maintenance' && $request->has('maintenance_notes')) {
                $updateData['maintenance_notes'] = $request->maintenance_notes;
            } elseif ($request->status === 'working') {
                // Clear maintenance notes when status is working
                $updateData['maintenance_notes'] = null;
            }
            
            $asset->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Asset status updated successfully',
                'asset' => $asset
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update asset status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified asset
     */
    public function destroy(Asset $asset): JsonResponse
    {
        try {
            $asset->delete();

            return response()->json([
                'success' => true,
                'message' => 'Asset deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete asset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV import template
     */
    public function downloadTemplate(): JsonResponse
    {
        try {
            $headers = [
                'name [REQUIRED]',
                'brand',
                'serial_no',
                'category [REQUIRED]',
                'status'
            ];

            $instructions = [
                'INSTRUCTIONS: Fields marked with [REQUIRED] must be filled. Category must be one of: furniture, appliance, electronics, plumbing, electrical, hvac, security, other. Status must be one of: working, faulty, maintenance, retired (defaults to working if not provided).'
            ];

            $sampleData = [
                [
                    'name [REQUIRED]' => 'Air Conditioner',
                    'brand' => 'Daikin',
                    'serial_no' => 'AC-001',
                    'category [REQUIRED]' => 'hvac',
                    'status' => 'working'
                ],
                [
                    'name [REQUIRED]' => 'Refrigerator',
                    'brand' => 'LG',
                    'serial_no' => 'RF-002',
                    'category [REQUIRED]' => 'appliance',
                    'status' => 'working'
                ]
            ];

            // Build CSV content with instructions and headers
            $csvContent = '"' . implode('","', array_map(function($field) {
                return str_replace('"', '""', $field);
            }, $instructions)) . '"' . "\n";
            $csvContent .= '"' . implode('","', array_map(function($field) {
                return str_replace('"', '""', $field);
            }, $headers)) . '"' . "\n";
            
            // Add sample data
            foreach ($sampleData as $row) {
                $csvContent .= '"' . implode('","', array_map(function($field) {
                    return str_replace('"', '""', $field);
                }, $row)) . '"' . "\n";
            }

            return response()->json([
                'template' => $csvContent,
                'headers' => $headers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview CSV import data
     */
    public function previewImport(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_data' => 'required|string',
            'field_mapping' => 'required|array',
            'has_header' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $csvData = $request->csv_data;
            $fieldMapping = $request->field_mapping;
            $hasHeader = $request->has('has_header') ? $request->boolean('has_header') : true;

            // Parse CSV
            $lines = explode("\n", trim($csvData));
            $dataLines = [];
            
            // Filter out empty lines and instruction rows
            foreach ($lines as $line) {
                $trimmedLine = trim($line);
                if (empty($trimmedLine)) {
                    continue;
                }
                
                // Skip instruction rows
                if (stripos($trimmedLine, 'INSTRUCTIONS:') !== false || 
                    stripos($trimmedLine, 'instructions') !== false) {
                    continue;
                }
                
                $dataLines[] = $line;
            }
            
            // Remove header row if present
            if ($hasHeader && count($dataLines) > 0) {
                array_shift($dataLines);
            }

            $validCategories = ['furniture', 'appliance', 'electronics', 'plumbing', 'electrical', 'hvac', 'security', 'other'];
            $validStatuses = ['working', 'faulty', 'maintenance', 'retired'];

            $preview = [];
            $errors = [];

            foreach ($dataLines as $index => $line) {
                $rowData = str_getcsv($line);
                
                if (empty(array_filter($rowData))) {
                    continue; // Skip completely empty rows
                }

                $mappedData = [];
                
                // Map CSV columns to asset fields
                foreach ($fieldMapping as $csvColumn => $assetField) {
                    if ($assetField && isset($rowData[$csvColumn])) {
                        $value = trim($rowData[$csvColumn]);
                        // Remove quotes and [REQUIRED] markers
                        $value = str_replace(['"', "'"], '', $value);
                        $value = preg_replace('/\s*\[REQUIRED\]\s*/i', '', $value);
                        
                        if ($value !== '') {
                            $mappedData[$assetField] = $value;
                        }
                    }
                }

                $rowErrors = [];

                // Validate required fields
                $requiredFields = ['name', 'category'];
                foreach ($requiredFields as $field) {
                    if (empty($mappedData[$field])) {
                        $rowErrors[] = "Row " . ($index + 1) . ": Missing required field '{$field}'";
                    }
                }

                // Validate category
                if (isset($mappedData['category']) && !in_array(strtolower($mappedData['category']), $validCategories)) {
                    $rowErrors[] = "Row " . ($index + 1) . ": Invalid category '{$mappedData['category']}'. Must be one of: " . implode(', ', $validCategories);
                }

                // Validate status if provided
                if (isset($mappedData['status']) && !in_array(strtolower($mappedData['status']), $validStatuses)) {
                    $rowErrors[] = "Row " . ($index + 1) . ": Invalid status '{$mappedData['status']}'. Must be one of: " . implode(', ', $validStatuses);
                }

                // Set defaults
                $mappedData['category'] = $mappedData['category'] ?? 'other';
                $mappedData['status'] = $mappedData['status'] ?? 'working';

                if (count($rowErrors) > 0) {
                    $errors = array_merge($errors, $rowErrors);
                }

                $preview[] = $mappedData;
            }

            return response()->json([
                'preview' => $preview,
                'errors' => $errors,
                'total_rows' => count($preview)
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to preview import',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import assets from CSV
     */
    public function import(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_data' => 'required|string',
            'field_mapping' => 'required|array',
            'has_header' => 'boolean',
            'skip_errors' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            $csvData = $request->csv_data;
            $fieldMapping = $request->field_mapping;
            $hasHeader = $request->has('has_header') ? $request->boolean('has_header') : true;
            $skipErrors = $request->has('skip_errors') ? $request->boolean('skip_errors') : false;

            // Parse CSV
            $lines = explode("\n", trim($csvData));
            $dataLines = [];
            
            // Filter out empty lines and instruction rows
            foreach ($lines as $line) {
                $trimmedLine = trim($line);
                if (empty($trimmedLine)) {
                    continue;
                }
                
                // Skip instruction rows
                if (stripos($trimmedLine, 'INSTRUCTIONS:') !== false || 
                    stripos($trimmedLine, 'instructions') !== false) {
                    continue;
                }
                
                $dataLines[] = $line;
            }
            
            // Remove header row if present
            if ($hasHeader && count($dataLines) > 0) {
                array_shift($dataLines);
            }

            $validCategories = ['furniture', 'appliance', 'electronics', 'plumbing', 'electrical', 'hvac', 'security', 'other'];
            $validStatuses = ['working', 'faulty', 'maintenance', 'retired'];

            $imported = 0;
            $failed = 0;
            $errors = [];

            foreach ($dataLines as $rowIndex => $line) {
                try {
                    $rowData = str_getcsv($line);
                    
                    if (empty(array_filter($rowData))) {
                        continue; // Skip completely empty rows
                    }

                    $mappedData = [];
                    
                    // Map CSV columns to asset fields
                    foreach ($fieldMapping as $csvColumn => $assetField) {
                        if ($assetField && isset($rowData[$csvColumn])) {
                            $value = trim($rowData[$csvColumn]);
                            // Remove quotes and [REQUIRED] markers
                            $value = str_replace(['"', "'"], '', $value);
                            $value = preg_replace('/\s*\[REQUIRED\]\s*/i', '', $value);
                            
                            if ($value !== '') {
                                $mappedData[$assetField] = $value;
                            }
                        }
                    }

                    // Set defaults
                    $mappedData['category'] = $mappedData['category'] ?? 'other';
                    $mappedData['status'] = $mappedData['status'] ?? 'working';

                    // Validate required fields
                    $requiredFields = ['name', 'category'];
                    foreach ($requiredFields as $field) {
                        if (empty($mappedData[$field])) {
                            throw new \Exception("Missing required field: {$field}");
                        }
                    }

                    // Validate category
                    if (!in_array(strtolower($mappedData['category']), $validCategories)) {
                        throw new \Exception("Invalid category: {$mappedData['category']}");
                    }

                    // Validate status if provided
                    if (isset($mappedData['status']) && !in_array(strtolower($mappedData['status']), $validStatuses)) {
                        throw new \Exception("Invalid status: {$mappedData['status']}");
                    }

                    // Check for duplicate asset (name + serial_no combination)
                    $existingAsset = Asset::where('name', $mappedData['name'])
                        ->where(function($query) use ($mappedData) {
                            if (isset($mappedData['serial_no']) && $mappedData['serial_no']) {
                                $query->where('serial_no', $mappedData['serial_no']);
                            } else {
                                $query->whereNull('serial_no');
                            }
                        })
                        ->first();
                    
                    if ($existingAsset) {
                        $serialInfo = isset($mappedData['serial_no']) && $mappedData['serial_no'] 
                            ? " with serial number '{$mappedData['serial_no']}'" 
                            : " without serial number";
                        throw new \Exception("Asset with name '{$mappedData['name']}'{$serialInfo} already exists");
                    }

                    // Create asset
                    Asset::create($mappedData);
                    $imported++;

                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = "Row " . ($rowIndex + 1) . ": " . $e->getMessage();
                    if (!$skipErrors) {
                        \Illuminate\Support\Facades\DB::rollBack();
                        return response()->json([
                            'message' => 'Import failed',
                            'imported' => $imported,
                            'failed' => $failed,
                            'errors' => $errors
                        ], 400);
                    }
                }
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'message' => 'Import completed',
                'imported' => $imported,
                'failed' => $failed,
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'message' => 'Import failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}