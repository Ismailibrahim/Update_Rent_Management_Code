'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { rentalUnitTypesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function RentalUnitTypesPageContent() {
  const [unitTypes, setUnitTypes] = useState<RentalUnitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingType, setEditingType] = useState<RentalUnitType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchUnitTypes();
  }, []);

  const fetchUnitTypes = async () => {
    try {
      setLoading(true);
      console.log('Fetching unit types...');
      console.log('API base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
      console.log('Token exists:', typeof window !== 'undefined' ? !!localStorage.getItem('token') : 'N/A');
      
      const response = await rentalUnitTypesAPI.getAll();
      console.log('Unit types API response:', response);
      console.log('Response data:', response.data);
      console.log('Response data.unitTypes:', response.data?.unitTypes);
      console.log('Response data.data.unitTypes:', response.data?.data?.unitTypes);
      
      const unitTypes = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      console.log('Setting unit types:', unitTypes);
      setUnitTypes(unitTypes);
      
      if (unitTypes.length === 0) {
        console.warn('No unit types found in response');
      }
    } catch (error: unknown) {
      console.error('Error fetching unit types:', error);
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response: { status: number; data: unknown } };
        console.error('Error status:', axiosError.response.status);
        console.error('Error data:', axiosError.response.data);
      }
      toast.error('Failed to fetch rental unit types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Unit type name is required');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare data with defaults for fields not shown in the simplified form
      const submitData = {
        name: formData.name,
        description: '',
        is_active: true,
      };
      
      console.log('Submitting rental unit type data:', submitData);
      
      if (editingType) {
        console.log('Updating unit type:', editingType.id);
        console.log('Update data being sent:', submitData);
        const response = await rentalUnitTypesAPI.update(editingType.id, submitData);
        console.log('Update response:', response);
        toast.success('Rental unit type updated successfully');
      } else {
        console.log('Creating new unit type');
        console.log('Create data being sent:', submitData);
        const response = await rentalUnitTypesAPI.create(submitData);
        console.log('Create response:', response);
        toast.success('Rental unit type created successfully');
      }
      
      setShowCreateForm(false);
      setEditingType(null);
      setFormData({
        name: '',
        description: '',
        is_active: true,
      });
      
      fetchUnitTypes();
    } catch (error: unknown) {
      console.error('Error saving unit type:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to save rental unit type';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (unitType: RentalUnitType) => {
    console.log('Editing unit type:', unitType);
    setEditingType(unitType);
    setFormData({
      name: unitType.name,
      description: unitType.description || '',
      is_active: unitType.is_active,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rental unit type?')) {
      return;
    }

    try {
      setLoading(true);
      await rentalUnitTypesAPI.delete(id);
      toast.success('Rental unit type deleted successfully');
      fetchUnitTypes();
    } catch (error: unknown) {
      console.error('Error deleting unit type:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete rental unit type';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (unitType: RentalUnitType) => {
    try {
      setLoading(true);
      await rentalUnitTypesAPI.update(unitType.id, {
        ...unitType,
        is_active: !unitType.is_active
      });
      toast.success(`Rental unit type ${!unitType.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchUnitTypes();
    } catch (error: unknown) {
      console.error('Error updating unit type status:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to update rental unit type status';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredUnitTypes = unitTypes.filter(unitType =>
    unitType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unitType.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-2xl font-bold text-gray-900">Rental Unit Types</h1>
            <p className="text-gray-600">Manage different types of rental units</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Unit Type
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search unit types..."
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
                <DialogTitle>{editingType ? 'Edit Unit Type' : 'Add New Unit Type'}</DialogTitle>
                <DialogDescription>
                  {editingType ? 'Update the rental unit type details' : 'Create a new rental unit type'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <Input
                    placeholder="Unit type name"
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
                    {editingType ? 'Update' : 'Create'} Unit Type
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Unit Types List (Table View) */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>Unit Types ({filteredUnitTypes.length})</CardTitle>
            <CardDescription>Manage your rental unit types</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading unit types...</p>
              </div>
            ) : filteredUnitTypes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No unit types found</p>
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
                    {filteredUnitTypes.map((unitType) => (
                      <TableRow key={unitType.id}>
                        <TableCell>#{unitType.id}</TableCell>
                        <TableCell className="font-medium">{unitType.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${unitType.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {unitType.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(unitType.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(unitType)}
                              className="p-1"
                              title={unitType.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {unitType.is_active ? (
                                <EyeOff className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(unitType)}
                              className="p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(unitType.id)}
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

export default function RentalUnitTypesPage() {
  return <RentalUnitTypesPageContent />;
}
