'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { DollarSign, Plus, Search, Trash2, Star, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { currenciesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';

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
  const [formData, setFormData] = useState({
    code: '',
    is_default: false,
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await currenciesAPI.getAll();
      setCurrencies(response.data.currencies || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to fetch currencies');
    } finally {
      setLoading(false);
    }
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="flex items-center w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Currency
          </Button>
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

        {/* Currencies Table - Responsive: Table on desktop, Cards on mobile */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveTable
            data={filteredCurrencies}
            keyExtractor={(currency) => currency.id}
            columns={[
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
            emptyAction={!searchTerm ? (
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            ) : undefined}
          />
        )}


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
              <DialogHeader>
                <DialogTitle>{editingCurrency ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
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
