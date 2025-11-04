<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\RentalUnitController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\CurrencyController;
use App\Http\Controllers\Api\PaymentModeController;
use App\Http\Controllers\Api\PaymentTypeController;
use App\Http\Controllers\Api\PaymentRecordController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RentInvoiceController;
use App\Http\Controllers\Api\MaintenanceCostController;
use App\Http\Controllers\Api\MaintenanceInvoiceController;
use App\Http\Controllers\Api\RentalUnitTypeController;
use App\Http\Controllers\Api\IslandController;
use App\Http\Controllers\Api\SmsTemplateController;
use App\Http\Controllers\Api\SmsSettingController;
use App\Http\Controllers\Api\SmsLogController;
use App\Http\Controllers\Api\SmsNotificationController;
use App\Http\Controllers\Api\InvoiceTemplateController;
use App\Http\Controllers\Api\EmailSettingController;
use App\Http\Controllers\Api\ReminderConfigurationController;
use App\Http\Controllers\Api\EmailTemplateController;
use App\Http\Controllers\Api\TenantNotificationPreferenceController;
use App\Http\Controllers\Api\ReminderLogController;
use App\Http\Controllers\TenantLedgerController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Public routes
Route::get('/test', function () {
    return response()->json(['message' => 'API is working', 'timestamp' => now()]);
});

// Health check endpoint
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'timestamp' => now()->toIso8601String(),
        'database' => DB::connection()->getPdo() ? 'connected' : 'disconnected'
    ]);
});


Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::get('/settings/dropdowns', [SettingsController::class, 'getDropdowns']); // Public route

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/update-profile', [AuthController::class, 'updateProfile']);

    // Property routes
    Route::apiResource('properties', PropertyController::class);
    Route::get('/properties/{property}/capacity', [PropertyController::class, 'capacity']);
    Route::get('/properties/import/template', [PropertyController::class, 'downloadTemplate']);
    Route::post('/properties/import/preview', [PropertyController::class, 'previewImport']);
    Route::post('/properties/import', [PropertyController::class, 'import']);

    // Rental Unit routes
    Route::get('/rental-units/maintenance-assets', [RentalUnitController::class, 'getMaintenanceAssets']);
    Route::apiResource('rental-units', RentalUnitController::class)->parameters([
        'rental-units' => 'rentalUnit'
    ]);
    Route::get('/rental-units/property/{property}', [RentalUnitController::class, 'getByProperty']);
    Route::post('/rental-units/{rentalUnit}/assets', [RentalUnitController::class, 'addAssets']);
    Route::delete('/rental-units/{rentalUnit}/assets/{asset}', [RentalUnitController::class, 'removeAsset']);
    Route::get('/rental-units/{rentalUnit}/assets', [RentalUnitController::class, 'getAssets']);
    Route::patch('/rental-units/{rentalUnit}/assets/{assetId}/status', [RentalUnitController::class, 'updateAssetStatus']);

    // Asset routes
    Route::apiResource('assets', AssetController::class);
    Route::patch('/assets/{asset}/status', [AssetController::class, 'updateStatus']);
    Route::get('/assets/import/template', [AssetController::class, 'downloadTemplate']);
    Route::post('/assets/import/preview', [AssetController::class, 'previewImport']);
    Route::post('/assets/import', [AssetController::class, 'import']);

    // Tenant routes
    Route::apiResource('tenants', TenantController::class);
    Route::post('/tenants/{tenant}/update', [TenantController::class, 'update']); // Additional POST route for updates with files

    // Dashboard routes
    Route::get('/dashboard/statistics', [DashboardController::class, 'statistics']);
    Route::get('/dashboard/recent-activity', [DashboardController::class, 'recentActivity']);

    // Payment routes
    Route::apiResource('payments', PaymentController::class);
    Route::get('/payments/statistics', [PaymentController::class, 'statistics']);

    // Currency routes
    Route::apiResource('currencies', CurrencyController::class);
    Route::get('/currencies/base', [CurrencyController::class, 'base']);
    Route::post('/currencies/convert', [CurrencyController::class, 'convert']);

    // Payment Mode routes
    Route::apiResource('payment-modes', PaymentModeController::class);

    // Payment Type routes
    Route::apiResource('payment-types', PaymentTypeController::class);

    // Payment Record routes
    Route::apiResource('payment-records', PaymentRecordController::class);

    // Maintenance routes
    Route::apiResource('maintenance', MaintenanceController::class);

    // Maintenance Cost routes
    Route::apiResource('maintenance-costs', MaintenanceCostController::class);
    Route::get('/maintenance-costs/rental-unit-asset/{rentalUnitAssetId}', [MaintenanceCostController::class, 'getByRentalUnitAsset']);

    // Maintenance Invoice routes
    Route::apiResource('maintenance-invoices', MaintenanceInvoiceController::class);

    // User routes
    Route::apiResource('users', UserController::class);

    // Rent Invoice routes
    Route::apiResource('rent-invoices', RentInvoiceController::class);
    Route::post('/rent-invoices/generate-monthly', [RentInvoiceController::class, 'generateMonthlyInvoices']);
    Route::post('/rent-invoices/{rentInvoice}/mark-paid', [RentInvoiceController::class, 'markAsPaid']);
    Route::get('/rent-invoices/{rentInvoice}/payment-slip', [RentInvoiceController::class, 'getPaymentSlip']);
    Route::get('/rent-invoices/{rentInvoice}/payment-slips', [RentInvoiceController::class, 'getAllPaymentSlips']);
    Route::get('/rent-invoices/{rentInvoice}/payment-slip/{index}', [RentInvoiceController::class, 'getPaymentSlipByIndex']);
    Route::get('/rent-invoices/statistics', [RentInvoiceController::class, 'getStatistics']);

    // Rental Unit Type routes
    Route::apiResource('rental-unit-types', RentalUnitTypeController::class);

    // Invoice Template routes
    Route::apiResource('invoice-templates', InvoiceTemplateController::class);
    Route::post('/invoice-templates/{id}/set-default', [InvoiceTemplateController::class, 'setDefault']);
    Route::post('/invoice-templates/{id}/duplicate', [InvoiceTemplateController::class, 'duplicate']);

    // Tenant Ledger routes
    Route::apiResource('tenant-ledgers', TenantLedgerController::class);
    Route::get('/tenant-ledgers/tenant/{tenantId}/balance', [TenantLedgerController::class, 'getTenantBalance']);
    Route::get('/tenant-ledgers/tenant/{tenantId}/summary', [TenantLedgerController::class, 'getTenantSummary']);
    Route::get('/tenant-ledgers/balances/all', [TenantLedgerController::class, 'getAllTenantBalances']);

    // Island routes
    Route::apiResource('islands', IslandController::class);

    // SMS Template routes
    Route::apiResource('sms-templates', SmsTemplateController::class);

    // SMS Setting routes
    Route::get('/sms-settings', [SmsSettingController::class, 'index']);
    Route::post('/sms-settings', [SmsSettingController::class, 'update']);
    Route::get('/sms-settings/{key}', [SmsSettingController::class, 'getSetting']);

    // SMS Log routes
    Route::apiResource('sms-logs', SmsLogController::class)->only(['index', 'show']);

    // SMS Notification routes
    Route::post('/sms-notifications/send', [SmsNotificationController::class, 'sendManual']);
    Route::post('/sms-notifications/preview', [SmsNotificationController::class, 'previewTemplate']);
    Route::get('/sms-notifications/test-connection', [SmsNotificationController::class, 'testConnection']);

    // Email Settings routes
    Route::get('/email-settings', [EmailSettingController::class, 'index']);
    Route::post('/email-settings', [EmailSettingController::class, 'store']);
    Route::post('/email-settings/test', [EmailSettingController::class, 'testEmail']);

    // Reminder Configuration routes
    Route::apiResource('reminder-configurations', ReminderConfigurationController::class);

    // Email Template routes
    Route::apiResource('email-templates', EmailTemplateController::class);
    Route::get('/email-templates/type/{reminderType}', [EmailTemplateController::class, 'getByType']);

    // Tenant Notification Preferences routes
    Route::get('/tenants/{tenantId}/notification-preferences', [TenantNotificationPreferenceController::class, 'show']);
    Route::put('/tenants/{tenantId}/notification-preferences', [TenantNotificationPreferenceController::class, 'update']);

    // Reminder Log routes
    Route::get('/reminder-logs', [ReminderLogController::class, 'index']);
    Route::get('/reminder-logs/statistics', [ReminderLogController::class, 'statistics']);
});
