'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { Package, Plus, Search, Edit, Trash2, Save, X, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { assetsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface Asset {
  id: number;
  name: string;
  brand?: string;
  serial_no?: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    serial_no: '',
    category: 'other'
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAll();
      setAssets(response.data.assets || []);
    } catch (error: unknown) {
      console.error('Error fetching assets:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { status?: number } };
        if (errorResponse.response?.status === 401) {
          toast.error('Please log in to view assets');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        } else {
          toast.error('Failed to fetch assets');
        }
      } else {
        toast.error('Failed to fetch assets');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.serial_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string;
    let bValue: string;

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'brand':
        aValue = (a.brand || '').toLowerCase();
        bValue = (b.brand || '').toLowerCase();
        break;
      case 'serial_no':
        aValue = (a.serial_no || '').toLowerCase();
        bValue = (b.serial_no || '').toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      default:
        return 0;
    }

    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const SortableHeader = ({ column, label }: { column: string; label: string }) => {
    const isActive = sortColumn === column;
    return (
      <TableHead 
        className="cursor-pointer hover:bg-gray-100 select-none" 
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1">
          <span>{label}</span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowDown className="h-3 w-3 text-blue-600" />
            )
          ) : (
            <div className="flex flex-col">
              <ArrowUp className="h-2 w-2 text-gray-300" />
              <ArrowDown className="h-2 w-2 text-gray-300 -mt-1" />
            </div>
          )}
        </div>
      </TableHead>
    );
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      brand: '',
      serial_no: '',
      category: 'other'
    });
    setShowAddForm(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      brand: asset.brand || '',
      serial_no: asset.serial_no || '',
      category: asset.category
    });
    setShowAddForm(true);
  };

  const handleSaveAsset = async () => {
    try {
      if (editingAsset) {
        // Update existing asset
        await assetsAPI.update(editingAsset.id, formData);
        toast.success('Asset updated successfully');
      } else {
        // Create new asset
        await assetsAPI.create(formData);
        toast.success('Asset created successfully');
      }
      
      setShowAddForm(false);
      setEditingAsset(null);
      fetchAssets();
    } catch (error: unknown) {
      console.error('Error saving asset:', error);
      
      // Show specific validation errors if available
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          const errorMessage = errorResponse.response?.data?.message || 'Unknown error';
          toast.error('Failed to save asset: ' + errorMessage);
        }
      } else {
        toast.error('Failed to save asset');
      }
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingAsset(null);
    setFormData({
      name: '',
      brand: '',
      serial_no: '',
      category: 'other'
    });
  };

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    
    try {
      await assetsAPI.delete(id);
      toast.success('Asset deleted successfully');
      fetchAssets();
    } catch (error: unknown) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const categoryOptions = [
    { value: 'furniture', label: 'Furniture' },
    { value: 'appliance', label: 'Appliance' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'plumbing', label: 'Plumbing' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'hvac', label: 'HVAC' },
    { value: 'security', label: 'Security' },
    { value: 'other', label: 'Other' }
  ];

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
            <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
            <p className="mt-2 text-gray-600">
              Manage property assets and equipment
            </p>
          </div>
          <div className="flex space-x-2">
            <Link href="/assets/import" prefetch={true}>
              <Button 
                variant="outline" 
                className="flex items-center" 
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </Link>
            <Button onClick={handleAddAsset} className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search assets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Add/Edit Asset Dialog */}
        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingAsset ? 'Edit Asset' : 'Add Asset'}
              </DialogTitle>
              <DialogDescription>
                {editingAsset ? 'Update the asset details below.' : 'Create a new asset by filling out the form below.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <Input
                  placeholder="Enter asset name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <Input
                  placeholder="Enter brand"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial No
                </label>
                <Input
                  placeholder="Enter serial number (optional)"
                  value={formData.serial_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, serial_no: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelForm}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveAsset}>
                <Save className="h-4 w-4 mr-2" />
                {editingAsset ? 'Update Asset' : 'Create Asset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assets Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Assets List</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your property assets and equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHeader column="name" label="Name" />
                    <SortableHeader column="brand" label="Brand" />
                    <SortableHeader column="serial_no" label="Serial No" />
                    <SortableHeader column="category" label="Category" />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAssets.map((asset) => (
                    <TableRow key={asset.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="font-medium text-gray-900">{asset.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-600">{asset.brand || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-600">{asset.serial_no || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-600 capitalize">{asset.category}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditAsset(asset)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {sortedAssets.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assets found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first asset.'}
                </p>
                <div className="mt-6">
                  <Button onClick={handleAddAsset}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
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