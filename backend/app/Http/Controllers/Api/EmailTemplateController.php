<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class EmailTemplateController extends Controller
{
    /**
     * Get all email templates
     */
    public function index(): JsonResponse
    {
        try {
            $templates = EmailTemplate::orderBy('reminder_type')
                ->orderBy('is_default', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $templates
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch email templates',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get template by reminder type
     */
    public function getByType(string $reminderType): JsonResponse
    {
        try {
            $template = EmailTemplate::getForReminderType($reminderType);

            return response()->json([
                'success' => true,
                'data' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch email template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create email template
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'reminder_type' => 'required|in:rent_due,rent_overdue,payment_due,payment_overdue,maintenance_due,maintenance_overdue,default',
                'name' => 'required|string|max:255',
                'subject' => 'required|string|max:255',
                'body_html' => 'required|string',
                'body_text' => 'nullable|string',
                'is_active' => 'boolean',
                'is_default' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // If setting as default, unset other defaults for same reminder type
            if ($request->is_default) {
                EmailTemplate::where('reminder_type', $request->reminder_type)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $template = EmailTemplate::create($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Email template created successfully',
                'data' => $template
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create email template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update email template
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $template = EmailTemplate::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'reminder_type' => 'sometimes|in:rent_due,rent_overdue,payment_due,payment_overdue,maintenance_due,maintenance_overdue,default',
                'name' => 'sometimes|string|max:255',
                'subject' => 'sometimes|string|max:255',
                'body_html' => 'sometimes|string',
                'body_text' => 'nullable|string',
                'is_active' => 'boolean',
                'is_default' => 'boolean',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $validator->errors()
                ], 422);
            }

            // If setting as default, unset other defaults for same reminder type
            if ($request->is_default) {
                EmailTemplate::where('reminder_type', $template->reminder_type)
                    ->where('id', '!=', $id)
                    ->where('is_default', true)
                    ->update(['is_default' => false]);
            }

            $template->update($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Email template updated successfully',
                'data' => $template
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update email template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete email template
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $template = EmailTemplate::findOrFail($id);
            $template->delete();

            return response()->json([
                'success' => true,
                'message' => 'Email template deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete email template',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

