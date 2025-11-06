'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { CreditCard, Plus, Search, Edit, Trash2, Save, X } from 'lucide-react';
import { paymentTypesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';
import { Pagination } from '../../components/UI/Pagination';

interface PaymentType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PaymentTypesPage() {
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaymentType, setEditingPaymentType] = useState<PaymentType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchPaymentTypes();
  }, [currentPage, itemsPerPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPaymentTypes();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clean up selected IDs when payment types are removed
  useEffect(() => {
    const paymentTypeIds = new Set(paymentTypes.map(pt => pt.id));
    setSelectedIds(prev => {
      const validSelectedIds = Array.from(prev).filter(id => paymentTypeIds.has(id));
      if (validSelectedIds.length !== prev.size) {
        return new Set(validSelectedIds);
      }
      return prev;
    });
  }, [paymentTypes]);

  const fetchPaymentTypes = async () => {
    try {
      setLoading(true);
      const response = await paymentTypesAPI.getAll({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchTerm || undefined,
      });
      const paymentTypesData = response.data.payment_types || response.data?.data || [];
      setPaymentTypes(paymentTypesData);
      setTotalItems(response.data?.total ?? response.data?.pagination?.total ?? paymentTypesData.length);
    } catch (error) {
      console.error('Error fetching payment types:', error);
      toast.error('Failed to fetch payment types');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isAllSelected = paymentTypes.length > 0 && selectedIds.size === paymentTypes.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < paymentTypes.length;

  const handleAddPaymentType = () => {
    setEditingPaymentType(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setShowAddForm(true);
  };

  const handleEditPaymentType = (paymentType: PaymentType) => {
    setEditingPaymentType(paymentType);
    setFormData({
      name: paymentType.name,
      description: paymentType.description || '',
      is_active: paymentType.is_active
    });
    setShowAddForm(true);
  };

  const handleSavePaymentType = async () => {
    try {
      if (editingPaymentType) {
        // Update existing payment type
        await paymentTypesAPI.update(editingPaymentType.id, formData);
        toast.success('Payment type updated successfully');
      } else {
        // Create new payment type
        await paymentTypesAPI.create(formData);
        toast.success('Payment type created successfully');
      }
      
      setShowAddForm(false);
      setEditingPaymentType(null);
      fetchPaymentTypes();
    } catch (error: unknown) {
      console.error('Error saving payment type:', error);
      
      // Show specific validation errors if available
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (axiosError.response?.data?.errors) {
          const errors = axiosError.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          toast.error('Failed to save payment type: ' + (axiosError.response?.data?.message || 'Unknown error'));
        }
      } else {
        toast.error('Failed to save payment type: Unknown error');
      }
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingPaymentType(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  const handleDeletePaymentType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment type?')) return;
    
    try {
      await paymentTypesAPI.delete(id);
      toast.success('Payment type deleted successfully');
      fetchPaymentTypes();
    } catch (error: unknown) {
      console.error('Error deleting payment type:', error);
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      
      if (axiosError.response?.status === 422) {
        // Handle foreign key constraint violation
        toast.error(axiosError.response.data?.message || 'Cannot delete payment type because it is being used in ledger entries. Please deactivate it instead.');
      } else {
        toast.error(axiosError.response?.data?.message || 'Failed to delete payment type');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} payment type${count > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedIds).map(id => paymentTypesAPI.delete(id));
      await Promise.all(deletePromises);
      toast.success(`${count} payment type${count > 1 ? 's' : ''} deleted successfully`);
      setSelectedIds(new Set());
      fetchPaymentTypes();
    } catch (error: unknown) {
      console.error('Error deleting payment types:', error);
      const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
      
      if (axiosError.response?.status === 422) {
        toast.error(axiosError.response.data?.message || 'Cannot delete some payment types because they are being used in ledger entries.');
      } else {
        toast.error(axiosError.response?.data?.message || 'Failed to delete payment types');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paymentTypes.map(paymentType => paymentType.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Types</h1>
            <p className="mt-2 text-gray-600">
              Manage different types of payments
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button onClick={handleAddPaymentType} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
              <Plus className="h-4 w-4" />
              Add Payment Type
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payment types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Add/Edit Payment Type Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader className="flex-col items-start">
              <DialogTitle>
                {editingPaymentType ? 'Edit Payment Type' : 'Add Payment Type'}
              </DialogTitle>
              <div className="border-b border-gray-200 w-full my-3"></div>
              <DialogDescription>
                {editingPaymentType ? 'Update the payment type details below.' : 'Create a new payment type by filling out the form below.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Input
                  placeholder="Enter payment type name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  placeholder="Enter description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={cancelForm}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleSavePaymentType}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Save className="h-4 w-4" />
                {editingPaymentType ? 'Update Payment Type' : 'Create Payment Type'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Types Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Payment Types List ({totalItems})</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your payment types and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading payment types...</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {paymentTypes.length > 0 && (
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
                  data={paymentTypes}
                  keyExtractor={(item) => item.id.toString()}
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
                      accessor: (item) => (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id, e.target.checked);
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      ),
                      mobileLabel: 'Select',
                      mobilePriority: 'high',
                      className: 'w-12',
                    },
                    {
                      header: 'Name',
                      accessor: 'name',
                      mobileLabel: 'Name',
                      mobilePriority: 'high',
                    },
                    {
                      header: 'Description',
                      accessor: (item) => item.description || 'No description',
                      mobileLabel: 'Description',
                      mobilePriority: 'medium',
                    },
                    {
                      header: 'Status',
                      accessor: (item) => (
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      ),
                      mobileLabel: 'Status',
                      mobilePriority: 'high',
                      className: 'w-32',
                    },
                    {
                      header: 'Created',
                      accessor: (item) => new Date(item.created_at).toLocaleDateString(),
                      mobileLabel: 'Created',
                      mobilePriority: 'medium',
                      className: 'w-40',
                    },
                  ]}
                  actions={(item) => (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPaymentType(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePaymentType(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first payment type.'}
                  emptyIcon={<CreditCard className="mx-auto h-12 w-12 text-gray-400" />}
                />
                
                {paymentTypes.length > 0 && (
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
      </div>
    </SidebarLayout>
  );
}