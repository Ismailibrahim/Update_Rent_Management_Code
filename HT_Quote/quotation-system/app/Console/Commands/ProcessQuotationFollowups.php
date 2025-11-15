<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\QuotationFollowupService;
use App\Models\SystemSetting;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ProcessQuotationFollowups extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quotations:process-followups';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process pending quotation follow-up reminders and send emails';

    protected $followupService;

    public function __construct(QuotationFollowupService $followupService)
    {
        parent::__construct();
        $this->followupService = $followupService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting quotation follow-up processing...');

        // Get all due follow-ups
        $dueFollowups = $this->followupService->getDueFollowups();
        $this->info("Found {$dueFollowups->count()} due follow-ups");

        $sentCount = 0;
        $failedCount = 0;

        foreach ($dueFollowups as $followup) {
            try {
                $this->info("Processing follow-up #{$followup->id} for quotation {$followup->quotation->quotation_number}");

                $sendToCustomer = SystemSetting::getValue('followup_send_to_customer', 'true') === 'true';
                $sendToInternal = SystemSetting::getValue('followup_send_to_internal', 'true') === 'true';

                $customerEmailSent = false;
                $internalEmailSent = false;

                // Send customer email
                if ($sendToCustomer && $followup->quotation->customer) {
                    try {
                        $this->sendCustomerEmail($followup);
                        $customerEmailSent = true;
                        $this->info("  ✓ Customer email sent");
                    } catch (\Exception $e) {
                        $this->error("  ✗ Customer email failed: " . $e->getMessage());
                        Log::error('Customer follow-up email failed', [
                            'followup_id' => $followup->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                // Send internal email
                if ($sendToInternal) {
                    try {
                        $this->sendInternalEmail($followup);
                        $internalEmailSent = true;
                        $this->info("  ✓ Internal email sent");
                    } catch (\Exception $e) {
                        $this->error("  ✗ Internal email failed: " . $e->getMessage());
                        Log::error('Internal follow-up email failed', [
                            'followup_id' => $followup->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                // Update follow-up status
                $followup->update([
                    'status' => ($customerEmailSent || $internalEmailSent) ? 'sent' : 'failed',
                    'sent_date' => now(),
                    'customer_email_status' => $customerEmailSent ? 'sent' : 'skipped',
                    'internal_email_status' => $internalEmailSent ? 'sent' : 'skipped',
                ]);

                $sentCount++;

            } catch (\Exception $e) {
                $this->error("Failed to process follow-up #{$followup->id}: " . $e->getMessage());
                Log::error('Follow-up processing failed', [
                    'followup_id' => $followup->id,
                    'error' => $e->getMessage()
                ]);

                $followup->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage()
                ]);

                $failedCount++;
            }
        }

        // Auto-expire old quotations
        $this->info("\nChecking for quotations to auto-expire...");
        $expiredCount = $this->followupService->autoExpireQuotations();
        $this->info("Auto-expired {$expiredCount} quotations");

        // Summary
        $this->info("\n=== Summary ===");
        $this->info("Processed: {$dueFollowups->count()}");
        $this->info("Sent: {$sentCount}");
        $this->info("Failed: {$failedCount}");
        $this->info("Expired: {$expiredCount}");

        return Command::SUCCESS;
    }

    /**
     * Send follow-up email to customer
     */
    protected function sendCustomerEmail($followup)
    {
        $quotation = $followup->quotation;
        $customer = $quotation->customer;

        $subject = "Follow-up: Quotation {$quotation->quotation_number}";

        $message = "Dear {$customer->contact_person},\n\n";
        $message .= "This is a friendly reminder about our quotation {$quotation->quotation_number} ";
        $message .= "sent on " . $quotation->sent_date->format('d M Y') . ".\n\n";
        $message .= "Quotation Details:\n";
        $message .= "- Amount: {$quotation->currency} " . number_format($quotation->total_amount, 2) . "\n";
        $message .= "- Valid Until: " . $quotation->valid_until->format('d M Y') . "\n\n";

        if ($followup->followup_number == 1) {
            $message .= "We would appreciate if you could review our quotation at your earliest convenience.\n\n";
        } elseif ($followup->followup_number == 2) {
            $message .= "We wanted to check if you have any questions or require any clarifications.\n\n";
        } else {
            $message .= "This is our final reminder. Please let us know if you need any additional information.\n\n";
        }

        $message .= "Please feel free to contact us if you have any questions.\n\n";
        $message .= "Best regards,\n";
        $message .= "Sales Team";

        // Store email content
        $followup->update([
            'customer_email_content' => $message
        ]);

        // TODO: Replace with actual email sending
        // For now, just log it
        Log::info('Customer follow-up email', [
            'to' => $customer->email,
            'subject' => $subject,
            'quotation' => $quotation->quotation_number
        ]);

        // Uncomment when email is configured:
        // Mail::raw($message, function ($mail) use ($customer, $subject) {
        //     $mail->to($customer->email)
        //          ->subject($subject);
        // });
    }

    /**
     * Send follow-up email to internal team
     */
    protected function sendInternalEmail($followup)
    {
        $quotation = $followup->quotation;
        $customer = $quotation->customer;
        $internalEmail = SystemSetting::getValue('followup_internal_email', 'sales@company.com');

        $subject = "Action Required: Follow-up on Quotation {$quotation->quotation_number}";

        $message = "Follow-up Reminder\n\n";
        $message .= "Quotation: {$quotation->quotation_number}\n";
        $message .= "Customer: {$customer->company_name}\n";
        $message .= "Contact: {$customer->contact_person}\n";
        $message .= "Email: {$customer->email}\n";
        $message .= "Phone: {$customer->phone}\n\n";
        $message .= "Amount: {$quotation->currency} " . number_format($quotation->total_amount, 2) . "\n";
        $message .= "Sent Date: " . $quotation->sent_date->format('d M Y') . "\n";
        $message .= "Valid Until: " . $quotation->valid_until->format('d M Y') . "\n";
        $message .= "Days Since Sent: " . $quotation->sent_date->diffInDays(now()) . "\n\n";
        $message .= "Follow-up Number: {$followup->followup_number}\n\n";
        $message .= "Action: Please follow up with the customer to check on the status of this quotation.\n";

        // Store email content
        $followup->update([
            'internal_email_content' => $message
        ]);

        // TODO: Replace with actual email sending
        Log::info('Internal follow-up email', [
            'to' => $internalEmail,
            'subject' => $subject,
            'quotation' => $quotation->quotation_number
        ]);

        // Uncomment when email is configured:
        // Mail::raw($message, function ($mail) use ($internalEmail, $subject) {
        //     $mail->to($internalEmail)
        //          ->subject($subject);
        // });
    }
}
