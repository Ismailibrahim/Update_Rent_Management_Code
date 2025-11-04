<?php

namespace App\Services;

use App\Models\EmailSetting;
use App\Models\ReminderLog;
use App\Models\Tenant;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;
use Exception;

class EmailService
{
    protected ?EmailSetting $emailSetting = null;

    public function __construct()
    {
        try {
            $this->emailSetting = EmailSetting::getActive();
        } catch (\Exception $e) {
            // Table might not exist during migrations
            $this->emailSetting = null;
        }
    }

    /**
     * Configure Laravel Mail with email settings
     */
    protected function configureMail(): bool
    {
        if (!$this->emailSetting) {
            Log::error('No active email settings found');
            return false;
        }

        try {
            $config = $this->emailSetting->getMailConfig();
            
            Config::set('mail.mailers.smtp.host', $config['host']);
            Config::set('mail.mailers.smtp.port', $config['port']);
            Config::set('mail.mailers.smtp.encryption', $config['encryption']);
            Config::set('mail.mailers.smtp.username', $config['username']);
            Config::set('mail.mailers.smtp.password', $config['password']);
            Config::set('mail.from.address', $this->emailSetting->from_address);
            Config::set('mail.from.name', $this->emailSetting->from_name ?? config('app.name'));

            return true;
        } catch (Exception $e) {
            Log::error('Failed to configure mail: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Send email reminder
     */
    public function sendReminder(
        Tenant $tenant,
        string $reminderType,
        string $subject,
        string $bodyHtml,
        string $bodyText = null,
        array $metadata = []
    ): bool {
        if (!$this->emailSetting || !$this->emailSetting->is_active) {
            Log::error('Email service is not configured or inactive');
            return false;
        }

        // Check tenant preferences
        $preferences = \App\Models\TenantNotificationPreference::getOrCreateForTenant($tenant->id);
        if (!$preferences->wantsEmail()) {
            Log::info("Tenant {$tenant->id} has email notifications disabled");
            return false;
        }

        if (!$tenant->email) {
            Log::warning("Tenant {$tenant->id} has no email address");
            return false;
        }

        // Create reminder log
        $log = ReminderLog::create([
            'tenant_id' => $tenant->id,
            'reminder_type' => $reminderType,
            'notification_type' => 'email',
            'recipient_email' => $tenant->email,
            'subject' => $subject,
            'message' => $bodyText ?? strip_tags($bodyHtml),
            'status' => 'pending',
            'metadata' => $metadata,
        ]);

        try {
            // Configure mail
            if (!$this->configureMail()) {
                throw new Exception('Failed to configure mail settings');
            }

            // Send email using raw method
            Mail::html($bodyHtml, function ($message) use ($tenant, $subject, $bodyText) {
                $message->to($tenant->email, $tenant->full_name)
                    ->subject($subject);
            });

            // Mark as sent
            $log->markAsSent();
            Log::info("Reminder email sent successfully to tenant {$tenant->id}");
            
            return true;
        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
            $log->markAsFailed($errorMessage);
            Log::error("Failed to send reminder email to tenant {$tenant->id}: {$errorMessage}");
            
            return false;
        }
    }

    /**
     * Send test email
     */
    public function sendTestEmail(string $toEmail, string $toName = null): array
    {
        if (!$this->emailSetting || !$this->emailSetting->is_active) {
            return [
                'success' => false,
                'message' => 'Email service is not configured or inactive'
            ];
        }

        try {
            if (!$this->configureMail()) {
                throw new Exception('Failed to configure mail settings');
            }

            $subject = 'Test Email - ' . config('app.name');
            $bodyHtml = '<html><body><h2>Test Email</h2><p>This is a test email from your rent management system.</p><p>If you received this email, your email configuration is working correctly!</p></body></html>';
            $bodyText = 'This is a test email from your rent management system. If you received this email, your email configuration is working correctly!';

            Mail::html($bodyHtml, function ($message) use ($toEmail, $toName, $subject) {
                $message->to($toEmail, $toName)
                    ->subject($subject);
            });

            return [
                'success' => true,
                'message' => 'Test email sent successfully'
            ];
        } catch (Exception $e) {
            Log::error("Failed to send test email: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to send test email: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check if email service is configured
     */
    public function isConfigured(): bool
    {
        return $this->emailSetting !== null && $this->emailSetting->is_active;
    }
}

