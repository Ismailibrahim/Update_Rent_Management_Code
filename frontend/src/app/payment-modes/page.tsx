'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { CreditCard, Plus, Search, Edit, Trash2, Save, X } from 'lucide-react';
import { paymentModesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface PaymentMode {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function PaymentModesPage() {
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPaymentMode, setEditingPaymentMode] = useState<PaymentMode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });

  useEffect(() => {
    fetchPaymentModes();
  }, []);

  const fetchPaymentModes = async () => {
    try {
      setLoading(true);
      const response = await paymentModesAPI.getAll();
      setPaymentModes(response.data.payment_modes || []);
    } catch (error: unknown) {
      console.error('Error fetching payment modes:', error);
      toast.error('Failed to fetch payment modes');
    } finally {
      setLoading(false);
    }
  };

  const filteredPaymentModes = paymentModes.filter(mode =>
    mode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mode.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddPaymentMode = () => {
    setEditingPaymentMode(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
    setShowAddForm(true);
  };

  const handleEditPaymentMode = (paymentMode: PaymentMode) => {
    setEditingPaymentMode(paymentMode);
    setFormData({
      name: paymentMode.name,
      description: paymentMode.description || '',
      is_active: paymentMode.is_active
    });
    setShowAddForm(true);
  };

  const handleSavePaymentMode = async () => {
    try {
      if (editingPaymentMode) {
        // Update existing payment mode
        await paymentModesAPI.update(editingPaymentMode.id, formData);
        toast.success('Payment mode updated successfully');
      } else {
        // Create new payment mode
        await paymentModesAPI.create(formData);
        toast.success('Payment mode created successfully');
      }
      
      setShowAddForm(false);
      setEditingPaymentMode(null);
      fetchPaymentModes();
    } catch (error: unknown) {
      console.error('Error saving payment mode:', error);
      
      // Show specific validation errors if available
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          const errorMessage = errorResponse.response?.data?.message || 'Unknown error';
          toast.error('Failed to save payment mode: ' + errorMessage);
        }
      } else {
        toast.error('Failed to save payment mode');
      }
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingPaymentMode(null);
    setFormData({
      name: '',
      description: '',
      is_active: true
    });
  };

  const handleDeletePaymentMode = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment mode?')) return;
    
    try {
      await paymentModesAPI.delete(id);
      toast.success('Payment mode deleted successfully');
      fetchPaymentModes();
    } catch (error: unknown) {
      console.error('Error deleting payment mode:', error);
      toast.error('Failed to delete payment mode');
    }
  };

  // Calculate statistics
  const totalPaymentModes = paymentModes.length;
  const activePaymentModes = paymentModes.filter(mode => mode.is_active).length;
  const inactivePaymentModes = paymentModes.filter(mode => !mode.is_active).length;

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
            <h1 className="text-3xl font-bold text-gray-900">Payment Modes</h1>
            <p className="mt-2 text-gray-600">
              Manage different payment methods
            </p>
          </div>
          <Button onClick={handleAddPaymentMode} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
            <Plus className="h-4 w-4" />
            Add Payment Mode
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payment Modes</CardTitle>
              <CreditCard className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalPaymentModes}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Modes</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{activePaymentModes}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Inactive Modes</CardTitle>
              <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{inactivePaymentModes}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search payment modes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Add/Edit Payment Mode Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingPaymentMode ? 'Edit Payment Mode' : 'Add Payment Mode'}
              </DialogTitle>
              <DialogDescription>
                {editingPaymentMode ? 'Update the payment mode details below.' : 'Create a new payment mode by filling out the form below.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Input
                  placeholder="Enter payment mode name"
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
                onClick={handleSavePaymentMode}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Save className="h-4 w-4" />
                {editingPaymentMode ? 'Update Payment Mode' : 'Create Payment Mode'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Modes Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Payment Modes List</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your payment methods and their settings
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
                  {filteredPaymentModes.map((paymentMode) => (
                    <tr key={paymentMode.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{paymentMode.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">
                          {paymentMode.description || 'No description'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          paymentMode.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {paymentMode.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-500">
                          {new Date(paymentMode.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPaymentMode(paymentMode)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePaymentMode(paymentMode.id)}
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

            {filteredPaymentModes.length === 0 && (
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payment modes found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first payment mode.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}