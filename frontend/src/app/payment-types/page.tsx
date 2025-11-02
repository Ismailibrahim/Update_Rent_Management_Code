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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchPaymentTypes();
  }, []);

  const fetchPaymentTypes = async () => {
    try {
      setLoading(true);
      const response = await paymentTypesAPI.getAll();
      setPaymentTypes(response.data.payment_types || []);
    } catch (error) {
      console.error('Error fetching payment types:', error);
      toast.error('Failed to fetch payment types');
    } finally {
      setLoading(false);
    }
  };

  const filteredPaymentTypes = paymentTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // Calculate statistics
  const totalPaymentTypes = paymentTypes.length;
  const activePaymentTypes = paymentTypes.filter(type => type.is_active).length;
  const inactivePaymentTypes = paymentTypes.filter(type => !type.is_active).length;

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
          <Button onClick={handleAddPaymentType} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Type
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payment Types</CardTitle>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalPaymentTypes}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Types</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{activePaymentTypes}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactive Types</CardTitle>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{inactivePaymentTypes}</div>
            </CardContent>
          </Card>
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
            <DialogHeader>
              <DialogTitle>
                {editingPaymentType ? 'Edit Payment Type' : 'Add Payment Type'}
              </DialogTitle>
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
              <Button variant="outline" onClick={cancelForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSavePaymentType}>
                <Save className="h-4 w-4 mr-2" />
                {editingPaymentType ? 'Update Payment Type' : 'Create Payment Type'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Types Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Payment Types List</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your payment types and their settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaymentTypes.map((paymentType) => (
                    <tr key={paymentType.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{paymentType.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">
                          {paymentType.description || 'No description'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          paymentType.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentType.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-500">
                          {new Date(paymentType.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPaymentType(paymentType)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePaymentType(paymentType.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPaymentTypes.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payment types found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first payment type.'}
                </p>
                <div className="mt-6">
                  <Button onClick={handleAddPaymentType}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Type
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}