'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { rentalUnitTypesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';
import { Pagination } from '../../components/UI/Pagination';

interface PropertyType {
  id: number;
  name: string;
  category?: 'property' | 'unit';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function PropertyTypesPageContent() {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchPropertyTypes();
  }, [currentPage, itemsPerPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchPropertyTypes();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clean up selected IDs when property types are removed
  useEffect(() => {
    const propertyTypeIds = new Set(propertyTypes.map(pt => pt.id));
    setSelectedIds(prev => {
      const validSelectedIds = Array.from(prev).filter(id => propertyTypeIds.has(id));
      if (validSelectedIds.length !== prev.size) {
        return new Set(validSelectedIds);
      }
      return prev;
    });
  }, [propertyTypes]);

  const fetchPropertyTypes = async () => {
    try {
      setLoading(true);
      const response = await rentalUnitTypesAPI.getPropertyTypes({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchTerm || undefined,
      });
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setPropertyTypes(types);
      setTotalItems(response.data?.data?.total ?? response.data?.total ?? types.length);
    } catch (error: unknown) {
      console.error('Error fetching property types:', error);
      toast.error('Failed to fetch property types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Property type name is required');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        name: formData.name.trim(),
        category: 'property' as const,
        is_active: formData.is_active,
      };
      
      if (editingType) {
        await rentalUnitTypesAPI.update(editingType.id, submitData);
        toast.success('Property type updated successfully');
      } else {
        await rentalUnitTypesAPI.create(submitData);
        toast.success('Property type created successfully');
      }
      
      setShowCreateForm(false);
      setEditingType(null);
      setFormData({
        name: '',
        is_active: true,
      });
      
      fetchPropertyTypes();
    } catch (error: unknown) {
      console.error('Error saving property type:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to save property type';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (propertyType: PropertyType) => {
    setEditingType(propertyType);
    setFormData({
      name: propertyType.name,
      is_active: propertyType.is_active,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this property type? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await rentalUnitTypesAPI.delete(id);
      toast.success('Property type deleted successfully');
      fetchPropertyTypes();
    } catch (error: unknown) {
      console.error('Error deleting property type:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete property type';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} property type${count > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedIds).map(id => rentalUnitTypesAPI.delete(id));
      await Promise.all(deletePromises);
      toast.success(`${count} property type${count > 1 ? 's' : ''} deleted successfully`);
      setSelectedIds(new Set());
      fetchPropertyTypes();
    } catch (error: unknown) {
      console.error('Error deleting property types:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete property types';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(propertyTypes.map(propertyType => propertyType.id)));
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

  const handleToggleStatus = async (propertyType: PropertyType) => {
    try {
      setLoading(true);
      await rentalUnitTypesAPI.update(propertyType.id, {
        ...propertyType,
        is_active: !propertyType.is_active,
        category: 'property' as const,
      });
      toast.success(`Property type ${!propertyType.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchPropertyTypes();
    } catch (error: unknown) {
      console.error('Error updating property type status:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to update property type status';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isAllSelected = propertyTypes.length > 0 && selectedIds.size === propertyTypes.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < propertyTypes.length;

  const resetForm = () => {
    setFormData({
      name: '',
      is_active: true,
    });
    setEditingType(null);
    setShowCreateForm(false);
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Property Types</h1>
            <p className="text-gray-600">Manage different types of properties (buildings/complexes)</p>
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
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Property Type
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search property types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Create/Edit Form (Modal) */}
        {showCreateForm && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-lg w-full">
              <DialogHeader className="flex-col items-start">
                <DialogTitle>{editingType ? 'Edit Property Type' : 'Add New Property Type'}</DialogTitle>
                <div className="border-b border-gray-200 w-full my-3"></div>
                <DialogDescription>
                  {editingType ? 'Update the property type details' : 'Create a new property type (e.g., Apartment Building, Mixed-Use Building)'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <Input
                    placeholder="e.g., Apartment Building, Mixed-Use Building"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingType ? 'Update' : 'Create'} Property Type
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Property Types List */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>Property Types ({totalItems})</CardTitle>
            <CardDescription>Manage your property types for buildings and complexes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading property types...</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {propertyTypes.length > 0 && (
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
                  data={propertyTypes}
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
                      header: 'ID',
                      accessor: (item) => `#${item.id}`,
                      mobileLabel: 'ID',
                      mobilePriority: 'high',
                      className: 'w-16',
                    },
                    {
                      header: 'Name',
                      accessor: 'name',
                      mobileLabel: 'Name',
                      mobilePriority: 'high',
                    },
                    {
                      header: 'Status',
                      accessor: (item) => (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                        className="p-1"
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {item.is_active ? (
                          <EyeOff className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="p-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first property type.'}
                  emptyIcon={<Building2 className="mx-auto h-12 w-12 text-gray-400" />}
                />
                
                {propertyTypes.length > 0 && (
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

export default function PropertyTypesPage() {
  return <PropertyTypesPageContent />;
}

