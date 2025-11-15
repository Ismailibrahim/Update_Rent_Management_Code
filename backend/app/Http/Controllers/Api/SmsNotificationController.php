<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SmsTemplate;
use App\Models\Tenant;
use App\Services\SmsService;
use App\Services\TemplateEngine;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class SmsNotificationController extends Controller
{
    protected $smsService;
    protected $templateEngine;

    public function __construct(SmsService $smsService, TemplateEngine $templateEngine)
    {
        $this->smsService = $smsService;
        $this->templateEngine = $templateEngine;
    }

    /**
     * Send SMS manually to selected tenants
     */
    public function sendManual(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tenant_ids' => 'required|array|min:1',
            'tenant_ids.*' => 'exists:tenants,id',
            'template_id' => 'nullable|exists:sms_templates,id',
            'message' => 'nullable|string|max:1000',
            'custom_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        // Either template_id or message must be provided
        if (!$request->template_id && !$request->message) {
            return response()->json([
                'success' => false,
                'message' => 'Either template_id or message must be provided'
            ], 400);
        }

        try {
            $results = [];
            $tenants = Tenant::whereIn('id', $request->tenant_ids)
                ->with(['rentalUnits.property'])
                ->get();

            foreach ($tenants as $tenant) {
                $message = $request->message;

                // If template is provided, render it
                if ($request->template_id) {
                    $template = SmsTemplate::findOrFail($request->template_id);
                    if (!$template->is_active) {
                        $results[] = [
                            'tenant_id' => $tenant->id,
                            'success' => false,
                            'message' => 'Template is not active'
                        ];
                        continue;
                    }

                    // Prepare data for template rendering
                    $data = array_merge([
                        'tenant' => $tenant,
                        'rental_unit' => $tenant->rentalUnits->first(),
                        'property' => $tenant->rentalUnits->first()?->property,
                    ], $request->custom_data ?? []);

                    $message = $this->templateEngine->render($template->content, $data);
                }

                // Get phone number
                if (!$tenant->phone) {
                    $results[] = [
                        'tenant_id' => $tenant->id,
                        'success' => false,
                        'message' => 'Tenant does not have a phone number'
                    ];
                    continue;
                }

                // Send SMS
                $rentalUnit = $tenant->rentalUnits->first();
                $result = $this->smsService->sendSms(
                    $tenant->phone,
                    $message,
                    [
                        'tenant_id' => $tenant->id,
                        'rental_unit_id' => $rentalUnit?->id,
                        'template_id' => $request->template_id,
                    ]
                );

                $results[] = array_merge($result, ['tenant_id' => $tenant->id]);
            }

            $successCount = count(array_filter($results, fn($r) => $r['success'] ?? false));
            $failCount = count($results) - $successCount;

            return response()->json([
                'success' => true,
                'message' => "Sent {$successCount} SMS successfully, {$failCount} failed",
                'data' => [
                    'results' => $results,
                    'summary' => [
                        'total' => count($results),
                        'success' => $successCount,
                        'failed' => $failCount,
                    ]
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Manual SMS sending failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to send SMS: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview template with sample data
     */
    public function previewTemplate(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'template_id' => 'required|exists:sms_templates,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'custom_data' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $template = SmsTemplate::findOrFail($request->template_id);
            $data = $request->custom_data ?? [];

            // If tenant_id is provided, load tenant data
            if ($request->tenant_id) {
                $tenant = Tenant::with(['rentalUnits.property'])->findOrFail($request->tenant_id);
                $data = array_merge([
                    'tenant' => $tenant,
                    'rental_unit' => $tenant->rentalUnits->first(),
                    'property' => $tenant->rentalUnits->first()?->property,
                ], $data);
            }

            $rendered = $this->templateEngine->render($template->content, $data);

            return response()->json([
                'success' => true,
                'data' => [
                    'preview' => $rendered,
                    'template' => $template,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to preview template: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test SMS API connection
     */
    public function testConnection(): JsonResponse
    {
        try {
            $result = $this->smsService->testConnection();

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to test connection: ' . $e->getMessage()
            ], 500);
        }
    }
}
