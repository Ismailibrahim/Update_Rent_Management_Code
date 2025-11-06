'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { Package, Plus, Search, Edit, Trash2, Save, X, Upload, ArrowUp, ArrowDown } from 'lucide-react';
import { assetsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';
import { Pagination } from '../../components/UI/Pagination';

interface Asset {
  id: number;
  name: string;
  brand?: string;
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'other'
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchAssets();
  }, [currentPage, itemsPerPage, sortColumn, sortDirection]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAssets();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clean up selected IDs when assets are removed
  useEffect(() => {
    const assetIds = new Set(assets.map(asset => asset.id));
    setSelectedIds(prev => {
      const validSelectedIds = Array.from(prev).filter(id => assetIds.has(id));
      if (validSelectedIds.length !== prev.size) {
        return new Set(validSelectedIds);
      }
      return prev;
    });
  }, [assets]);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getAll({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchTerm || undefined,
        sort_column: sortColumn || undefined,
        sort_direction: sortDirection || undefined,
      });
      const assetsData = response.data.assets || response.data?.data || [];
      setAssets(assetsData);
      setTotalItems(response.data?.total ?? response.data?.pagination?.total ?? assetsData.length);
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

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isAllSelected = assets.length > 0 && selectedIds.size === assets.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < assets.length;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handleAddAsset = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      brand: '',
      category: 'other'
    });
    setShowAddForm(true);
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      brand: asset.brand || '',
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} asset${count > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedIds).map(id => assetsAPI.delete(id));
      await Promise.all(deletePromises);
      toast.success(`${count} asset${count > 1 ? 's' : ''} deleted successfully`);
      setSelectedIds(new Set());
      fetchAssets();
    } catch (error: unknown) {
      console.error('Error deleting assets:', error);
      toast.error('Failed to delete assets');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(assets.map(asset => asset.id)));
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
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Link href="/assets/import" prefetch={true}>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </Link>
            <Button onClick={handleAddAsset} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
              <Plus className="h-4 w-4" />
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
            <DialogHeader className="flex-col items-start">
              <DialogTitle>
                {editingAsset ? 'Edit Asset' : 'Add Asset'}
              </DialogTitle>
              <div className="border-b border-gray-200 w-full my-3"></div>
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
              <Button 
                variant="outline" 
                onClick={cancelForm}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveAsset}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Save className="h-4 w-4" />
                {editingAsset ? 'Update Asset' : 'Create Asset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assets Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Assets List ({totalItems})</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your property assets and equipment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading assets...</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {assets.length > 0 && (
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
                  data={assets}
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
                      header: (
                        <div className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('name')}>
                          <span>Name</span>
                          {sortColumn === 'name' ? (
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
                      ),
                      accessor: 'name',
                      mobileLabel: 'Name',
                      mobilePriority: 'high',
                    },
                    {
                      header: (
                        <div className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('brand')}>
                          <span>Brand</span>
                          {sortColumn === 'brand' ? (
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
                      ),
                      accessor: (item) => item.brand || 'N/A',
                      mobileLabel: 'Brand',
                      mobilePriority: 'medium',
                    },
                    {
                      header: (
                        <div className="flex items-center space-x-1 cursor-pointer hover:bg-gray-100 select-none" onClick={() => handleSort('category')}>
                          <span>Category</span>
                          {sortColumn === 'category' ? (
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
                      ),
                      accessor: (item) => <span className="capitalize">{item.category}</span>,
                      mobileLabel: 'Category',
                      mobilePriority: 'high',
                    },
                  ]}
                  actions={(item) => (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAsset(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAsset(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first asset.'}
                  emptyIcon={<Package className="mx-auto h-12 w-12 text-gray-400" />}
                />
                
                {assets.length > 0 && (
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