<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create roles
        $roles = [
            [
                'name' => 'super_admin',
                'display_name' => 'Super Administrator',
                'description' => 'Full system access with all permissions',
                'permissions' => ['*'], // All permissions
            ],
            [
                'name' => 'administrator',
                'display_name' => 'Administrator',
                'description' => 'Day-to-day administration with most permissions',
                'permissions' => [
                    // Quotations
                    'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.delete',
                    'quotations.send', 'quotations.approve', 'quotations.reject', 'quotations.view_all',
                    // Products
                    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage_pricing',
                    // Customers
                    'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.view_all',
                    'customer_contacts.view', 'customer_contacts.create', 'customer_contacts.edit', 'customer_contacts.delete',
                    // Support
                    'support_contracts.view', 'support_contracts.create', 'support_contracts.edit', 'support_contracts.delete',
                    // Users
                    'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
                    // System
                    'system.audit_logs', 'system.reports', 'system.settings',
                    // Dropdowns
                    'dropdowns.manage', 'categories.manage', 'quotation_statuses.manage',
                ],
            ],
            [
                'name' => 'sales_manager',
                'display_name' => 'Sales Manager',
                'description' => 'Manage sales team and quotations',
                'permissions' => [
                    // Quotations - Full access
                    'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.delete',
                    'quotations.send', 'quotations.approve', 'quotations.reject', 'quotations.view_all',
                    // Customers - View all
                    'customers.view', 'customers.create', 'customers.edit', 'customers.view_all',
                    'customer_contacts.view', 'customer_contacts.create', 'customer_contacts.edit',
                    // Products - View only
                    'products.view',
                    // Support
                    'support_contracts.view', 'support_contracts.create', 'support_contracts.edit',
                    // Reports
                    'system.reports',
                ],
            ],
            [
                'name' => 'sales_representative',
                'display_name' => 'Sales Representative',
                'description' => 'Create and manage own quotations',
                'permissions' => [
                    // Quotations - Own only (no view_all)
                    'quotations.view', 'quotations.create', 'quotations.edit', 'quotations.send',
                    // Customers - Limited
                    'customers.view', 'customers.create', 'customers.edit',
                    'customer_contacts.view', 'customer_contacts.create', 'customer_contacts.edit',
                    // Products - View only
                    'products.view',
                    // Support - View only
                    'support_contracts.view',
                ],
            ],
            [
                'name' => 'operations_manager',
                'display_name' => 'Operations Manager',
                'description' => 'Manage products and support contracts',
                'permissions' => [
                    // Products - Full access
                    'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage_pricing',
                    // Support - Full access
                    'support_contracts.view', 'support_contracts.create', 'support_contracts.edit', 'support_contracts.delete',
                    // Quotations - View only
                    'quotations.view',
                    // Customers - View only
                    'customers.view',
                    // Reports
                    'system.reports',
                    // Categories
                    'categories.manage',
                ],
            ],
            [
                'name' => 'accountant',
                'display_name' => 'Accountant/Finance',
                'description' => 'View financial data and reports',
                'permissions' => [
                    // Quotations - View all (read-only)
                    'quotations.view', 'quotations.view_all',
                    // Customers - View all (read-only)
                    'customers.view', 'customers.view_all',
                    // Products - View only
                    'products.view',
                    // Reports
                    'system.reports',
                ],
            ],
            [
                'name' => 'viewer',
                'display_name' => 'Viewer',
                'description' => 'Read-only access to all modules',
                'permissions' => [
                    'quotations.view',
                    'products.view',
                    'customers.view',
                    'support_contracts.view',
                ],
            ],
        ];

        foreach ($roles as $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                []
            );

            // Assign all permissions to super_admin
            if ($roleData['permissions'] === ['*']) {
                $permissions = Permission::all();
                $role->syncPermissions($permissions);
            } else {
                // Assign specific permissions
                $permissions = Permission::whereIn('name', $roleData['permissions'])->get();
                $role->syncPermissions($permissions);
            }

            $this->command->info("Role '{$roleData['display_name']}' created with " . count($role->permissions) . " permissions");
        }

        $this->command->info('Roles seeded successfully!');
    }
}

