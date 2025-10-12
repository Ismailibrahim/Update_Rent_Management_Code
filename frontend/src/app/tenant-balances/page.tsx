'use client';

import { useState, useEffect } from 'react';
import { tenantLedgerAPI, Tenant } from '@/services/api';
import { Card } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { DollarSign, TrendingUp, TrendingDown, Users, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface TenantBalance {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  current_balance: number;
  balance_status: 'outstanding' | 'credit' | 'balanced';
}

export default function TenantBalanceSummary() {
  const [tenantBalances, setTenantBalances] = useState<TenantBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    balance_status: '',
    search: '',
  });

  useEffect(() => {
    loadTenantBalances();
  }, [filters]);

  const loadTenantBalances = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      
      const response = await tenantLedgerAPI.getAllTenantBalances(params);
      setTenantBalances(response.data.data || []);
    } catch (error) {
      console.error('Error loading tenant balances:', error);
      toast.error('Failed to load tenant balances');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-red-600';
    if (balance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (balance < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <DollarSign className="h-4 w-4 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case 'suspended':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getBalanceStatusBadge = (balanceStatus: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (balanceStatus) {
      case 'outstanding':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'credit':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'balanced':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const totalOutstanding = tenantBalances
    .filter(tenant => tenant.balance_status === 'outstanding')
    .reduce((sum, tenant) => sum + tenant.current_balance, 0);

  const totalCredit = tenantBalances
    .filter(tenant => tenant.balance_status === 'credit')
    .reduce((sum, tenant) => sum + Math.abs(tenant.current_balance), 0);

  const outstandingCount = tenantBalances.filter(tenant => tenant.balance_status === 'outstanding').length;

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenant Balances</h1>
            <p className="mt-2 text-gray-600">
              Overview of all tenant financial balances
            </p>
          </div>
        </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(totalOutstanding)}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Credit</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCredit)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <TrendingDown className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding Tenants</p>
              <p className="text-2xl font-bold text-orange-600">
                {outstandingCount}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-blue-600">
                {tenantBalances.length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <Input
              placeholder="Search by name, email, or phone..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Balance Status</label>
            <Select
              value={filters.balance_status}
              onChange={(e) => setFilters(prev => ({ ...prev, balance_status: e.target.value }))}
            >
              <option value="">All Balances</option>
              <option value="outstanding">Outstanding</option>
              <option value="credit">Credit</option>
              <option value="balanced">Balanced</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tenant Balances Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : tenantBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No tenant balances found
                  </td>
                </tr>
              ) : (
                tenantBalances.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {tenant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenant.email}</div>
                      <div className="text-sm text-gray-500">{tenant.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(tenant.status)}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getBalanceIcon(tenant.current_balance)}
                        <span className={`text-sm font-medium ${getBalanceColor(tenant.current_balance)}`}>
                          {formatCurrency(tenant.current_balance)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getBalanceStatusBadge(tenant.balance_status)}>
                        {tenant.balance_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    </SidebarLayout>
  );
}
