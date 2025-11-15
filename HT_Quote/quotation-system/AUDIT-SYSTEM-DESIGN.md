# Audit Log System - Design Documentation

## Overview

The Audit Log System tracks all user activities, data changes, and system events in the Quotation Management System. This comprehensive logging ensures accountability, traceability, and compliance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     User Action Layer                       │
│  (Controllers, API Endpoints, UI Actions)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Audit Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Middleware  │  │   Traits     │  │   Events     │      │
│  │ (API Logs)   │  │ (Model Logs) │  │ (Auth Logs)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  AuditLogService                            │
│  (Centralized logging logic)                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Layer                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │            audit_logs table                        │    │
│  │  - id, user_id, action, model_type, model_id      │    │
│  │  - old_values, new_values, changes                │    │
│  │  - ip_address, user_agent, request_id             │    │
│  │  - created_at, metadata                           │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## What We Track

### 1. **Authentication Events**
- ✅ User login/logout
- ✅ Failed login attempts
- ✅ Password changes
- ✅ Token generation/revocation

### 2. **Data Changes (CRUD Operations)**
- ✅ Create operations
- ✅ Update operations (with before/after values)
- ✅ Delete operations
- ✅ Soft deletes

### 3. **API Requests**
- ✅ All API endpoints accessed
- ✅ Request parameters
- ✅ Response status codes
- ✅ Request duration

### 4. **Business Actions**
- ✅ Quotation creation/updates
- ✅ Customer modifications
- ✅ Product changes
- ✅ Settings updates
- ✅ Status changes

### 5. **File Operations**
- ✅ File uploads
- ✅ File deletions
- ✅ Logo uploads

### 6. **System Events**
- ✅ Bulk operations
- ✅ Import/export operations
- ✅ Data migrations
- ✅ Scheduled tasks

## Database Schema

### audit_logs Table

| Column | Type | Description |
|--------|------|-------------|
| id | bigint | Primary key |
| user_id | bigint | User who performed the action (nullable) |
| action | string | Action type (created, updated, deleted, viewed, etc.) |
| model_type | string | Model class name (nullable) |
| model_id | bigint | Model instance ID (nullable) |
| old_values | json | Previous state (for updates/deletes) |
| new_values | json | New state (for creates/updates) |
| changes | json | Diff of changed fields |
| description | text | Human-readable description |
| ip_address | string | IP address |
| user_agent | text | Browser/client info |
| request_id | string | Unique request identifier |
| route | string | Route name/endpoint |
| method | string | HTTP method (GET, POST, etc.) |
| url | string | Full request URL |
| response_status | integer | HTTP response code |
| execution_time | decimal | Request duration in ms |
| metadata | json | Additional context data |
| created_at | timestamp | Log timestamp |
| updated_at | timestamp | Updated timestamp |

## Implementation Strategy

### 1. **Middleware (Automatic API Logging)**
- Intercept all API requests
- Log request/response details
- Track execution time

### 2. **Model Trait (Automatic Model Auditing)**
- Track model changes automatically
- Compare old vs new values
- Generate change diffs

### 3. **Service Class (Centralized Logging)**
- Unified logging interface
- Standardized log format
- Batch logging support

### 4. **Event Listeners (System Events)**
- Listen to Laravel events
- Log authentication events
- Track system-level actions

## Action Types

| Action | Description | Triggers |
|--------|-------------|----------|
| `created` | New record created | Model::create(), Model::save() |
| `updated` | Record updated | Model::update(), Model::save() |
| `deleted` | Record deleted | Model::delete() |
| `restored` | Soft-deleted record restored | Model::restore() |
| `viewed` | Record viewed | GET requests, show() methods |
| `exported` | Data exported | Export operations |
| `imported` | Data imported | Import operations |
| `login` | User logged in | Authentication |
| `logout` | User logged out | Authentication |
| `password_changed` | Password updated | Password reset |
| `status_changed` | Status field changed | Specific field updates |
| `bulk_update` | Multiple records updated | Bulk operations |
| `bulk_delete` | Multiple records deleted | Bulk operations |

## Performance Considerations

### 1. **Async Logging**
- Queue audit logs for better performance
- Don't block user requests

### 2. **Indexing**
- Index on `user_id`, `model_type`, `action`, `created_at`
- Composite indexes for common queries

### 3. **Archiving**
- Archive old logs (>90 days) to separate table
- Keep active logs in main table for quick access

### 4. **Filtering**
- Only log significant changes (avoid noise)
- Configurable log levels

## Security & Privacy

### 1. **Sensitive Data**
- Hash sensitive fields (passwords, tokens)
- Don't log credit card numbers, SSNs
- Configurable field exclusions

### 2. **Access Control**
- Only admins can view audit logs
- Audit log of audit log access (meta-auditing)

### 3. **Retention Policy**
- Configurable retention periods
- Automatic cleanup of old logs

## Usage Examples

### 1. Automatic Model Auditing
```php
class Product extends Model
{
    use Auditable; // Automatic logging
}
```

### 2. Manual Logging
```php
AuditLogService::log('created', $product, [
    'description' => 'Product created via API',
    'metadata' => ['source' => 'import']
]);
```

### 3. Querying Logs
```php
// Get all logs for a user
$logs = AuditLog::where('user_id', $userId)->get();

// Get all changes to a specific product
$logs = AuditLog::where('model_type', Product::class)
    ->where('model_id', $productId)
    ->get();

// Get recent activity
$logs = AuditLog::recent(24)->get(); // Last 24 hours
```

## Frontend Integration

### Audit Log View Page
- **Dashboard** showing recent activity
- **Filters** by user, action, model, date range
- **Detailed View** showing before/after changes
- **Export** functionality
- **Search** capabilities

## Benefits

✅ **Accountability** - Track who did what and when
✅ **Debugging** - Understand what happened before issues
✅ **Compliance** - Meet regulatory requirements
✅ **Security** - Detect suspicious activities
✅ **Analytics** - Understand user behavior patterns
✅ **Recovery** - Revert mistakes using audit data

## Implementation Priority

1. **Phase 1**: Core infrastructure (migration, model, service)
2. **Phase 2**: Automatic model auditing (trait)
3. **Phase 3**: API request logging (middleware)
4. **Phase 4**: Authentication event logging
5. **Phase 5**: Frontend interface
6. **Phase 6**: Advanced features (archiving, analytics)

