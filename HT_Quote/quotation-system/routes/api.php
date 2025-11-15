<?php

use App\Http\Controllers\{
    AuthController,
    AuditLogController,
    ContactTypeController,
    QuotationController,
    QuotationItemController,
    QuotationStatusController,
    QuotationFollowupController,
    ProductController,
    CustomerController,
    CustomerContactController,
    CustomerSupportContractController,
    CategoryController,
    ReportController,
    SettingController,
    ServiceTaskController,
    TermsConditionsController,
    ServiceTermsController,
    ProductSuggestionController,
    ProductCostPriceController,
    UserController,
    SupportProductController,
    ContractTypeController,
    DesignationController,
    ExpenseCategoryController,
    LandedCostController,
    ShipmentController,
    HardwareRepairDetailController,
    CountryController,
    RoleController,
    PermissionController
};
use Illuminate\Support\Facades\Route;

// Test routes - only available in local/testing environments
if (app()->environment('local', 'testing')) {
    Route::get('test', function () {
        return response()->json(['message' => 'API is working', 'timestamp' => now()]);
    });

    Route::get('test-products', function () {
        try {
            $products = \App\Models\Product::with('category')->limit(5)->get();
            return response()->json(['products' => $products]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('test-customers', function () {
        try {
            $customers = \App\Models\Customer::select(['id', 'resort_name', 'resort_code'])->limit(5)->get();
            return response()->json(['customers' => $customers]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('test-categories', function () {
        try {
            $categories = \App\Models\ProductCategory::where('is_active', true)->limit(5)->get();
            return response()->json(['categories' => $categories]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('test-categories-full', function () {
        try {
            $categories = \App\Models\ProductCategory::with(['parent:id,name', 'children:id,name,parent_id'])
                ->where('is_active', true)
                ->withCount('products')
                ->orderBy('category_type')
                ->orderBy('name')
                ->get();
            return response()->json($categories);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });

    Route::get('test-categories-controller', [CategoryController::class, 'index']);
    
    Route::get('test-statuses', function () {
        try {
            $statuses = \App\Models\QuotationStatus::active()->ordered()->get();
            return response()->json($statuses);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    });
}

// Authentication routes
Route::post('auth/login', [AuthController::class, 'login']);
Route::post('auth/register', [AuthController::class, 'register']);

// Public service terms routes (for viewing only)
Route::get('service-terms', [ServiceTermsController::class, 'index']);
Route::get('service-terms/{service_term}', [ServiceTermsController::class, 'show']);
Route::get('service-terms/default', [ServiceTermsController::class, 'getDefault']);
Route::get('service-terms/page/{pageNumber}', [ServiceTermsController::class, 'getByPage']);

// Public contact types, designations, and countries routes (for dropdowns)
Route::get('contact-types', [ContactTypeController::class, 'index']);
Route::get('designations', [DesignationController::class, 'index']);
Route::get('countries', [CountryController::class, 'index']);

// Public quotation statuses route (for dropdowns)
Route::get('quotation-statuses-active', [QuotationStatusController::class, 'getActive']);

// Public terms-conditions routes (for print previews)
Route::get('terms-conditions/spare-parts-template', [TermsConditionsController::class, 'getSparePartsTemplate']);

// Health check routes (public)
Route::get('health', [App\Http\Controllers\HealthController::class, 'check']);
Route::get('health/status', [App\Http\Controllers\HealthController::class, 'status']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    // Products API - requires authentication
    Route::apiResource('products', ProductController::class);
    Route::get('products/{product}/service-tasks', [ProductController::class, 'getServiceTasks']);
    Route::get('amc-descriptions', [ProductController::class, 'getAmcDescriptions']);

    // Customers API - requires authentication
    Route::apiResource('customers', CustomerController::class);
    Route::post('customers/bulk-import', [CustomerController::class, 'bulkImport']);
    
    // Customer Contacts API - requires authentication
    Route::get('customer-contacts', [CustomerContactController::class, 'index']);
    Route::get('customers/{customer}/contacts', [CustomerContactController::class, 'getByCustomer']);
    Route::post('customers/{customer}/contacts', [CustomerContactController::class, 'store']);
    Route::get('customer-contacts/{customerContact}', [CustomerContactController::class, 'show']);
    Route::put('customer-contacts/{customerContact}', [CustomerContactController::class, 'update']);
    Route::delete('customer-contacts/{customerContact}', [CustomerContactController::class, 'destroy']);
    Route::patch('customer-contacts/{customerContact}/set-primary', [CustomerContactController::class, 'setPrimary']);

    // Service Tasks API - requires authentication
    Route::apiResource('service-tasks', ServiceTaskController::class);
    Route::get('service-tasks/product/{product}', [ServiceTaskController::class, 'getByProduct']);
    Route::post('service-tasks/reorder/{product}', [ServiceTaskController::class, 'reorder']);
    
    // Product Suggestions API - requires authentication
    Route::apiResource('product-suggestions', ProductSuggestionController::class);
    Route::post('product-suggestions/bulk', [ProductSuggestionController::class, 'bulkStore']);
    Route::post('product-suggestions/reorder', [ProductSuggestionController::class, 'reorder']);
    Route::get('products/{product}/suggestions', [ProductSuggestionController::class, 'getSuggestionsForProduct']);
    
    // Product Cost Prices API - requires authentication
    Route::apiResource('product-cost-prices', ProductCostPriceController::class);
    Route::get('products/{product}/latest-cost-price', [ProductCostPriceController::class, 'getLatestByProduct']);

    // Categories API - requires authentication
    Route::apiResource('categories', CategoryController::class);
    Route::get('categories/tree', [CategoryController::class, 'getTree']);
    Route::get('categories/select-options', [CategoryController::class, 'getSelectOptions']);
    Route::get('categories/parents', [CategoryController::class, 'getParents']);
    Route::get('categories/{category}/children', [CategoryController::class, 'getChildren']);
    Route::get('categories/{category}/descendants', [CategoryController::class, 'getDescendants']);

    Route::get('quotations/preview-number', [QuotationController::class, 'previewNumber']);
    Route::apiResource('quotations', QuotationController::class);
    Route::post('quotations/{quotation}/send', [QuotationController::class, 'sendQuotation']);
    Route::post('quotations/{quotation}/accept', [QuotationController::class, 'acceptQuotation']);
    Route::post('quotations/{quotation}/reject', [QuotationController::class, 'rejectQuotation']);
    Route::post('quotations/{quotation}/pdf', [QuotationController::class, 'generatePdf']);
    Route::get('quotations/{quotation}/status-history', [QuotationController::class, 'getStatusHistory']);

    Route::apiResource('quotation-items', QuotationItemController::class);

    Route::apiResource('quotation-statuses', QuotationStatusController::class);
    Route::get('quotation-statuses-active', [QuotationStatusController::class, 'getActive']);
    Route::post('quotation-statuses/reorder', [QuotationStatusController::class, 'reorder']);

    Route::get('settings', [SettingController::class, 'index']);
    Route::post('settings/upload-logo', [SettingController::class, 'uploadLogo']);
    Route::post('settings/{key}', [SettingController::class, 'update']);

    Route::apiResource('terms-conditions', TermsConditionsController::class);
    Route::post('terms-conditions/{id}/set-default', [TermsConditionsController::class, 'setDefault']);
    Route::get('terms-conditions/category/{categoryType}', [TermsConditionsController::class, 'getByCategory']);

    // Hardware Repair Details Routes
    Route::get('quotations/{quotationId}/hardware-repair-details', [HardwareRepairDetailController::class, 'show']);
    Route::post('hardware-repair-details', [HardwareRepairDetailController::class, 'store']);
    Route::put('quotations/{quotationId}/hardware-repair-details', [HardwareRepairDetailController::class, 'update']);
    
    // Service Terms Routes (Create, Update, Delete - protected)
    Route::post('service-terms', [ServiceTermsController::class, 'store']);
    Route::put('service-terms/{service_term}', [ServiceTermsController::class, 'update']);
    Route::patch('service-terms/{service_term}', [ServiceTermsController::class, 'update']);
    Route::delete('service-terms/{service_term}', [ServiceTermsController::class, 'destroy']);

    // Product suggestions and cost prices routes moved outside auth middleware for frontend access

    Route::get('reports/quotations-stats', [ReportController::class, 'quotationStats']);
    Route::get('reports/quotations-by-status', [ReportController::class, 'quotationsByStatus']);
    Route::get('reports/top-customers', [ReportController::class, 'topCustomers']);

    // Quotation Follow-ups
    Route::get('quotation-followups/pending', [QuotationFollowupController::class, 'getPendingFollowups']);
    Route::get('quotation-followups/statistics', [QuotationFollowupController::class, 'getStatistics']);
    Route::get('quotations/{quotationId}/followups', [QuotationFollowupController::class, 'getQuotationFollowups']);
    Route::post('quotation-followups/{followup}/send', [QuotationFollowupController::class, 'sendFollowup']);
    Route::post('quotation-followups/{followup}/skip', [QuotationFollowupController::class, 'skipFollowup']);

    // Customer Support Contracts
    Route::get('support-contracts/statistics', [CustomerSupportContractController::class, 'statistics']);
    Route::get('customers/{customerId}/support-contracts', [CustomerSupportContractController::class, 'getByCustomer']);
    Route::post('support-contracts/{id}/renew', [CustomerSupportContractController::class, 'renew']);
    Route::post('support-contracts/{id}/set-inactive', [CustomerSupportContractController::class, 'setInactive']);
    Route::apiResource('support-contracts', CustomerSupportContractController::class);

    // User Management
    Route::get('users/statistics', [UserController::class, 'statistics']);
    Route::post('users/{id}/toggle-status', [UserController::class, 'toggleStatus']);
    Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
    Route::get('users/{id}/roles', [UserController::class, 'getRoles']);
    Route::post('users/{id}/roles', [UserController::class, 'assignRoles']);
    Route::delete('users/{id}/roles', [UserController::class, 'removeRole']);
    Route::apiResource('users', UserController::class);

    // Roles & Permissions Management
    Route::apiResource('roles', RoleController::class);
    Route::post('roles/{role}/permissions', [RoleController::class, 'assignPermissions']);
    Route::get('permissions', [PermissionController::class, 'index']);
    Route::get('permissions/{permission}', [PermissionController::class, 'show']);

    // Support Products
    Route::get('support-products/statistics', [SupportProductController::class, 'statistics']);
    Route::post('support-products/{id}/toggle-status', [SupportProductController::class, 'toggleStatus']);
    Route::post('support-products/update-sort-order', [SupportProductController::class, 'updateSortOrder']);
    Route::apiResource('support-products', SupportProductController::class);

    // Contract Types
    Route::get('contract-types/statistics', [ContractTypeController::class, 'statistics']);
    Route::post('contract-types/{id}/toggle-status', [ContractTypeController::class, 'toggleStatus']);
    Route::post('contract-types/update-sort-order', [ContractTypeController::class, 'updateSortOrder']);
    Route::apiResource('contract-types', ContractTypeController::class);

    // Contact Types (CRUD operations - protected)
    Route::post('contact-types', [ContactTypeController::class, 'store']);
    Route::get('contact-types/{contactType}', [ContactTypeController::class, 'show']);
    Route::put('contact-types/{contactType}', [ContactTypeController::class, 'update']);
    Route::delete('contact-types/{contactType}', [ContactTypeController::class, 'destroy']);

    // Designations (CRUD operations - protected)
    Route::post('designations', [DesignationController::class, 'store']);
    Route::get('designations/{designation}', [DesignationController::class, 'show']);
    Route::put('designations/{designation}', [DesignationController::class, 'update']);
    Route::delete('designations/{designation}', [DesignationController::class, 'destroy']);
    
    // Expense Categories routes
    Route::apiResource('expense-categories', ExpenseCategoryController::class);
    
    // Countries routes
    Route::post('countries', [CountryController::class, 'store']);
    Route::get('countries/{country}', [CountryController::class, 'show']);
    Route::put('countries/{country}', [CountryController::class, 'update']);
    Route::delete('countries/{country}', [CountryController::class, 'destroy']);
    Route::patch('countries/{country}/toggle-status', [CountryController::class, 'toggleStatus']);
    
    // Landed Cost Calculator routes
    Route::post('landed-cost/calculate', [LandedCostController::class, 'calculate']);
    Route::post('landed-cost/create-shipment', [LandedCostController::class, 'createShipment']);
    Route::get('landed-cost/shipments', [LandedCostController::class, 'getShipments']);
    Route::get('landed-cost/shipments/{shipment}', [LandedCostController::class, 'getShipment']);
    Route::post('landed-cost/shipments/{shipment}/update-prices', [LandedCostController::class, 'updateProductPrices']);
    
    // Shipment Management routes
    Route::apiResource('shipments', ShipmentController::class);
    
    // Audit Logs routes (admin only - add auth:sanctum middleware in production)
    Route::prefix('audit-logs')->group(function () {
        Route::get('/', [AuditLogController::class, 'index']);
        Route::get('/statistics', [AuditLogController::class, 'statistics']);
        Route::get('/recent', [AuditLogController::class, 'recentActivity']);
        Route::get('/model', [AuditLogController::class, 'modelLogs']);
        Route::get('/user/{userId}', [AuditLogController::class, 'userLogs']);
        Route::get('/timeline', [AuditLogController::class, 'timelineReport']);
        Route::get('/top-changes', [AuditLogController::class, 'topChangesReport']);
        Route::get('/{auditLog}', [AuditLogController::class, 'show']);
    });
});