<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailSetting;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailSettingController extends Controller
{
    protected EmailService $emailService;

    public function __construct(EmailService $emailService)
    {
        $this->emailService = $emailService;
    }

    /**
     * Get email settings
     */
    public function index(): JsonResponse
    {
        try {
            $settings = EmailSetting::latest()->first();
            
            // Don't expose password
            if ($settings) {
                $settings->makeHidden('password');
            }

            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch email settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create or update email settings
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'provider' => 'required|in:smtp,office365',
                'host' => 'required_if:provider,smtp|nullable|string|max:255',
                'port' => 'required|integer|min:1|max:65535',
                'encryption' => 'required|in:tls,ssl,none',
                'username' => 'required|string|max:255',
                'password' => 'required|string',
                'from_address' => 'required|email|max:255',
                'from_name' => 'nullable|string|max:255',
                'is_active' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Auto-set Office 365 defaults
            if ($request->provider === 'office365' && !$request->host) {
                $request->merge(['host' => 'smtp.office365.com']);
                if (!$request->has('port')) {
                    $request->merge(['port' => 587]);
                }
                if (!$request->has('encryption')) {
                    $request->merge(['encryption' => 'tls']);
                }
            }

            // Get existing settings or create new
            $settings = EmailSetting::latest()->first();
            
            if ($settings) {
                $settings->update($request->all());
            } else {
                $settings = EmailSetting::create($request->all());
            }

            $settings->makeHidden('password');

            return response()->json([
                'success' => true,
                'message' => 'Email settings saved successfully',
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to save email settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send test email
     */
    public function testEmail(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => 'required|email|max:255',
                'name' => 'nullable|string|max:255',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            $result = $this->emailService->sendTestEmail(
                $request->email,
                $request->name
            );

            if ($result['success']) {
                return response()->json([
                    'success' => true,
                    'message' => $result['message']
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => $result['message']
                ], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to send test email',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

