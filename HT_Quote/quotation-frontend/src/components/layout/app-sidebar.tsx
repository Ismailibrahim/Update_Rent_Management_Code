"use client";

import * as React from "react";
import {
  BarChart3,
  FileText,
  Home,
  Package,
  Settings,
  Users,
  Calculator,
  TrendingUp,
  Tag,
  ClipboardList,
  Link2,
  DollarSign,
  ListChecks,
  Shield,
  Briefcase,
  Truck,
  Ship,
  Activity,
} from "lucide-react";
import { PermissionGate } from "@/components/auth/PermissionGate";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const menuItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        icon: Home,
        url: "/dashboard",
        permission: null, // Always visible
      },
      {
        title: "Analytics",
        icon: TrendingUp,
        url: "/analytics",
        permission: "system.reports",
      },
    ],
  },
  {
    title: "Quotations",
    items: [
      {
        title: "All Quotations",
        icon: FileText,
        url: "/dashboard/quotations",
        permission: "quotations.view",
      },
      {
        title: "Create Quote",
        icon: Calculator,
        url: "/dashboard/quotations/create",
        permission: "quotations.create",
      },
      {
        title: "Quotation Items",
        icon: ClipboardList,
        url: "/dashboard/quotation-items",
        permission: "quotations.view",
      },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Customers",
        icon: Users,
        url: "/dashboard/customers",
        permission: "customers.view",
      },
      {
        title: "Customer Contacts",
        icon: Users,
        url: "/dashboard/customer-contacts",
        permission: "customer_contacts.view",
      },
      {
        title: "Support Contracts",
        icon: Shield,
        url: "/dashboard/support-contracts",
        permission: "support_contracts.view",
      },
      {
        title: "Products",
        icon: Package,
        url: "/dashboard/products",
        permission: "products.view",
      },
      {
        title: "Landed Cost Calculator",
        icon: Truck,
        url: "/dashboard/landed-cost",
        permission: "products.view",
      },
      {
        title: "Shipments",
        icon: Ship,
        url: "/dashboard/shipments",
        permission: "products.view",
      },
      {
        title: "Product Cost Prices",
        icon: DollarSign,
        url: "/dashboard/product-cost-prices",
        permission: "products.manage_pricing",
      },
      {
        title: "Service Tasks",
        icon: Settings,
        url: "/dashboard/service-tasks",
        permission: "products.view",
      },
      {
        title: "Product Suggestions",
        icon: Link2,
        url: "/dashboard/product-suggestions",
        permission: "products.view",
      },
      {
        title: "Terms & Conditions",
        icon: FileText,
        url: "/dashboard/terms-conditions",
        permission: "system.settings",
      },
      {
        title: "Service Terms",
        icon: FileText,
        url: "/dashboard/service-terms",
        permission: "system.settings",
      },
    ],
  },
  {
    title: "Dropdown Management",
    items: [
      {
        title: "Contract Types",
        icon: FileText,
        url: "/dashboard/contract-types",
        permission: "dropdowns.manage",
      },
      {
        title: "Contact Types",
        icon: Tag,
        url: "/dashboard/settings/contact-types",
        permission: "dropdowns.manage",
      },
      {
        title: "Categories",
        icon: Tag,
        url: "/dashboard/categories",
        permission: "categories.manage",
      },
      {
        title: "Countries",
        icon: Tag,
        url: "/dashboard/settings/countries",
        permission: "dropdowns.manage",
      },
      {
        title: "Designations",
        icon: Briefcase,
        url: "/dashboard/settings/designations",
        permission: "dropdowns.manage",
      },
      {
        title: "Support Products",
        icon: Package,
        url: "/dashboard/support-products",
        permission: "support_contracts.view",
      },
      {
        title: "Quotation Statuses",
        icon: ListChecks,
        url: "/dashboard/quotation-statuses",
        permission: "quotation_statuses.manage",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        title: "Statistics",
        icon: BarChart3,
        url: "/reports",
        permission: "system.reports",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Users",
        icon: Users,
        url: "/dashboard/users",
        permission: "users.view",
      },
      {
        title: "Roles",
        icon: Shield,
        url: "/dashboard/roles",
        permission: "users.manage_roles",
      },
      {
        title: "Audit Logs",
        icon: Activity,
        url: "/dashboard/audit-logs",
        permission: "system.audit_logs",
      },
      {
        title: "Expense Categories",
        icon: Tag,
        url: "/dashboard/expense-categories",
        permission: "dropdowns.manage",
      },
      {
        title: "Settings",
        icon: Settings,
        url: "/dashboard/settings",
        permission: "system.settings",
      },
    ],
  },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">QuoteMS</h2>
            <p className="text-xs text-muted-foreground">Quotation System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  // If permission is null, always show the item
                  if (item.permission === null) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <a href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  
                  // Otherwise, use PermissionGate
                  return (
                    <PermissionGate
                      key={item.title}
                      permission={item.permission}
                      fallback={null}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <a href={item.url}>
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </PermissionGate>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="text-xs text-muted-foreground">
          © 2024 Quotation Management System
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}