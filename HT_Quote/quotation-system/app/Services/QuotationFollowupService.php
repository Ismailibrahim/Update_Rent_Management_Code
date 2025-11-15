<?php

namespace App\Services;

use App\Models\Quotation;
use App\Models\QuotationFollowup;
use App\Models\SystemSetting;
use Carbon\Carbon;

class QuotationFollowupService
{
    /**
     * Create follow-up reminders when a quotation is sent
     */
    public function createFollowupsForQuotation(Quotation $quotation): void
    {
        if ($quotation->status !== 'sent' || !$quotation->sent_date) {
            return;
        }

        // Get followup intervals from system settings
        $firstFollowupDays = (int) SystemSetting::getValue('quotation_first_followup_days', 7);
        $secondFollowupDays = (int) SystemSetting::getValue('quotation_second_followup_days', 14);
        $finalFollowupDays = (int) SystemSetting::getValue('quotation_final_followup_days', 21);

        $sendToCustomer = SystemSetting::getValue('followup_send_to_customer', 'true') === 'true';
        $sendToInternal = SystemSetting::getValue('followup_send_to_internal', 'true') === 'true';

        $recipientType = 'both';
        if ($sendToCustomer && !$sendToInternal) {
            $recipientType = 'customer';
        } elseif (!$sendToCustomer && $sendToInternal) {
            $recipientType = 'internal';
        }

        $followups = [
            [
                'followup_number' => 1,
                'due_date' => Carbon::parse($quotation->sent_date)->addDays($firstFollowupDays),
            ],
            [
                'followup_number' => 2,
                'due_date' => Carbon::parse($quotation->sent_date)->addDays($secondFollowupDays),
            ],
            [
                'followup_number' => 3,
                'due_date' => Carbon::parse($quotation->sent_date)->addDays($finalFollowupDays),
            ],
        ];

        foreach ($followups as $followupData) {
            QuotationFollowup::create([
                'quotation_id' => $quotation->id,
                'followup_number' => $followupData['followup_number'],
                'due_date' => $followupData['due_date'],
                'status' => 'pending',
                'recipient_type' => $recipientType,
            ]);
        }
    }

    /**
     * Cancel all pending follow-ups for a quotation
     */
    public function cancelPendingFollowups(Quotation $quotation, string $reason = 'Status changed'): void
    {
        QuotationFollowup::where('quotation_id', $quotation->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'skipped',
                'notes' => $reason
            ]);
    }

    /**
     * Get all pending follow-ups that are due today or overdue
     */
    public function getDueFollowups()
    {
        return QuotationFollowup::with(['quotation.customer', 'quotation.items'])
            ->where('status', 'pending')
            ->where('due_date', '<=', Carbon::today())
            ->whereHas('quotation', function ($query) {
                $query->where('status', 'sent');
            })
            ->orderBy('due_date', 'asc')
            ->get();
    }

    /**
     * Get pending follow-ups for dashboard
     */
    public function getPendingFollowupsForDashboard(int $limit = 10)
    {
        return QuotationFollowup::with(['quotation.customer'])
            ->where('status', 'pending')
            ->whereHas('quotation', function ($query) {
                $query->where('status', 'sent');
            })
            ->orderBy('due_date', 'asc')
            ->limit($limit)
            ->get();
    }

    /**
     * Mark a follow-up as sent
     */
    public function markFollowupAsSent(QuotationFollowup $followup, int $userId = null): void
    {
        $followup->update([
            'status' => 'sent',
            'sent_date' => Carbon::today(),
            'sent_by' => $userId,
        ]);
    }

    /**
     * Check and auto-expire quotations
     */
    public function autoExpireQuotations(): int
    {
        $autoExpireDays = (int) SystemSetting::getValue('quotation_auto_expire_days', 30);
        $expireDate = Carbon::today()->subDays($autoExpireDays);

        $expiredCount = Quotation::where('status', 'sent')
            ->where('sent_date', '<=', $expireDate)
            ->update(['status' => 'expired']);

        // Cancel pending follow-ups for expired quotations
        if ($expiredCount > 0) {
            $expiredQuotations = Quotation::where('status', 'expired')
                ->where('sent_date', '<=', $expireDate)
                ->pluck('id');

            QuotationFollowup::whereIn('quotation_id', $expiredQuotations)
                ->where('status', 'pending')
                ->update([
                    'status' => 'skipped',
                    'notes' => 'Quotation auto-expired'
                ]);
        }

        return $expiredCount;
    }
}
