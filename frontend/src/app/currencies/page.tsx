'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { DollarSign, Plus, Search, Trash2, Star, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { currenciesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';
import { Pagination } from '../../components/UI/Pagination';

interface Currency {
  id: number;
  code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    code: '',
    is_default: false,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCurrencies();
  }, [currentPage, itemsPerPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchCurrencies();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clean up selected IDs when currencies are removed
  useEffect(() => {
    const currencyIds = new Set(currencies.map(currency => currency.id));
    setSelectedIds(prev => {
      const validSelectedIds = Array.from(prev).filter(id => currencyIds.has(id));
      if (validSelectedIds.length !== prev.size) {
        return new Set(validSelectedIds);
      }
      return prev;
    });
  }, [currencies]);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await currenciesAPI.getAll({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchTerm || undefined,
      });
      const currenciesData = response.data.currencies || response.data?.data || [];
      setCurrencies(currenciesData);
      setTotalItems(response.data?.total ?? response.data?.pagination?.total ?? currenciesData.length);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to fetch currencies');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const nonDefaultCurrencies = currencies.filter(c => !c.is_default);
  const isAllSelected = nonDefaultCurrencies.length > 0 && selectedIds.size === nonDefaultCurrencies.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < nonDefaultCurrencies.length;

  const handleDeleteCurrency = async (id: number) => {
    if (!confirm('Are you sure you want to delete this currency?')) return;
    
    try {
      await currenciesAPI.delete(id);
      toast.success('Currency deleted successfully');
      fetchCurrencies();
    } catch (error: any) {
      console.error('Error deleting currency:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to delete currency';
      toast.error(errorMessage);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    // Filter out default currencies from selection
    const deletableIds = Array.from(selectedIds).filter(id => {
      const currency = currencies.find(c => c.id === id);
      return currency && !currency.is_default;
    });

    if (deletableIds.length === 0) {
      toast.error('Cannot delete default currencies. Please deselect default currencies and try again.');
      return;
    }

    const defaultCount = selectedIds.size - deletableIds.length;
    const count = deletableIds.length;
    
    let confirmMessage = `Are you sure you want to delete ${count} currency${count > 1 ? 'ies' : ''}?`;
    if (defaultCount > 0) {
      confirmMessage += `\nNote: ${defaultCount} default currency${defaultCount > 1 ? 'ies' : ''} will be skipped.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = deletableIds.map(id => currenciesAPI.delete(id));
      await Promise.all(deletePromises);
      toast.success(`${count} currency${count > 1 ? 'ies' : ''} deleted successfully`);
      setSelectedIds(new Set());
      fetchCurrencies();
    } catch (error: any) {
      console.error('Error deleting currencies:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to delete currencies';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select non-default currencies
      const nonDefaultIds = currencies.filter(c => !c.is_default).map(c => c.id);
      setSelectedIds(new Set(nonDefaultIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const currency = currencies.find(c => c.id === id);
    if (currency && currency.is_default) {
      toast.error('Cannot select default currency for deletion');
      return;
    }
    
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSetDefault = async (id: number) => {
    try {
      await currenciesAPI.update(id, { is_default: true });
      toast.success('Default currency updated successfully');
      fetchCurrencies();
    } catch (error) {
      console.error('Error setting default currency:', error);
      toast.error('Failed to set default currency');
    }
  };

  const handleEdit = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      is_default: currency.is_default,
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast.error('Currency code is required');
      return;
    }

    if (formData.code.length > 3) {
      toast.error('Currency code must be 3 characters or less');
      return;
    }

    try {
      setLoading(true);
      if (editingCurrency) {
        await currenciesAPI.update(editingCurrency.id, formData);
        toast.success('Currency updated successfully');
      } else {
        await currenciesAPI.create(formData);
        toast.success('Currency created successfully');
      }
      setShowCreateForm(false);
      setEditingCurrency(null);
      resetForm();
      fetchCurrencies();
    } catch (error: any) {
      console.error(`Error ${editingCurrency ? 'updating' : 'creating'} currency:`, error);
      const errorMessage = error?.response?.data?.message || error?.message || `Failed to ${editingCurrency ? 'update' : 'create'} currency`;
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      is_default: false,
    });
    setEditingCurrency(null);
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Currencies</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Manage currencies
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="flex items-center w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Currency
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search currencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Currencies Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Currencies List ({totalItems})</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your currencies and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading currencies...</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {currencies.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="text-sm text-gray-700">
                      Select All ({selectedIds.size} selected)
                    </label>
                  </div>
                )}
                
                <ResponsiveTable
                  data={currencies}
                  keyExtractor={(currency) => currency.id.toString()}
                  columns={[
                    {
                      header: (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isIndeterminate;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ),
                      accessor: (currency) => (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(currency.id)}
                          disabled={currency.is_default}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(currency.id, e.target.checked);
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={currency.is_default ? 'Cannot select default currency' : 'Select currency'}
                        />
                      ),
                      mobileLabel: 'Select',
                      mobilePriority: 'high',
                      className: 'w-12',
                    },
                    {
                      header: 'ID',
                      accessor: 'id',
                      mobileLabel: 'ID',
                      mobilePriority: 'high',
                      className: 'w-20',
                    },
                    {
                      header: 'Currency Code',
                      accessor: (currency) => (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-900">{currency.code}</span>
                          {currency.is_default && (
                            <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />
                          )}
                        </div>
                      ),
                      mobileLabel: 'Currency Code',
                      mobilePriority: 'high',
                    },
                    {
                      header: 'Default',
                      accessor: (currency) =>
                        currency.is_default ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                            Default
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        ),
                      mobileLabel: 'Status',
                      mobilePriority: 'high',
                      className: 'w-32',
                    },
                    {
                      header: 'Created',
                      accessor: (currency) => (
                        <span className="text-gray-600">
                          {new Date(currency.created_at).toLocaleDateString()}
                        </span>
                      ),
                      mobileLabel: 'Created',
                      mobilePriority: 'medium',
                      className: 'w-40',
                    },
                  ]}
                  actions={(currency) => (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(currency)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit currency"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!currency.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(currency.id)}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCurrency(currency.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={currency.is_default}
                        title={currency.is_default ? "Cannot delete default currency" : "Delete currency"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first currency.'}
                  emptyIcon={<DollarSign className="mx-auto h-12 w-12 text-gray-400" />}
                />
                
                {currencies.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newSize) => {
                      setItemsPerPage(newSize);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>


        {/* Create/Edit Currency Form (Modal) */}
        {showCreateForm && (
          <Dialog open={showCreateForm} onOpenChange={(open) => {
            if (!open) {
              setShowCreateForm(false);
              setEditingCurrency(null);
              resetForm();
            }
          }}>
            <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader className="flex-col items-start">
                <DialogTitle>{editingCurrency ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
                <div className="border-b border-gray-200 w-full my-3"></div>
                <DialogDescription>
                  {editingCurrency ? 'Update the currency details' : 'Enter the currency code (e.g., USD, MVR, EUR)'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency Code * (e.g., USD, MVR, EUR)
                  </label>
                  <Input
                    placeholder="USD"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    maxLength={3}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Set as Default Currency</span>
                  </label>
                </div>

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingCurrency(null);
                      resetForm();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingCurrency ? 'Update Currency' : 'Create Currency'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SidebarLayout>
  );
}
