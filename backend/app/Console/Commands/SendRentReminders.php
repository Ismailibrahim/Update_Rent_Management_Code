<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\SmsSetting;
use App\Models\SmsTemplate;
use App\Models\Tenant;
use App\Models\RentalUnit;
use App\Services\SmsService;
use App\Services\TemplateEngine;
use Illuminate\Support\Facades\Log;

class SendRentReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sms:send-rent-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send automated rent payment reminders to tenants';

    protected $smsService;
    protected $templateEngine;

    public function __construct(SmsService $smsService, TemplateEngine $templateEngine)
    {
        parent::__construct();
        $this->smsService = $smsService;
        $this->templateEngine = $templateEngine;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting rent reminder SMS job...');

        // Check if SMS is enabled
        $smsEnabled = SmsSetting::getValue('sms_enabled', 'false');
        if ($smsEnabled !== 'true') {
            $this->warn('SMS service is disabled. Skipping rent reminders.');
            return 0;
        }

        // Get reminder day and time
        $reminderDay = (int) SmsSetting::getValue('rent_reminder_day', '1');
        $reminderTime = SmsSetting::getValue('rent_reminder_time', '09:00');
        $timezone = SmsSetting::getValue('timezone', 'Indian/Maldives');

        // Check if today is the reminder day
        $today = now($timezone);
        if ($today->day !== $reminderDay) {
            $this->info("Today is not the reminder day ({$reminderDay}). Skipping.");
            return 0;
        }

        // Check if current time matches reminder time (within 1 hour window)
        $reminderHour = (int) explode(':', $reminderTime)[0];
        $currentHour = $today->hour;
        
        if ($currentHour < $reminderHour || $currentHour > $reminderHour) {
            $this->info("Current time ({$currentHour}:00) does not match reminder time ({$reminderTime}). Skipping.");
            return 0;
        }

        // Get active rent reminder template
        $template = SmsTemplate::where('type', 'rent_reminder')
            ->where('is_active', true)
            ->first();

        if (!$template) {
            $this->warn('No active rent reminder template found. Skipping.');
            return 0;
        }

        // Get all tenants with occupied rental units
        $tenants = Tenant::whereHas('rentalUnits', function ($query) {
            $query->where('status', 'occupied')
                  ->where('is_active', true);
        })
        ->with(['rentalUnits' => function ($query) {
            $query->where('status', 'occupied')
                  ->where('is_active', true)
                  ->with('property');
        }])
        ->whereNotNull('phone')
        ->get();

        if ($tenants->isEmpty()) {
            $this->info('No tenants with phone numbers found. Skipping.');
            return 0;
        }

        $this->info("Found {$tenants->count()} tenants to send reminders to.");

        $successCount = 0;
        $failCount = 0;

        foreach ($tenants as $tenant) {
            try {
                $rentalUnit = $tenant->rentalUnits->first();
                if (!$rentalUnit) {
                    continue;
                }

                // Calculate due date (typically same day each month)
                $dueDate = $today->copy()->format('Y-m-d');

                // Prepare template data
                $data = [
                    'tenant' => $tenant,
                    'rental_unit' => $rentalUnit,
                    'property' => $rentalUnit->property,
                    'due_date' => $dueDate,
                    'current_date' => $today->format('Y-m-d'),
                    'current_month' => $today->format('F Y'),
                ];

                // Render template
                $message = $this->templateEngine->render($template->content, $data);

                // Send SMS
                $result = $this->smsService->sendSms(
                    $tenant->phone,
                    $message,
                    [
                        'tenant_id' => $tenant->id,
                        'rental_unit_id' => $rentalUnit->id,
                        'template_id' => $template->id,
                    ]
                );

                if ($result['success']) {
                    $successCount++;
                    $this->info("✓ Sent reminder to {$tenant->full_name} ({$tenant->phone})");
                } else {
                    $failCount++;
                    $this->error("✗ Failed to send to {$tenant->full_name}: {$result['message']}");
                }
            } catch (\Exception $e) {
                $failCount++;
                $this->error("✗ Error sending to {$tenant->full_name}: {$e->getMessage()}");
                Log::error('Rent reminder SMS error', [
                    'tenant_id' => $tenant->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("\nCompleted: {$successCount} sent, {$failCount} failed");
        
        return 0;
    }
}
