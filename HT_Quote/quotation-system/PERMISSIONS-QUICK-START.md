# 🚀 Permissions System - Quick Start Guide

## ✅ **Implementation Complete!**

Your permission system is now fully functional. Here's how to use it:

---

## 📋 **Step 1: Assign Roles to Users**

### Via Tinker (Recommended for First User)
```bash
php artisan tinker
```

```php
$user = \App\Models\User::first();
$user->assignRole('super_admin');
```

### Via API
```bash
POST /api/users/{userId}/roles
{
  "roles": ["super_admin", "administrator"]
}
```

---

## 🎯 **Step 2: Use Permissions in Backend**

### In Routes
```php
Route::middleware(['auth:sanctum', 'permission:quotations.create'])->group(function () {
    Route::post('/quotations', [QuotationController::class, 'store']);
});
```

### In Controllers
```php
public function store(Request $request)
{
    if (!$request->user()->can('quotations.create')) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    // ... your code
}
```

---

## 🎨 **Step 3: Use Permissions in Frontend**

### Hide/Show Components
```tsx
import { PermissionGate } from "@/components/auth/PermissionGate";

<PermissionGate permission="quotations.create">
  <Button onClick={createQuote}>Create Quote</Button>
</PermissionGate>
```

### In Code
```tsx
import { useHasPermission } from "@/hooks/usePermissions";

function MyComponent() {
  const canEdit = useHasPermission('quotations.edit');
  
  return (
    <Button disabled={!canEdit}>
      Edit
    </Button>
  );
}
```

### Check Multiple Permissions
```tsx
<PermissionGate 
  permissions={['quotations.edit', 'quotations.delete']}
  requireAll={false} // user needs ANY of these
>
  <Button>Action</Button>
</PermissionGate>
```

---

## 📊 **Available Roles**

1. **super_admin** - Full access (37 permissions)
2. **administrator** - Almost full access (37 permissions)
3. **sales_manager** - Manage sales (20 permissions)
4. **sales_representative** - Create quotes (12 permissions)
5. **operations_manager** - Manage products (13 permissions)
6. **accountant** - View financial data (6 permissions)
7. **viewer** - Read-only (4 permissions)

---

## 🔧 **API Endpoints**

### Roles
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `PUT /api/roles/{id}` - Update role
- `DELETE /api/roles/{id}` - Delete role
- `POST /api/roles/{id}/permissions` - Assign permissions

### Users & Roles
- `GET /api/users/{id}/roles` - Get user roles
- `POST /api/users/{id}/roles` - Assign roles
- `DELETE /api/users/{id}/roles` - Remove role

### Permissions
- `GET /api/permissions` - List all permissions
- `GET /api/permissions?group_by_category=true` - Grouped by category

---

## ⚙️ **Maintenance**

### Clear Permission Cache
```bash
php artisan permission:cache-reset
```

### Refresh Permissions After Changes
In frontend, call:
```tsx
const { refreshPermissions } = usePermissions();
await refreshPermissions();
```

---

## 🧪 **Testing**

### Test Permission Check
```php
$user = User::find(1);
$user->can('quotations.create'); // true/false
$user->hasRole('admin'); // true/false
```

### Test Middleware
Add to any route:
```php
Route::middleware(['auth:sanctum', 'permission:quotations.view'])->get('/test', function () {
    return 'Access granted!';
});
```

---

## 📝 **Next Steps**

1. ✅ Assign `super_admin` role to your user
2. ✅ Protect sensitive routes with permission middleware
3. ✅ Update UI components to use `<PermissionGate>`
4. ✅ Test permission checks thoroughly
5. ✅ Assign appropriate roles to existing users

---

## 🎉 **You're Ready!**

The permission system is fully operational. Start protecting your routes and UI elements now!





