<?php

namespace App\Http\Controllers;

use App\Models\QuotationFollowup;
use App\Services\QuotationFollowupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class QuotationFollowupController extends Controller
{
    protected $followupService;

    public function __construct(QuotationFollowupService $followupService)
    {
        $this->followupService = $followupService;
    }

    /**
     * Get all pending follow-ups for dashboard
     */
    public function getPendingFollowups(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $followups = $this->followupService->getPendingFollowupsForDashboard($limit);

        return response()->json($followups);
    }

    /**
     * Get follow-ups for a specific quotation
     */
    public function getQuotationFollowups($quotationId): JsonResponse
    {
        $followups = QuotationFollowup::where('quotation_id', $quotationId)
            ->with('sentBy')
            ->orderBy('followup_number', 'asc')
            ->get();

        return response()->json($followups);
    }

    /**
     * Manually send a follow-up reminder
     */
    public function sendFollowup(QuotationFollowup $followup): JsonResponse
    {
        if ($followup->status !== 'pending') {
            return response()->json([
                'message' => 'Follow-up has already been sent or skipped'
            ], 400);
        }

        try {
            // TODO: Send actual emails here
            // For now, just mark as sent
            $this->followupService->markFollowupAsSent($followup, auth()->id());

            return response()->json([
                'message' => 'Follow-up reminder sent successfully',
                'followup' => $followup->fresh()
            ]);
        } catch (\Exception $e) {
            $followup->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);

            return response()->json([
                'message' => 'Failed to send follow-up reminder',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Skip a follow-up reminder
     */
    public function skipFollowup(QuotationFollowup $followup, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:500'
        ]);

        $followup->update([
            'status' => 'skipped',
            'notes' => $validated['reason'] ?? 'Manually skipped'
        ]);

        return response()->json([
            'message' => 'Follow-up skipped successfully',
            'followup' => $followup
        ]);
    }

    /**
     * Get follow-up statistics
     */
    public function getStatistics(): JsonResponse
    {
        $stats = [
            'total_pending' => QuotationFollowup::where('status', 'pending')->count(),
            'overdue' => QuotationFollowup::where('status', 'pending')
                ->where('due_date', '<', now()->toDateString())
                ->count(),
            'due_today' => QuotationFollowup::where('status', 'pending')
                ->whereDate('due_date', now()->toDateString())
                ->count(),
            'sent_this_month' => QuotationFollowup::where('status', 'sent')
                ->whereMonth('sent_date', now()->month)
                ->whereYear('sent_date', now()->year)
                ->count(),
        ];

        return response()->json($stats);
    }
}
