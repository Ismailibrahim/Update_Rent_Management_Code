'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { DollarSign, FileText, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';
import { maintenanceCostsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface MaintenanceCost {
  id: number;
  rental_unit_asset_id: number;
  repair_cost: number;
  currency: string;
  description?: string;
  attached_bills?: string[];
  repair_date?: string;
  repair_provider?: string;
  status: string;
  notes?: string;
  rental_unit_asset?: {
    id: number;
    asset: {
      id: number;
      name: string;
      brand?: string;
      category: string;
    };
    rental_unit: {
      id: number;
      unit_number: string;
      property: {
        id: number;
        name: string;
      };
    };
  };
  created_at: string;
  updated_at: string;
}

export default function MaintenanceCostPage() {
  const [maintenanceCosts, setMaintenanceCosts] = useState<MaintenanceCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingCost, setEditingCost] = useState<MaintenanceCost | null>(null);
  const [editForm, setEditForm] = useState({
    repair_cost: '',
    currency: 'MVR',
    description: '',
    repair_date: '',
    repair_provider: '',
    notes: '',
    bills: [] as File[]
  });

  useEffect(() => {
    fetchMaintenanceCosts();
  }, []);

  const fetchMaintenanceCosts = async () => {
    try {
      setLoading(true);
      // Only fetch costs with status 'paid' (visible costs)
      const response = await maintenanceCostsAPI.getAll({ status: 'paid' });
      const costs = response.data.maintenance_costs || [];
      console.log('Maintenance costs data (paid only):', costs);
      console.log('Sample cost repair_cost:', costs[0]?.repair_cost, typeof costs[0]?.repair_cost);
      setMaintenanceCosts(costs);
    } catch (error) {
      console.error('Error fetching maintenance costs:', error);
      toast.error('Failed to fetch maintenance costs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cost: MaintenanceCost) => {
    setEditingCost(cost);
    const formattedDate = cost.repair_date ? new Date(cost.repair_date).toISOString().split('T')[0] : '';
    setEditForm({
      repair_cost: cost.repair_cost?.toString() || '',
      currency: cost.currency || 'MVR',
      description: cost.description || '',
      repair_date: formattedDate,
      repair_provider: cost.repair_provider || '',
      notes: cost.notes || '',
      bills: []
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCost) return;

    try {
      const repairCost = parseFloat(editForm.repair_cost);
      if (isNaN(repairCost) || repairCost <= 0) {
        toast.error('Please enter a valid repair cost');
        return;
      }

      await maintenanceCostsAPI.update(editingCost.id, {
        repair_cost: repairCost,
        currency: editForm.currency,
        description: editForm.description,
        repair_date: editForm.repair_date,
        repair_provider: editForm.repair_provider,
        notes: editForm.notes,
        status: 'paid' // Keep as paid since it's already completed
      }, editForm.bills);

      toast.success('Maintenance cost updated successfully');
      setShowEditForm(false);
      setEditingCost(null);
      fetchMaintenanceCosts();
    } catch (error) {
      console.error('Error updating maintenance cost:', error);
      toast.error('Failed to update maintenance cost');
    }
  };

  const handleCloseEditModal = () => {
    setShowEditForm(false);
    setEditingCost(null);
    setEditForm({
      repair_cost: '',
      currency: 'MVR',
      description: '',
      repair_date: '',
      repair_provider: '',
      notes: '',
      bills: []
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Handle null, undefined, or invalid amounts
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'MVR',
    }).format(numAmount);
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
            <h1 className="text-3xl font-bold text-gray-900">Maintenance Costs</h1>
            <p className="mt-2 text-gray-600">
              Track repair costs and manage maintenance expenses
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={fetchMaintenanceCosts}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total MVR Costs</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  maintenanceCosts.reduce((sum, cost) => {
                    const costAmount = Number(cost.repair_cost) || 0;
                    return cost.currency === 'MVR' ? sum + costAmount : sum;
                  }, 0),
                  'MVR'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {maintenanceCosts.filter(cost => cost.currency === 'MVR').length} MVR records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total USD Costs</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  maintenanceCosts.reduce((sum, cost) => {
                    const costAmount = Number(cost.repair_cost) || 0;
                    return cost.currency === 'USD' ? sum + costAmount : sum;
                  }, 0),
                  'USD'
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {maintenanceCosts.filter(cost => cost.currency === 'USD').length} USD records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Costs Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Maintenance Cost Records</CardTitle>
            <CardDescription className="text-gray-600">
              All maintenance costs and repair expenses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Asset</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Provider</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Bills</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceCosts.map((cost) => (
                    <tr key={cost.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {cost.rental_unit_asset?.asset.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {cost.rental_unit_asset?.asset.brand} • {cost.rental_unit_asset?.asset.category}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">{cost.rental_unit_asset?.rental_unit.property.name}</div>
                          <div className="text-gray-500">Unit {cost.rental_unit_asset?.rental_unit.unit_number}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(cost.repair_cost, cost.currency)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{cost.repair_provider || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">
                          {cost.repair_date ? new Date(cost.repair_date).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {cost.attached_bills && cost.attached_bills.length > 0 ? (
                            <div className="flex flex-col space-y-1">
                              {cost.attached_bills.map((bill, index) => {
                                const fileName = bill.split('/').pop() || `bill_${index + 1}`;
                                const fileUrl = `http://localhost:8000/storage/${bill}`;
                                return (
                                  <a
                                    key={index}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    <span className="truncate max-w-32" title={fileName}>
                                      {fileName}
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No bills</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // View details
                              console.log('View cost:', cost.id);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(cost)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (confirm('Are you sure you want to delete this maintenance cost?')) {
                                try {
                                  await maintenanceCostsAPI.delete(cost.id);
                                  toast.success('Maintenance cost deleted successfully');
                                  fetchMaintenanceCosts();
                                } catch {
                                  toast.error('Failed to delete maintenance cost');
                                }
                              }
                            }}
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

            {maintenanceCosts.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance costs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by adding maintenance costs for repairs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Maintenance Cost Modal */}
        {showEditForm && editingCost && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not on child elements
              if (e.target === e.currentTarget) {
                handleCloseEditModal();
              }
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Edit Maintenance Cost</h2>
                  <button
                    onClick={handleCloseEditModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repair Cost *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.repair_cost}
                        onChange={(e) => setEditForm({ ...editForm, repair_cost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency
                      </label>
                      <select
                        value={editForm.currency}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="MVR">MVR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repair Date
                      </label>
                      <input
                        type="date"
                        value={editForm.repair_date}
                        onChange={(e) => setEditForm({ ...editForm, repair_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repair Provider
                      </label>
                      <input
                        type="text"
                        value={editForm.repair_provider}
                        onChange={(e) => setEditForm({ ...editForm, repair_provider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Bills (Optional)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setEditForm({ ...editForm, bills: files });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Accepted formats: PDF, JPG, JPEG, PNG (max 10MB each)
                    </p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseEditModal}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      Update Cost
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
