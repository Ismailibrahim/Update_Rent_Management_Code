'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { nationalitiesAPI, Nationality } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

function NationalitiesPageContent() {
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingNationality, setEditingNationality] = useState<Nationality | null>(null);
  const [formData, setFormData] = useState({
    nationality: '',
    sort_order: 0,
  });

  useEffect(() => {
    fetchNationalities();
  }, []);

  const fetchNationalities = async () => {
    try {
      setLoading(true);
      const response = await nationalitiesAPI.getAll();
      const nationalitiesData = response.data?.data || [];
      setNationalities(nationalitiesData);
    } catch (error: unknown) {
      console.error('Error fetching nationalities:', error);
      
      // Better error message handling with detailed logging
      let errorMessage = 'Failed to fetch nationalities';
      let errorDetails = '';
      
      if (error && typeof error === 'object') {
        // Log full error object for debugging (handle circular references)
        try {
          console.error('Full error object:', error);
          // Try to serialize, but catch circular reference errors
          const errorStr = JSON.stringify(error, (key, value) => {
            if (key === 'config' || key === 'request') {
              return '[Object]'; // Skip circular references
            }
            return value;
          }, 2);
          console.error('Serialized error:', errorStr);
        } catch (e) {
          console.error('Could not serialize error:', e);
        }
        
        if ('response' in error) {
          const axiosError = error as { 
            response?: { 
              status?: number; 
              statusText?: string;
              data?: { 
                message?: string;
                error?: string;
                hint?: string;
              } 
            };
            message?: string;
          };
          
          const status = axiosError.response?.status;
          const responseData = axiosError.response?.data;
          
          console.error('API Error Details:', {
            status,
            statusText: axiosError.response?.statusText,
            data: responseData,
            message: axiosError.message
          });
          
          if (status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (status === 404) {
            errorMessage = 'API endpoint not found. Please check the backend routes.';
          } else if (status === 500) {
            errorMessage = responseData?.message || 'Server error occurred.';
            errorDetails = responseData?.hint || responseData?.error || 'The nationalities table may not exist. Please run: php artisan migrate';
            if (responseData?.error) {
              console.error('Server error details:', responseData.error);
            }
            // Show the full error in console for debugging
            console.error('500 Error Response:', responseData);
          } else if (responseData?.message) {
            errorMessage = responseData.message;
            if (responseData.hint) {
              errorDetails = responseData.hint;
            }
          } else if (status) {
            errorMessage = `API Error (${status}): ${axiosError.response?.statusText || 'Unknown error'}`;
          }
        } else if ('message' in error) {
          errorMessage = (error as { message: string }).message;
        } else if ('request' in error) {
          errorMessage = 'Network error: Unable to reach the backend server. Make sure the Laravel backend is running.';
        }
      }
      
      if (errorDetails) {
        toast.error(`${errorMessage}\n${errorDetails}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nationality.trim()) {
      toast.error('Nationality name is required');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        nationality: formData.nationality.trim(),
        sort_order: formData.sort_order || 0,
      };
      
      if (editingNationality) {
        await nationalitiesAPI.update(editingNationality.id, submitData);
        toast.success('Nationality updated successfully');
      } else {
        await nationalitiesAPI.create(submitData);
        toast.success('Nationality created successfully');
      }
      
      setShowCreateForm(false);
      setEditingNationality(null);
      resetForm();
      fetchNationalities();
    } catch (error: unknown) {
      console.error('Error saving nationality:', error);
      
      // Better error message handling
      let errorMessage = 'Failed to save nationality';
      let errorDetails = '';
      
      if (error && typeof error === 'object') {
        if ('response' in error) {
          const axiosError = error as { 
            response?: { 
              status?: number; 
              statusText?: string;
              data?: { 
                message?: string;
                error?: string;
                errors?: Record<string, string[]>;
              } 
            };
            message?: string;
          };
          
          const status = axiosError.response?.status;
          const responseData = axiosError.response?.data;
          
          if (status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (status === 422 && responseData?.errors) {
            // Validation errors
            const validationErrors = Object.values(responseData.errors).flat();
            errorMessage = validationErrors.join(', ') || 'Validation failed';
          } else if (status === 500) {
            errorMessage = responseData?.message || 'Server error occurred.';
            errorDetails = responseData?.error || 'The nationalities table may not exist. Please run: php artisan migrate';
          } else if (responseData?.message) {
            errorMessage = responseData.message;
            if (responseData.error) {
              errorDetails = responseData.error;
            }
          } else if (status) {
            errorMessage = `API Error (${status}): ${axiosError.response?.statusText || 'Unknown error'}`;
          }
        } else if ('message' in error) {
          errorMessage = (error as { message: string }).message;
        } else if ('request' in error) {
          errorMessage = 'Network error: Unable to reach the backend server.';
        }
      }
      
      if (errorDetails) {
        toast.error(`${errorMessage}\n${errorDetails}`);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (nationality: Nationality) => {
    setEditingNationality(nationality);
    setFormData({
      nationality: nationality.nationality,
      sort_order: nationality.sort_order || 0,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this nationality?')) {
      return;
    }

    try {
      setLoading(true);
      await nationalitiesAPI.delete(id);
      toast.success('Nationality deleted successfully');
      fetchNationalities();
    } catch (error: unknown) {
      console.error('Error deleting nationality:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete nationality';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredNationalities = nationalities.filter(nationality =>
    nationality.nationality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nationality: '',
      sort_order: 0,
    });
    setEditingNationality(null);
    setShowCreateForm(false);
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nationalities</h1>
            <p className="text-gray-600">Manage nationalities for tenant records</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Nationality
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search nationalities..."
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
                <DialogTitle>{editingNationality ? 'Edit Nationality' : 'Add New Nationality'}</DialogTitle>
                <DialogDescription>
                  {editingNationality ? 'Update the nationality details' : 'Create a new nationality'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality *
                  </label>
                  <Input
                    placeholder="e.g., Maldivian, Indian, Sri Lankan"
                    value={formData.nationality}
                    onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.sort_order}
                    onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lower numbers appear first in dropdown lists
                  </p>
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
                    {editingNationality ? 'Update' : 'Create'} Nationality
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Nationalities List (Table View) */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>Nationalities ({filteredNationalities.length})</CardTitle>
            <CardDescription>Manage your nationalities list</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading nationalities...</p>
              </div>
            ) : filteredNationalities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No nationalities found</p>
                {searchTerm && (
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your search term
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Nationality</TableHead>
                      <TableHead className="w-24">Sort Order</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNationalities.map((nationality) => (
                      <TableRow key={nationality.id}>
                        <TableCell>#{nationality.id}</TableCell>
                        <TableCell className="font-medium">{nationality.nationality}</TableCell>
                        <TableCell>{nationality.sort_order}</TableCell>
                        <TableCell>{new Date(nationality.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(nationality)}
                              className="p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(nationality.id)}
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

export default function NationalitiesPage() {
  return <NationalitiesPageContent />;
}

