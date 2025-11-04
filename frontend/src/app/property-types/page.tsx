'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { rentalUnitTypesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

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
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
  });

  useEffect(() => {
    fetchPropertyTypes();
  }, []);

  const fetchPropertyTypes = async () => {
    try {
      setLoading(true);
      const response = await rentalUnitTypesAPI.getPropertyTypes();
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setPropertyTypes(types);
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

  const filteredPropertyTypes = propertyTypes.filter(propertyType =>
    propertyType.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
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
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Property Type
          </Button>
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
              <DialogHeader>
                <DialogTitle>{editingType ? 'Edit Property Type' : 'Add New Property Type'}</DialogTitle>
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

        {/* Property Types List (Table View) */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>Property Types ({filteredPropertyTypes.length})</CardTitle>
            <CardDescription>Manage your property types for buildings and complexes</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading property types...</p>
              </div>
            ) : filteredPropertyTypes.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">No property types found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first property type.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPropertyTypes.map((propertyType) => (
                      <TableRow key={propertyType.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                        <TableCell>#{propertyType.id}</TableCell>
                        <TableCell className="font-medium">{propertyType.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            propertyType.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {propertyType.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(propertyType.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(propertyType)}
                              className="p-1"
                              title={propertyType.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {propertyType.is_active ? (
                                <EyeOff className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(propertyType)}
                              className="p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(propertyType.id)}
                              className="p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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

