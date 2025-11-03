'use client';

import React, { useState, useEffect } from 'react';
import { tenantLedgerAPI, tenantsAPI, paymentTypesAPI, TenantLedger, Tenant, PaymentType } from '@/services/api';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, RefreshCw, DollarSign, Users, FileText, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

export default function TenantLedgerPage() {
  const router = useRouter();
  const [ledgerEntries, setLedgerEntries] = useState<TenantLedger[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Multi-selection state
  const [selectedEntries, setSelectedEntries] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    tenant_id: '',
    payment_type_id: '',
    transaction_type: '',
    start_date: '',
    end_date: '',
    search: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, [filters, pagination.current_page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, paymentTypesRes] = await Promise.all([
        tenantsAPI.getAll(),
        paymentTypesAPI.getAll(),
      ]);

      const tenantsData = tenantsRes.data?.tenants || [];
      const paymentTypesData = paymentTypesRes.data?.payment_types || [];

      setTenants(tenantsData);
      setPaymentTypes(paymentTypesData);

      // Load ledger entries with filters
      const params = {
        page: pagination.current_page,
        per_page: pagination.per_page,
        ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')),
      };

      const response = await tenantLedgerAPI.getAll(params);
      
      // Ensure we have an array of ledger entries
      const ledgerData = response.data?.data?.data || response.data?.data || [];
      setLedgerEntries(Array.isArray(ledgerData) ? ledgerData : []);
      
      // Handle pagination metadata
      if (response.data?.data?.meta || response.data?.meta) {
        const meta = response.data?.data?.meta || response.data?.meta;
        setPagination(prev => ({
          ...prev,
          current_page: meta.current_page || 1,
          last_page: meta.last_page || 1,
          total: meta.total || 0,
        }));
      }
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      const axiosError = error as { response?: { status?: number; data?: unknown } };
      console.error('Error details:', axiosError.response?.data);
      
      // Set empty array to prevent map error
      setLedgerEntries([]);
      
      // Show appropriate error message
      if (axiosError.response?.status === 401) {
        toast.error('Please log in to access ledger entries');
      } else if (axiosError.response?.status === 500) {
        toast.error('Server error. Please try again later.');
      } else {
        toast.error('Failed to load ledger entries');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: TenantLedger) => {
    // Navigate to edit page (you can create an edit page later)
    router.push(`/tenant-ledger/edit/${entry.ledger_id}`);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ledger entry?')) return;

    try {
      await tenantLedgerAPI.delete(id);
      toast.success('Ledger entry deleted successfully');
      loadData();
    } catch (error: unknown) {
      console.error('Error deleting ledger entry:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to delete ledger entry');
    }
  };

  const handleNewEntry = () => {
    router.push('/tenant-ledger/new');
  };

  // Multi-selection handlers
  const handleSelectEntry = (entryId: number) => {
    setSelectedEntries(prev => {
      const newSelection = prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allIds = sortEntriesByUnit(ledgerEntries).map(entry => entry.ledger_id);
    setSelectedEntries(allIds);
    setShowBulkActions(true);
  };

  const handleDeselectAll = () => {
    setSelectedEntries([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedEntries.length} ledger entries?`)) return;

    try {
      await Promise.all(selectedEntries.map(id => tenantLedgerAPI.delete(id)));
      toast.success(`${selectedEntries.length} ledger entries deleted successfully`);
      setSelectedEntries([]);
      setShowBulkActions(false);
      loadData();
    } catch (error: unknown) {
      console.error('Error deleting ledger entries:', error);
      toast.error('Failed to delete some ledger entries');
    }
  };

  const handleBulkExport = () => {
    if (selectedEntries.length === 0) return;
    
    const selectedData = ledgerEntries.filter(entry => 
      selectedEntries.includes(entry.ledger_id)
    );
    
    // Create CSV content
    const headers = ['ID', 'Date', 'Tenant', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'];
    const csvContent = [
      headers.join(','),
      ...selectedData.map(entry => [
        entry.ledger_id,
        new Date(entry.transaction_date).toLocaleDateString(),
        entry.tenant?.full_name || 'N/A',
        entry.description,
        entry.reference_no || '',
        entry.debit_amount,
        entry.credit_amount,
        entry.balance
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-entries-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedEntries.length} entries to CSV`);
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return 'MVR 0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MVR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRentalUnitDisplay = (entry: TenantLedger) => {
    if (entry.rental_unit) {
      const unitNumber = entry.rental_unit.unit_number || 'N/A';
      const propertyName = entry.rental_unit.property?.name || 'Unknown Property';
      return `${propertyName} - Unit ${unitNumber}`;
    }
    
    return 'No Unit Assigned';
  };

  // Removed unused functions: getRentalUnitNumber, getTransactionTypeIcon, getBalanceColor

  const isPaidEntry = (entry: TenantLedger) => {
    // Check if this entry represents a paid invoice
    // Paid entries typically have credit amounts and reference invoice numbers
    return entry.credit_amount > 0 && entry.reference_no && entry.reference_no.includes('INV-');
  };

  const isIncludedUnit = (entry: TenantLedger) => {
    const unitDisplay = getRentalUnitDisplay(entry);
    return (unitDisplay.includes('Huvandhugadhakoalhige') && (unitDisplay.includes('101') || unitDisplay.includes('201') || unitDisplay.includes('301'))) ||
           (unitDisplay.includes('Park Lane') && unitDisplay.includes('102'));
  };


  const sortEntriesByUnit = (entries: TenantLedger[]) => {
    return [...entries].sort((a, b) => {
      const unitDisplayA = getRentalUnitDisplay(a);
      const unitDisplayB = getRentalUnitDisplay(b);
      
      // Extract property name and unit number for proper sorting
      const extractPropertyAndUnit = (unitDisplay: string) => {
        if (unitDisplay === 'No Unit Assigned') {
          return { property: 'ZZZ', unit: '999' }; // Put unassigned units at the end
        }
        
        // Extract property name and unit number
        const parts = unitDisplay.split(' - Unit ');
        if (parts.length === 2) {
          return { property: parts[0], unit: parts[1] };
        }
        
        // Fallback for other formats
        return { property: unitDisplay, unit: '000' };
      };
      
      const { property: propA, unit: unitNumA } = extractPropertyAndUnit(unitDisplayA);
      const { property: propB, unit: unitNumB } = extractPropertyAndUnit(unitDisplayB);
      
      // First sort by property name, then by unit number
      if (propA !== propB) {
        return propA.localeCompare(propB);
      }
      
      // If same property, sort by unit number (numeric comparison)
      const unitANum = parseInt(unitNumA) || 0;
      const unitBNum = parseInt(unitNumB) || 0;
      return unitANum - unitBNum;
    });
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!Array.isArray(ledgerEntries) || ledgerEntries.length === 0) {
      return {
        totalTransactions: 0,
        totalDebits: 0,
        totalCredits: 0,
        uniqueTenants: 0,
        averageBalance: 0,
        outstandingBalance: 0,
        creditBalance: 0
      };
    }

    const totalTransactions = ledgerEntries.length;
    
    // Safely calculate totals with proper number validation
    const totalDebits = ledgerEntries.reduce((sum, entry) => {
      const amount = Number(entry.debit_amount) || 0;
      return sum + amount;
    }, 0);
    
    const totalCredits = ledgerEntries.reduce((sum, entry) => {
      const amount = Number(entry.credit_amount) || 0;
      return sum + amount;
    }, 0);
    
    // Get unique tenants
    const uniqueTenantIds = new Set(ledgerEntries.map(entry => entry.tenant_id).filter(id => id != null));
    const uniqueTenants = uniqueTenantIds.size;
    
    // Calculate balances with proper validation (removed unused variable)
    // const balances = ledgerEntries
    //   .map(entry => Number(entry.balance) || 0)
    //   .filter(balance => !isNaN(balance));
    
    // Calculate final balance per tenant (sum of debits minus credits per tenant)
    // Only include specific units: Huvandhugadhakoalhige Units 201 & 301, Park Lane Unit 102
    const tenantBalances = new Map();
    ledgerEntries.forEach(entry => {
      // Only include specific units, but don't skip paid entries - we need them for balance calculation
      if (!isIncludedUnit(entry)) {
        return;
      }
      
      const tenantId = entry.tenant_id;
      const debitAmount = Number(entry.debit_amount) || 0;
      const creditAmount = Number(entry.credit_amount) || 0;
      
      if (!tenantBalances.has(tenantId)) {
        tenantBalances.set(tenantId, { totalDebits: 0, totalCredits: 0 });
      }
      
      const current = tenantBalances.get(tenantId);
      tenantBalances.set(tenantId, {
        totalDebits: current.totalDebits + debitAmount,
        totalCredits: current.totalCredits + creditAmount
      });
    });
    
    // Calculate final balances (total debits - total credits per tenant)
    const finalBalances = Array.from(tenantBalances.values()).map(tenant => 
      tenant.totalDebits - tenant.totalCredits
    );
    
    const averageBalance = finalBalances.length > 0 
      ? finalBalances.reduce((sum, balance) => sum + balance, 0) / finalBalances.length 
      : 0;
    
    // Outstanding balance (positive final balances - tenants owe money)
    const outstandingBalance = finalBalances
      .filter(balance => balance > 0)
      .reduce((sum, balance) => sum + balance, 0);
    
    // Credit balance (only show when credits exceed debits - actual credit)
    const creditBalance = (() => {
      const totalDebits = ledgerEntries.reduce((sum, entry) => {
        const debitAmount = Number(entry.debit_amount) || 0;
        return sum + debitAmount;
      }, 0);
      const totalCredits = ledgerEntries.reduce((sum, entry) => {
        const creditAmount = Number(entry.credit_amount) || 0;
        return sum + creditAmount;
      }, 0);
      // Only show credit balance if credits exceed debits (actual credit)
      return totalCredits > totalDebits ? totalCredits - totalDebits : 0;
    })();

    return {
      totalTransactions,
      totalDebits: isNaN(totalDebits) ? 0 : totalDebits,
      totalCredits: isNaN(totalCredits) ? 0 : totalCredits,
      uniqueTenants,
      averageBalance: isNaN(averageBalance) ? 0 : averageBalance,
      outstandingBalance: isNaN(outstandingBalance) ? 0 : outstandingBalance,
      creditBalance: isNaN(creditBalance) ? 0 : creditBalance
    };
  };

  const stats = calculateStats();

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tenant Ledger</h1>
            <p className="mt-2 text-gray-600">
              Manage all financial transactions for tenants
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={loadData} 
              variant="outline"
              className="flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleNewEntry} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Transactions */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Total Transactions</p>
                <p className="text-lg font-semibold text-gray-900">{stats.totalTransactions}</p>
              </div>
            </div>
          </Card>

          {/* Outstanding Balance */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Outstanding Balance</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(stats.outstandingBalance)}</p>
              </div>
            </div>
          </Card>

          {/* Credit Balance */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Credit Balance</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(stats.creditBalance)}</p>
              </div>
            </div>
          </Card>

          {/* Active Tenants */}
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-500">Active Tenants</p>
                <p className="text-lg font-semibold text-gray-900">{stats.uniqueTenants}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                placeholder="Search by description or reference..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant
              </label>
              <Select
                value={filters.tenant_id}
                onChange={(e) => setFilters(prev => ({ ...prev, tenant_id: e.target.value }))}
              >
                <option value="">All Tenants ({tenants.length} available)</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Type
              </label>
              <Select
                value={filters.payment_type_id}
                onChange={(e) => setFilters(prev => ({ ...prev, payment_type_id: e.target.value }))}
              >
                <option value="">All Payment Types ({paymentTypes.length} available)</option>
                {paymentTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <Select
                value={filters.transaction_type}
                onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
              >
                <option value="">All Transactions</option>
                <option value="debit">Debit Only</option>
                <option value="credit">Credit Only</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* Complete Table with All Fields */}
        <Card className="p-4 md:p-6">
          {/* Bulk Actions */}
          {showBulkActions && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedEntries.length} entry{selectedEntries.length !== 1 ? 'ies' : ''} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    Deselect All
                  </Button>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkExport}
                    className="text-green-600 border-green-300 hover:bg-green-100"
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div className="text-sm text-gray-600">
              Showing {ledgerEntries.length} entries
              {pagination.total > 0 && ` of ${pagination.total} total`}
              {selectedEntries.length > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  ({selectedEntries.length} selected)
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Page {pagination.current_page} of {pagination.last_page}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
              <table className="min-w-full divide-y divide-gray-200 table-auto">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedEntries.length === ledgerEntries.length && ledgerEntries.length > 0}
                        onChange={selectedEntries.length === ledgerEntries.length ? handleDeselectAll : handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Date
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                      Tenant
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      Unit
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Payment Type
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Debit
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Credit
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Payment Method
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {!Array.isArray(ledgerEntries) || ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                        {!Array.isArray(ledgerEntries) ? 'Loading...' : 'No ledger entries found'}
                      </td>
                    </tr>
                  ) : (
                    sortEntriesByUnit(ledgerEntries).map((entry) => (
                      <tr key={entry.ledger_id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEntries.includes(entry.ledger_id)}
                            onChange={() => handleSelectEntry(entry.ledger_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-900">
                          {formatDate(entry.transaction_date)}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 truncate max-w-32">
                          <span title={entry.tenant?.full_name || 'N/A'}>
                            {entry.tenant?.full_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 max-w-48">
                          <span title={getRentalUnitDisplay(entry)}>
                            {getRentalUnitDisplay(entry)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 truncate max-w-28">
                          <span title={entry.payment_type?.name || 'N/A'}>
                            {entry.payment_type?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {entry.debit_amount > 0 ? (
                            <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded" title="Amount owed (debit)">
                              {formatCurrency(entry.debit_amount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs">
                          {entry.credit_amount > 0 ? (
                            <span className="text-green-600 font-semibold bg-green-50 px-2 py-1 rounded" title="Payment received (credit)">
                              {formatCurrency(entry.credit_amount)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-900 truncate max-w-28">
                          <span title={entry.payment_method || '-'}>
                            {entry.payment_method || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(entry.ledger_id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Summary Footer */}
                {ledgerEntries.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-right text-sm font-semibold text-gray-700">
                        Total Outstanding Balance:
                      </td>
                      <td className="px-3 py-4 text-sm font-bold text-orange-600">
                        {formatCurrency(
                          ledgerEntries.reduce((sum, entry) => {
                            const debitAmount = Number(entry.debit_amount) || 0;
                            const creditAmount = Number(entry.credit_amount) || 0;
                            return sum + (debitAmount - creditAmount);
                          }, 0)
                        )}
                      </td>
                      <td colSpan={2} className="px-3 py-4 text-xs text-gray-500">
                        Final balance owed by tenants
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-right text-sm font-semibold text-gray-700">
                        Total Credit Balance:
                      </td>
                      <td className="px-3 py-4 text-sm font-bold text-green-600">
                        {formatCurrency(
                          (() => {
                            const totalDebits = ledgerEntries.reduce((sum, entry) => {
                              const debitAmount = Number(entry.debit_amount) || 0;
                              return sum + debitAmount;
                            }, 0);
                            const totalCredits = ledgerEntries.reduce((sum, entry) => {
                              const creditAmount = Number(entry.credit_amount) || 0;
                              return sum + creditAmount;
                            }, 0);
                            // Only show credit balance if credits exceed debits (actual credit)
                            return totalCredits > totalDebits ? totalCredits - totalDebits : 0;
                          })()
                        )}
                      </td>
                      <td colSpan={2} className="px-3 py-4 text-xs text-gray-500">
                        Actual credit balance (advance payments, overpayments)
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </Card>
      </div>
    </SidebarLayout>
  );
}