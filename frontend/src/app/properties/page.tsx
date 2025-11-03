'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Building2, Plus, Search, Edit, Trash2, Eye, Upload, Download } from 'lucide-react';
import { propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { useAuth } from '../../contexts/AuthContext';

interface Property {
  id: number;
  name: string;
  street: string;
  city: string;
  island: string;
  type: string;
  status: string;
  number_of_floors: number;
  number_of_rental_units: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number;
  year_built: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export default function PropertiesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchProperties();
    }
  }, [user, authLoading, router]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await propertiesAPI.getAll();
      setProperties(response.data.properties || []);
    } catch (error: unknown) {
      console.error('Error fetching properties:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch properties';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
        // Server responded with error
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to view properties.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = message;
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        // Request made but no response (network error)
        const requestError = error as { config?: { url?: string; baseURL?: string; timeout?: number } };
        errorMessage = 'Network error. Please check your connection and ensure the backend API is running.';
        console.error('Network error details:', {
          url: requestError.config?.url,
          baseURL: requestError.config?.baseURL,
          timeout: requestError.config?.timeout
        });
      } else if (error instanceof Error) {
        // Error setting up request
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = properties.filter(property =>
    property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.street.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.island.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteProperty = async (id: number) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await propertiesAPI.delete(id);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleAddProperty = () => {
    router.push('/properties/new');
  };

  const handleViewProperty = (id: number) => {
    router.push(`/properties/${id}`);
  };

  const handleEditProperty = (id: number) => {
    router.push(`/properties/${id}/edit`);
  };

  if (authLoading || loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
            <p className="mt-2 text-gray-600">
              Manage your rental properties
            </p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center" 
              onClick={() => router.push('/properties/import')}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button className="flex items-center" onClick={handleAddProperty}>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Properties Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProperties.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Floors</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Bedrooms</TableHead>
                      <TableHead>Bathrooms</TableHead>
                      <TableHead>Square Feet</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProperties.map((property) => (
                      <TableRow key={property.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{property.name}</TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">
                            {property.street}, {property.island}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{property.type}</span>
                        </TableCell>
                        <TableCell>{property.number_of_floors || 'N/A'}</TableCell>
                        <TableCell>{property.number_of_rental_units || 'N/A'}</TableCell>
                        <TableCell>{property.bedrooms || 'N/A'}</TableCell>
                        <TableCell>{property.bathrooms || 'N/A'}</TableCell>
                        <TableCell>
                          {property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            property.status === 'vacant'
                              ? 'bg-green-100 text-green-800'
                              : property.status === 'occupied'
                              ? 'bg-blue-100 text-blue-800'
                              : property.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : property.status === 'renovation'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {property.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewProperty(property.id)}
                              title="View Property"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditProperty(property.id)}
                              title="Edit Property"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteProperty(property.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Delete Property"
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
            </CardContent>
          </Card>
        ) : null}

        {!loading && filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first property.'}
            </p>
            <div className="mt-6">
              <Button onClick={handleAddProperty}>
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
