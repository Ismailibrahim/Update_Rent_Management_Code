# 🔐 User Rights & Permissions System - Design Document

## Overview
This document outlines the design and implementation of a comprehensive Role-Based Access Control (RBAC) system for the Quotation Management Application.

## Architecture Decision

### Option 1: Laravel Built-in (Recommended for Medium Projects)
- **Pros**: No dependencies, full control, lightweight, built into Laravel
- **Cons**: More setup code required
- **Best for**: Projects with 5-20 roles and 20-100 permissions

### Option 2: Spatie Laravel Permission (Recommended for Complex Projects)
- **Pros**: Feature-rich, tested, easy to use, supports roles + permissions
- **Cons**: External dependency
- **Best for**: Projects with complex permission hierarchies

### Recommendation: **Laravel Built-in (Option 1)**
Since you already have audit logging and a clean structure, we'll implement a custom RBAC system that integrates seamlessly with your existing code.

---

## Database Schema

### 1. Roles Table
```sql
CREATE TABLE roles (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,              -- e.g., 'admin', 'manager', 'sales_rep'
    display_name VARCHAR(100) NOT NULL,            -- e.g., 'Administrator', 'Sales Manager'
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

### 2. Permissions Table
```sql
CREATE TABLE permissions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,             -- e.g., 'quotations.create', 'products.delete'
    display_name VARCHAR(100) NOT NULL,            -- e.g., 'Create Quotations'
    description TEXT NULL,
    category VARCHAR(50) NULL,                     -- e.g., 'quotations', 'products', 'customers'
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
```

### 3. Role Permissions (Pivot Table)
```sql
CREATE TABLE role_permissions (
    role_id BIGINT UNSIGNED,
    permission_id BIGINT UNSIGNED,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

### 4. User Roles (Pivot Table)
```sql
CREATE TABLE user_roles (
    user_id BIGINT UNSIGNED,
    role_id BIGINT UNSIGNED,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5. Update Users Table
Keep existing `role` column for backward compatibility, but prioritize `user_roles` table.

---

## Permission Structure

### Recommended Permissions by Module

#### Quotations
- `quotations.view`
- `quotations.create`
- `quotations.edit`
- `quotations.delete`
- `quotations.send`
- `quotations.approve`
- `quotations.reject`
- `quotations.view_all` (see all quotations regardless of creator)

#### Products
- `products.view`
- `products.create`
- `products.edit`
- `products.delete`
- `products.manage_pricing`

#### Customers
- `customers.view`
- `customers.create`
- `customers.edit`
- `customers.delete`
- `customers.view_all`

#### Users & System
- `users.view`
- `users.create`
- `users.edit`
- `users.delete`
- `users.manage_roles`
- `system.settings`
- `system.audit_logs`
- `system.reports`

#### Support Contracts
- `support_contracts.view`
- `support_contracts.create`
- `support_contracts.edit`
- `support_contracts.delete`

---

## Role Definitions

### 1. Super Admin
- **Purpose**: Full system access
- **Permissions**: All permissions
- **Use Case**: System administrators, developers

### 2. Administrator
- **Purpose**: Day-to-day administration
- **Permissions**: All except `system.settings` (some critical settings)
- **Use Case**: Office managers, senior staff

### 3. Sales Manager
- **Purpose**: Manage sales team and quotations
- **Permissions**:
  - All quotation permissions
  - View all customers
  - View products
  - View reports
  - Manage own team

### 4. Sales Representative
- **Purpose**: Create and manage quotations
- **Permissions**:
  - Create/edit own quotations
  - View assigned customers
  - View products
  - View own reports

### 5. Operations Manager
- **Purpose**: Manage products and support
- **Permissions**:
  - Full product management
  - Support contracts management
  - View quotations (read-only)
  - View reports

### 6. Accountant/Finance
- **Purpose**: View financial data
- **Permissions**:
  - View all quotations (read-only)
  - View reports
  - View customers (read-only)
  - View products (read-only)

### 7. Viewer
- **Purpose**: Read-only access
- **Permissions**: View-only permissions for all modules

---

## Implementation Components

### Backend (Laravel)

#### 1. Models
- `Role` model
- `Permission` model
- Update `User` model with relationships

#### 2. Middleware
- `CheckPermission` middleware
- `CheckRole` middleware

#### 3. Service Classes
- `PermissionService` - Handle permission checks
- `RoleService` - Handle role management

#### 4. Controllers
- `RoleController` - CRUD for roles
- `PermissionController` - View/manage permissions
- Update existing controllers with permission checks

#### 5. Policies (Optional but Recommended)
- `QuotationPolicy`
- `ProductPolicy`
- `CustomerPolicy`
- etc.

#### 6. Seeders
- Default roles seeder
- Default permissions seeder
- Assign permissions to roles

### Frontend (Next.js)

#### 1. Permission Hooks
- `usePermissions()` - Get user permissions
- `useHasPermission()` - Check specific permission
- `useHasRole()` - Check user role

#### 2. Permission Components
- `PermissionGate` - Show/hide UI based on permissions
- `RoleGate` - Show/hide UI based on roles

#### 3. API Integration
- Load user permissions on login
- Cache permissions in localStorage/context
- Refresh permissions on role change

#### 4. Route Protection
- Protect routes based on permissions
- Redirect unauthorized users
- Show appropriate error messages

---

## Security Considerations

### 1. Principle of Least Privilege
- Users get minimum permissions needed
- Regular audit of permissions
- Remove unused permissions

### 2. Permission Validation
- **Always validate on backend** - Frontend checks are for UX only
- Backend should reject unauthorized requests
- Log permission denied attempts

### 3. Audit Integration
- Log all permission checks
- Track permission changes
- Monitor unauthorized access attempts

### 4. Token Management
- Permissions included in token response
- Refresh permissions when roles change
- Invalidate tokens on permission revocation

---

## API Endpoints

### Roles
- `GET /api/roles` - List all roles
- `POST /api/roles` - Create role
- `GET /api/roles/{id}` - Get role with permissions
- `PUT /api/roles/{id}` - Update role
- `DELETE /api/roles/{id}` - Delete role
- `POST /api/roles/{id}/permissions` - Assign permissions to role

### Permissions
- `GET /api/permissions` - List all permissions
- `GET /api/permissions/by-category` - Grouped by category

### Users & Roles
- `GET /api/users/{id}/roles` - Get user roles
- `POST /api/users/{id}/roles` - Assign roles to user
- `DELETE /api/users/{id}/roles/{roleId}` - Remove role from user
- `GET /api/users/{id}/permissions` - Get user's effective permissions

### Current User
- `GET /api/auth/me` - Include permissions in response

---

## Frontend Implementation

### Permission Context
```typescript
interface PermissionContext {
  permissions: string[];
  roles: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}
```

### Usage Examples

#### Hide/Show Components
```tsx
<PermissionGate permission="quotations.create">
  <Button onClick={createQuotation}>Create Quote</Button>
</PermissionGate>
```

#### Conditional Rendering
```tsx
const canEdit = hasPermission('quotations.edit');
return (
  <Button disabled={!canEdit}>Edit</Button>
);
```

#### Route Protection
```tsx
if (!hasPermission('quotations.view')) {
  router.push('/unauthorized');
}
```

---

## Migration Strategy

### Phase 1: Database Setup (Week 1)
1. Create migrations for roles, permissions, pivot tables
2. Create seeders with default data
3. Run migrations and seeders

### Phase 2: Backend Implementation (Week 1-2)
1. Create models and relationships
2. Create middleware and service classes
3. Update controllers with permission checks
4. Add API endpoints

### Phase 3: Frontend Integration (Week 2)
1. Create permission hooks and components
2. Update login to fetch permissions
3. Protect routes and components
4. Add permission checks to UI elements

### Phase 4: Testing & Refinement (Week 2-3)
1. Test all permission scenarios
2. Audit existing users and assign roles
3. Train users on new system
4. Monitor and refine

---

## Benefits

1. **Security**: Granular control over who can do what
2. **Scalability**: Easy to add new roles and permissions
3. **Compliance**: Audit trail of all access
4. **Flexibility**: Users can have multiple roles
5. **Maintainability**: Centralized permission management
6. **User Experience**: Clear boundaries and expectations

---

## Next Steps

1. Review and approve this design
2. Create database migrations
3. Implement backend components
4. Implement frontend components
5. Test thoroughly
6. Deploy gradually





