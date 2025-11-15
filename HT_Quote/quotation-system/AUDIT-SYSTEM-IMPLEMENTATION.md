# Audit Log System - Implementation Guide

## Overview

This guide explains how to use the comprehensive audit log system that tracks all user activities and data changes in your application.

## Installation Steps

### 1. Run the Migration

```bash
cd quotation-system
php artisan migrate
```

This will create the `audit_logs` table with all necessary indexes.

### 2. Enable Auditing on Models

To automatically track changes on a model, simply add the `Auditable` trait:

```php
use App\Traits\Auditable;

class Product extends Model
{
    use Auditable;
    // ... rest of your model
}
```

**Models with Auditing Enabled:**

The following models should use the `Auditable` trait for automatic tracking:
- `Product`
- `Customer`
- `Quotation`
- `QuotationItem`
- `User`
- `ProductCategory`
- `ServiceTermsTemplate`
- `TermsConditionsTemplate`
- `SystemSetting`

### 3. Test the System

After running migrations, test the audit logging:

```bash
# Create a product (will be logged automatically)
php artisan tinker
>>> $product = App\Models\Product::create([...]);
>>> $product->auditLogs // View logs for this product
```

## Usage Examples

### 1. Automatic Model Auditing

Once you add the `Auditable` trait to a model, all CRUD operations are automatically logged:

```php
// This will automatically log a 'created' action
$product = Product::create([
    'name' => 'New Product',
    'price' => 100,
]);

// This will automatically log an 'updated' action with before/after values
$product->update(['price' => 120]);

// This will automatically log a 'deleted' action
$product->delete();
```

### 2. Manual Logging

For custom actions or when you need more control:

```php
use App\Services\AuditLogService;

// Log a custom action
AuditLogService::log('exported', $product, [
    'description' => 'Product data exported to Excel',
    'metadata' => ['format' => 'xlsx', 'rows' => 100],
]);

// Log a view action
AuditLogService::logViewed($quotation, [
    'description' => 'Quotation viewed in print preview',
]);

// Log with custom data
AuditLogService::log('status_changed', $quotation, [
    'old_values' => ['status' => 'draft'],
    'new_values' => ['status' => 'sent'],
    'description' => 'Quotation status changed to sent',
]);
```

### 3. Authentication Events

Authentication events are automatically logged via the `AuthController`. The following actions are tracked:
- ✅ User login (success)
- ✅ Login failures
- ✅ User logout
- ✅ User registration

### 4. API Request Logging

All API requests are automatically logged via the `AuditRequestMiddleware`. Each request logs:
- Request method and URL
- Response status code
- Execution time
- User who made the request
- IP address and user agent

## Viewing Audit Logs

### Via API

```bash
# Get all audit logs (paginated)
GET /api/audit-logs

# Filter by user
GET /api/audit-logs?user_id=1

# Filter by action
GET /api/audit-logs?action=created

# Filter by model
GET /api/audit-logs?model_type=App\Models\Product&model_id=5

# Get recent activity (last 24 hours)
GET /api/audit-logs/recent?hours=24

# Get statistics
GET /api/audit-logs/statistics?start_date=2025-01-01&end_date=2025-01-31

# Get logs for a specific model
GET /api/audit-logs/model?model_type=App\Models\Product&model_id=5

# Get logs for a specific user
GET /api/audit-logs/user/1
```

### Via Code

```php
use App\Models\AuditLog;

// Get all logs for a product
$logs = AuditLog::forModel(Product::class, $productId)->get();

// Get logs for a user
$logs = AuditLog::forUser($userId)->get();

// Get recent activity
$logs = AuditLog::recent(24)->get(); // Last 24 hours

// Get specific action logs
$logs = AuditLog::forAction('created')->get();

// Get changes diff for an update
$log = AuditLog::find($logId);
$changes = $log->getChangesDiff();
```

## Query Examples

### Get all product changes in the last week

```php
$logs = AuditLog::forModel(Product::class)
    ->where('created_at', '>=', now()->subWeek())
    ->get();
```

### Get all failed login attempts

```php
$logs = AuditLog::forAction('login_failed')
    ->recent(24)
    ->get();
```

### Get activity by a specific user today

```php
$logs = AuditLog::forUser($userId)
    ->whereDate('created_at', today())
    ->orderBy('created_at', 'desc')
    ->get();
```

## Frontend Integration

### 1. Create Audit Logs Page

Create a page at `quotation-frontend/src/app/dashboard/audit-logs/page.tsx` to display audit logs.

Example API calls:

```typescript
// Fetch audit logs
const response = await api.get('/audit-logs', {
  params: {
    user_id: selectedUserId,
    action: selectedAction,
    start_date: startDate,
    end_date: endDate,
    per_page: 50
  }
});

// Fetch statistics
const stats = await api.get('/audit-logs/statistics', {
  params: {
    start_date: startDate,
    end_date: endDate
  }
});

// Fetch recent activity
const recent = await api.get('/audit-logs/recent', {
  params: {
    hours: 24,
    limit: 100
  }
});
```

## Performance Considerations

### 1. Queue Audit Logs (Recommended)

For better performance, you can queue audit logs:

```php
// In AuditLogService, use queued jobs
dispatch(new LogAuditAction($data));
```

### 2. Archive Old Logs

Create a command to archive logs older than 90 days:

```bash
php artisan make:command ArchiveAuditLogs
```

### 3. Indexes

The migration includes indexes on:
- `user_id`
- `model_type`, `model_id`
- `action`
- `created_at`
- Composite indexes for common queries

## Security

### 1. Sensitive Data

The `AuditLogService` automatically redacts sensitive fields:
- Passwords
- API tokens
- Credit card numbers
- CVV codes
- SSNs

### 2. Access Control

Protect audit log routes in production:

```php
// In routes/api.php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::prefix('audit-logs')->group(function () {
        // ... audit log routes
    });
});
```

## Troubleshooting

### Logs Not Appearing

1. Check if migration ran: `php artisan migrate:status`
2. Check if model has `Auditable` trait
3. Check Laravel logs for errors: `storage/logs/laravel.log`
4. Verify middleware is registered in `bootstrap/app.php`

### Performance Issues

1. Enable queued logging
2. Archive old logs regularly
3. Add more specific indexes if needed
4. Consider filtering out noisy actions

## Next Steps

1. ✅ Run migration
2. ✅ Add `Auditable` trait to key models
3. ✅ Test logging with sample operations
4. ✅ Create frontend page for viewing logs
5. ✅ Set up log archiving
6. ✅ Configure access control
7. ✅ Set up monitoring alerts for suspicious activities

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | List all audit logs (with filters) |
| GET | `/api/audit-logs/{id}` | Get specific audit log |
| GET | `/api/audit-logs/recent` | Get recent activity |
| GET | `/api/audit-logs/model` | Get logs for a model |
| GET | `/api/audit-logs/user/{userId}` | Get logs for a user |
| GET | `/api/audit-logs/statistics` | Get audit statistics |

## Support

For issues or questions:
1. Check the design document: `AUDIT-SYSTEM-DESIGN.md`
2. Review Laravel logs
3. Test with simple operations first
4. Verify database structure matches migration

