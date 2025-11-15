<?php
use App\Http\Controllers\{
    QuotationController,
    ProductController,
    CustomerController,
    ReportController,
    SettingController
};

// Quotations
Route::apiResource('quotations', QuotationController::class);
Route::post('quotations/{id}/send', [QuotationController::class, 'sendQuotation']);
Route::post('quotations/{id}/accept', [QuotationController::class, 'acceptQuotation']);
Route::post('quotations/{id}/reject', [QuotationController::class, 'rejectQuotation']);
Route::post('quotations/{id}/pdf', [QuotationController::class, 'generatePdf']);

// Products & Catalog
Route::apiResource('products', ProductController::class);
Route::apiResource('categories', CategoryController::class);
Route::get('amc-descriptions', [ProductController::class, 'getAmcDescriptions']);

// Customers
Route::apiResource('customers', CustomerController::class);

// Settings
Route::get('settings', [SettingController::class, 'index']);
Route::post('settings/{key}', [SettingController::class, 'update']);

// Reports
Route::get('reports/quotations-stats', [ReportController::class, 'quotationStats']);
Route::get('reports/quotations-by-status', [ReportController::class, 'quotationsByStatus']);
Route::get('reports/top-customers', [ReportController::class, 'topCustomers']);