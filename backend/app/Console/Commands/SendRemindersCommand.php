<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ReminderConfiguration;
use App\Models\EmailTemplate;
use App\Models\Tenant;
use App\Models\RentInvoice;
use App\Models\MaintenanceInvoice;
use App\Models\Payment;
use App\Models\TenantNotificationPreference;
use App\Services\EmailService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SendRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reminders:send';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send email reminders for due payments, rent, and maintenance invoices';

    protected EmailService $emailService;

    public function __construct(EmailService $emailService)
    {
        parent::__construct();
        $this->emailService = $emailService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        if (!$this->emailService->isConfigured()) {
            $this->error('Email service is not configured. Please configure email settings first.');
            return 1;
        }

        $this->info('Starting reminder sending process...');

        $configurations = ReminderConfiguration::getAllActive();
        
        if ($configurations->isEmpty()) {
            $this->warn('No active reminder configurations found.');
            return 0;
        }

        $sentCount = 0;
        $failedCount = 0;

        foreach ($configurations as $config) {
            $this->info("Processing {$config->reminder_type} reminders...");
            
            $reminders = $this->getRemindersForConfiguration($config);
            
            foreach ($reminders as $reminder) {
                try {
                    $result = $this->sendReminder($reminder, $config);
                    if ($result) {
                        $sentCount++;
                        $this->info("✓ Sent reminder to tenant {$reminder['tenant']->id}");
                    } else {
                        $failedCount++;
                        $this->warn("✗ Failed to send reminder to tenant {$reminder['tenant']->id}");
                    }
                } catch (\Exception $e) {
                    $failedCount++;
                    $this->error("Error sending reminder: " . $e->getMessage());
                    Log::error("Reminder sending error: " . $e->getMessage());
                }
            }
        }

        $this->info("Reminder sending completed. Sent: {$sentCount}, Failed: {$failedCount}");
        return 0;
    }

    /**
     * Get reminders for a configuration
     */
    protected function getRemindersForConfiguration(ReminderConfiguration $config): array
    {
        $reminders = [];
        $targetDate = $this->getTargetDate($config);

        switch ($config->reminder_type) {
            case 'rent_due':
                $reminders = $this->getRentDueReminders($targetDate, $config);
                break;
            case 'rent_overdue':
                $reminders = $this->getRentOverdueReminders($targetDate, $config);
                break;
            case 'payment_due':
                $reminders = $this->getPaymentDueReminders($targetDate, $config);
                break;
            case 'payment_overdue':
                $reminders = $this->getPaymentOverdueReminders($targetDate, $config);
                break;
            case 'maintenance_due':
                $reminders = $this->getMaintenanceDueReminders($targetDate, $config);
                break;
            case 'maintenance_overdue':
                $reminders = $this->getMaintenanceOverdueReminders($targetDate, $config);
                break;
        }

        return $reminders;
    }

    /**
     * Get target date based on configuration
     */
    protected function getTargetDate(ReminderConfiguration $config): Carbon
    {
        $today = Carbon::today();
        
        switch ($config->timing_type) {
            case 'before':
                return $today->copy()->addDays($config->days_offset);
            case 'after':
                return $today->copy()->subDays($config->days_offset);
            case 'on_date':
            default:
                return $today;
        }
    }

    /**
     * Get rent due reminders
     */
    protected function getRentDueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $invoices = RentInvoice::where('status', 'pending')
            ->whereDate('due_date', $targetDate->toDateString())
            ->with(['tenant', 'property', 'rentalUnit'])
            ->get();

        $reminders = [];
        foreach ($invoices as $invoice) {
            if ($invoice->tenant && $invoice->tenant->email) {
                $reminders[] = [
                    'tenant' => $invoice->tenant,
                    'type' => 'rent_due',
                    'invoice' => $invoice,
                    'amount' => $invoice->total_amount,
                    'due_date' => $invoice->due_date,
                    'invoice_number' => $invoice->invoice_number,
                ];
            }
        }

        return $reminders;
    }

    /**
     * Get rent overdue reminders
     */
    protected function getRentOverdueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $invoices = RentInvoice::where('status', 'pending')
            ->whereDate('due_date', '<', $targetDate->toDateString())
            ->with(['tenant', 'property', 'rentalUnit'])
            ->get();

        $reminders = [];
        foreach ($invoices as $invoice) {
            if ($invoice->tenant && $invoice->tenant->email) {
                $reminders[] = [
                    'tenant' => $invoice->tenant,
                    'type' => 'rent_overdue',
                    'invoice' => $invoice,
                    'amount' => $invoice->total_amount,
                    'due_date' => $invoice->due_date,
                    'invoice_number' => $invoice->invoice_number,
                    'days_overdue' => $targetDate->diffInDays($invoice->due_date),
                ];
            }
        }

        return $reminders;
    }

    /**
     * Get payment due reminders
     */
    protected function getPaymentDueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $payments = Payment::where('status', 'pending')
            ->whereDate('due_date', $targetDate->toDateString())
            ->with('tenant')
            ->get();

        $reminders = [];
        foreach ($payments as $payment) {
            if ($payment->tenant && $payment->tenant->email) {
                $reminders[] = [
                    'tenant' => $payment->tenant,
                    'type' => 'payment_due',
                    'payment' => $payment,
                    'amount' => $payment->amount,
                    'due_date' => $payment->due_date,
                ];
            }
        }

        return $reminders;
    }

    /**
     * Get payment overdue reminders
     */
    protected function getPaymentOverdueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $payments = Payment::where('status', 'pending')
            ->whereDate('due_date', '<', $targetDate->toDateString())
            ->with('tenant')
            ->get();

        $reminders = [];
        foreach ($payments as $payment) {
            if ($payment->tenant && $payment->tenant->email) {
                $reminders[] = [
                    'tenant' => $payment->tenant,
                    'type' => 'payment_overdue',
                    'payment' => $payment,
                    'amount' => $payment->amount,
                    'due_date' => $payment->due_date,
                    'days_overdue' => $targetDate->diffInDays($payment->due_date),
                ];
            }
        }

        return $reminders;
    }

    /**
     * Get maintenance due reminders
     */
    protected function getMaintenanceDueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $invoices = MaintenanceInvoice::where('status', 'pending')
            ->whereDate('due_date', $targetDate->toDateString())
            ->with(['tenant', 'property', 'rentalUnit'])
            ->get();

        $reminders = [];
        foreach ($invoices as $invoice) {
            if ($invoice->tenant && $invoice->tenant->email) {
                $reminders[] = [
                    'tenant' => $invoice->tenant,
                    'type' => 'maintenance_due',
                    'invoice' => $invoice,
                    'amount' => $invoice->total_amount,
                    'due_date' => $invoice->due_date,
                    'invoice_number' => $invoice->invoice_number,
                ];
            }
        }

        return $reminders;
    }

    /**
     * Get maintenance overdue reminders
     */
    protected function getMaintenanceOverdueReminders(Carbon $targetDate, ReminderConfiguration $config): array
    {
        $invoices = MaintenanceInvoice::where('status', 'pending')
            ->whereDate('due_date', '<', $targetDate->toDateString())
            ->with(['tenant', 'property', 'rentalUnit'])
            ->get();

        $reminders = [];
        foreach ($invoices as $invoice) {
            if ($invoice->tenant && $invoice->tenant->email) {
                $reminders[] = [
                    'tenant' => $invoice->tenant,
                    'type' => 'maintenance_overdue',
                    'invoice' => $invoice,
                    'amount' => $invoice->total_amount,
                    'due_date' => $invoice->due_date,
                    'invoice_number' => $invoice->invoice_number,
                    'days_overdue' => $targetDate->diffInDays($invoice->due_date),
                ];
            }
        }

        return $reminders;
    }

    /**
     * Send reminder email
     */
    protected function sendReminder(array $reminder, ReminderConfiguration $config): bool
    {
        $tenant = $reminder['tenant'];
        
        // Get email template
        $template = EmailTemplate::getForReminderType($reminder['type']);
        
        if (!$template) {
            Log::warning("No email template found for reminder type: {$reminder['type']}");
            return false;
        }

        // Prepare variables
        $variables = $this->prepareVariables($reminder, $tenant);

        // Render template
        $rendered = $template->render($variables);

        // Send email
        return $this->emailService->sendReminder(
            $tenant,
            $reminder['type'],
            $rendered['subject'],
            $rendered['body_html'],
            $rendered['body_text'],
            $reminder
        );
    }

    /**
     * Prepare variables for template
     */
    protected function prepareVariables(array $reminder, Tenant $tenant): array
    {
        $variables = [
            'tenant_name' => $tenant->full_name,
            'tenant_email' => $tenant->email ?? '',
            'tenant_phone' => $tenant->phone ?? '',
        ];

        // Add amount and due date
        if (isset($reminder['amount'])) {
            $variables['amount'] = number_format($reminder['amount'], 2);
        }
        
        if (isset($reminder['due_date'])) {
            $variables['due_date'] = $reminder['due_date']->format('Y-m-d');
            $variables['due_date_formatted'] = $reminder['due_date']->format('F j, Y');
        }

        // Add invoice-specific variables
        if (isset($reminder['invoice_number'])) {
            $variables['invoice_number'] = $reminder['invoice_number'];
        }

        if (isset($reminder['days_overdue'])) {
            $variables['days_overdue'] = $reminder['days_overdue'];
        }

        // Add property/unit info if available
        if (isset($reminder['invoice'])) {
            $invoice = $reminder['invoice'];
            if (method_exists($invoice, 'property') && $invoice->property) {
                $variables['property_name'] = $invoice->property->name ?? '';
            }
            if (method_exists($invoice, 'rentalUnit') && $invoice->rentalUnit) {
                $variables['unit_name'] = $invoice->rentalUnit->unit_number ?? '';
            }
        }

        return $variables;
    }
}

