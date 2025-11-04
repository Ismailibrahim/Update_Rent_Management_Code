<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Quotations
            ['name' => 'quotations.view', 'display_name' => 'View Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.create', 'display_name' => 'Create Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.edit', 'display_name' => 'Edit Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.delete', 'display_name' => 'Delete Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.send', 'display_name' => 'Send Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.approve', 'display_name' => 'Approve Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.reject', 'display_name' => 'Reject Quotations', 'category' => 'quotations'],
            ['name' => 'quotations.view_all', 'display_name' => 'View All Quotations', 'category' => 'quotations'],

            // Products
            ['name' => 'products.view', 'display_name' => 'View Products', 'category' => 'products'],
            ['name' => 'products.create', 'display_name' => 'Create Products', 'category' => 'products'],
            ['name' => 'products.edit', 'display_name' => 'Edit Products', 'category' => 'products'],
            ['name' => 'products.delete', 'display_name' => 'Delete Products', 'category' => 'products'],
            ['name' => 'products.manage_pricing', 'display_name' => 'Manage Product Pricing', 'category' => 'products'],

            // Customers
            ['name' => 'customers.view', 'display_name' => 'View Customers', 'category' => 'customers'],
            ['name' => 'customers.create', 'display_name' => 'Create Customers', 'category' => 'customers'],
            ['name' => 'customers.edit', 'display_name' => 'Edit Customers', 'category' => 'customers'],
            ['name' => 'customers.delete', 'display_name' => 'Delete Customers', 'category' => 'customers'],
            ['name' => 'customers.view_all', 'display_name' => 'View All Customers', 'category' => 'customers'],

            // Customer Contacts
            ['name' => 'customer_contacts.view', 'display_name' => 'View Customer Contacts', 'category' => 'customers'],
            ['name' => 'customer_contacts.create', 'display_name' => 'Create Customer Contacts', 'category' => 'customers'],
            ['name' => 'customer_contacts.edit', 'display_name' => 'Edit Customer Contacts', 'category' => 'customers'],
            ['name' => 'customer_contacts.delete', 'display_name' => 'Delete Customer Contacts', 'category' => 'customers'],

            // Support Contracts
            ['name' => 'support_contracts.view', 'display_name' => 'View Support Contracts', 'category' => 'support'],
            ['name' => 'support_contracts.create', 'display_name' => 'Create Support Contracts', 'category' => 'support'],
            ['name' => 'support_contracts.edit', 'display_name' => 'Edit Support Contracts', 'category' => 'support'],
            ['name' => 'support_contracts.delete', 'display_name' => 'Delete Support Contracts', 'category' => 'support'],

            // Users & Roles
            ['name' => 'users.view', 'display_name' => 'View Users', 'category' => 'system'],
            ['name' => 'users.create', 'display_name' => 'Create Users', 'category' => 'system'],
            ['name' => 'users.edit', 'display_name' => 'Edit Users', 'category' => 'system'],
            ['name' => 'users.delete', 'display_name' => 'Delete Users', 'category' => 'system'],
            ['name' => 'users.manage_roles', 'display_name' => 'Manage User Roles', 'category' => 'system'],

            // System & Settings
            ['name' => 'system.settings', 'display_name' => 'Manage System Settings', 'category' => 'system'],
            ['name' => 'system.audit_logs', 'display_name' => 'View Audit Logs', 'category' => 'system'],
            ['name' => 'system.reports', 'display_name' => 'View Reports', 'category' => 'system'],

            // Dropdown Management
            ['name' => 'dropdowns.manage', 'display_name' => 'Manage Dropdowns', 'category' => 'system'],
            ['name' => 'categories.manage', 'display_name' => 'Manage Categories', 'category' => 'system'],
            ['name' => 'quotation_statuses.manage', 'display_name' => 'Manage Quotation Statuses', 'category' => 'system'],
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                []
            );
        }

        $this->command->info('Permissions seeded successfully!');
    }
}

