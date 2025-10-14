'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../UI/Button';
import { 
  Building2, 
  Users, 
  Package, 
  Wrench, 
  BarChart3, 
  Settings, 
  FileText,
  Home,
  Menu,
  X,
  LogOut,
  Coins,
  CreditCard,
  HomeIcon,
  Shield,
  Receipt,
  ChevronDown,
  ChevronRight,
  Building,
  UserCheck,
  ClipboardList,
  TrendingUp,
  UserCog,
  BookOpen,
  Calculator
} from 'lucide-react';

interface SidebarProps {
  children: React.ReactNode;
}

interface NavigationGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavigationItem[];
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigationGroups: NavigationGroup[] = [
  {
    name: 'Property Management',
    icon: Building,
    items: [
      { name: 'Properties', href: '/properties', icon: Building2 },
      { name: 'Rental Units', href: '/rental-units', icon: HomeIcon },
      { name: 'Rental Unit Types', href: '/rental-unit-types', icon: Building },
      { name: 'Tenants', href: '/tenants', icon: Users },
      { name: 'Assets', href: '/assets', icon: Package },
    ]
  },
  {
    name: 'Financial Management',
    icon: ClipboardList,
    items: [
        { name: 'Invoices', href: '/invoices', icon: Receipt },
        { name: 'Rent Invoices', href: '/rent-invoices', icon: Receipt },
      { name: 'Tenant Ledger', href: '/tenant-ledger', icon: BookOpen },
      { name: 'Tenant Balances', href: '/tenant-balances', icon: Calculator },
      { name: 'Payment Types', href: '/payment-types', icon: CreditCard },
      { name: 'Payment Modes', href: '/payment-modes', icon: CreditCard },
      { name: 'Payment Records', href: '/payment-records', icon: FileText },
    ]
  },
  {
    name: 'Maintenance',
    icon: Wrench,
    items: [
      { name: 'Maintenance', href: '/maintenance', icon: Wrench },
    ]
  },
  {
    name: 'Reports',
    icon: TrendingUp,
    items: [
      { name: 'Reports', href: '/reports', icon: BarChart3 },
    ]
  },
  {
    name: 'User Management',
    icon: UserCog,
    items: [
      { name: 'Employees', href: '/employees', icon: UserCheck },
      { name: 'Roles', href: '/roles', icon: Shield },
    ]
  },
  {
    name: 'System Settings',
    icon: Settings,
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Currencies', href: '/currencies', icon: Coins },
    ]
  },
];

export default function SidebarLayout({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Property Management']));
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Auto-expand groups that contain the active link
  useEffect(() => {
    setExpandedGroups(prevExpandedGroups => {
      const newExpandedGroups = new Set(prevExpandedGroups);
      
      // Find which group contains the current active link
      navigationGroups.forEach(group => {
        const hasActiveItem = group.items.some(item => pathname === item.href);
        if (hasActiveItem) {
          newExpandedGroups.add(group.name);
        }
      });
      
      return newExpandedGroups;
    });
  }, [pathname]);

  const toggleGroup = (groupName: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (newExpandedGroups.has(groupName)) {
      newExpandedGroups.delete(groupName);
    } else {
      newExpandedGroups.add(groupName);
    }
    setExpandedGroups(newExpandedGroups);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Rent Management</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto bg-white">
            {/* Dashboard - Separate at top */}
            <div className="mb-4">
              <Link
                href="/dashboard"
                className={`
                  flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors
                  ${pathname === '/dashboard'
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <Home className="h-5 w-5 mr-3" />
                Dashboard
              </Link>
            </div>

            {/* Grouped Navigation */}
            {navigationGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.name);
              const hasActiveItem = group.items.some(item => pathname === item.href);
              
              return (
                <div key={group.name} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.name)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors
                      ${hasActiveItem
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <div className="flex items-center">
                      <group.icon className="h-4 w-4 mr-2" />
                      {group.name}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {/* Group Items */}
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {group.items.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`
                              flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors
                              ${isActive
                                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }
                            `}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon className="h-4 w-4 mr-3" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="w-full flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 lg:hidden" />
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700 hidden sm:block">
                Welcome, {user?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
