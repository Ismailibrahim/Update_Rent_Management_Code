'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/UI/Table';
import { Building2, Plus, Search, Edit, Trash2, Eye, Upload, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { propertiesAPI } from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';
import { useAuth } from '@/contexts/AuthContext';

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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number;
    let bValue: string | number;

    switch (sortColumn) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'address':
        aValue = `${a.street}, ${a.island}`.toLowerCase();
        bValue = `${b.street}, ${b.island}`.toLowerCase();
        break;
      case 'type':
        aValue = a.type.toLowerCase();
        bValue = b.type.toLowerCase();
        break;
      case 'floors':
        aValue = a.number_of_floors || 0;
        bValue = b.number_of_floors || 0;
        break;
      case 'units':
        aValue = a.number_of_rental_units || 0;
        bValue = b.number_of_rental_units || 0;
        break;
      case 'bedrooms':
        aValue = a.bedrooms || 0;
        bValue = b.bedrooms || 0;
        break;
      case 'bathrooms':
        aValue = a.bathrooms || 0;
        bValue = b.bathrooms || 0;
        break;
      case 'square_feet':
        aValue = a.square_feet || 0;
        bValue = b.square_feet || 0;
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    } else {
      if (sortDirection === 'asc') {
        return (aValue as number) - (bValue as number);
      } else {
        return (bValue as number) - (aValue as number);
      }
    }
  });

  const SortableHeader = ({ column, label }: { column: string; label: string }) => {
    const isActive = sortColumn === column;
    return (
      <TableHead 
        className="cursor-pointer hover:bg-gray-50 select-none transition-colors duration-150 font-semibold text-gray-700" 
        onClick={() => handleSort(column)}
      >
        <div className="flex items-center space-x-1.5">
          <span>{label}</span>
          {isActive ? (
            sortDirection === 'asc' ? (
              <ArrowUp className="h-3.5 w-3.5 text-blue-600" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-blue-600" />
            )
          ) : (
            <div className="flex flex-col opacity-40">
              <ArrowUp className="h-2.5 w-2.5 text-gray-400" />
              <ArrowDown className="h-2.5 w-2.5 text-gray-400 -mt-1" />
            </div>
          )}
        </div>
      </TableHead>
    );
  };

  const handleDeleteProperty = async (id: number) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await propertiesAPI.delete(id);
      toast.success('Property deleted successfully');
      fetchProperties();
    } catch (error: unknown) {
      console.error('Error deleting property:', error);
      
      let errorMessage = 'Failed to delete property';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number; 
            data?: { 
              message?: string; 
              error?: string; 
            } 
          } 
        };
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to delete this property.';
        } else if (status === 404) {
          errorMessage = 'Property not found.';
        } else if (status === 400) {
          errorMessage = message || 'Cannot delete property. It may have associated rental units or other dependencies.';
        } else if (status === 409) {
          errorMessage = 'Cannot delete property. It may have associated rental units or other dependencies.';
        } else {
          errorMessage = message;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const handleAddProperty = () => {
    router.push('/properties/new');
  };

  // These handlers are no longer needed since we're using Link components
  // Keeping them for backward compatibility in case they're referenced elsewhere
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
          <div className="flex space-x-3">
            <Link href="/properties/import" prefetch={true}>
              <Button 
                variant="outline" 
                className="flex items-center gap-2 px-4 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </Link>
            <Link href="/properties/new" prefetch={true}>
              <Button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search properties by name, address, city, or island..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-2.5 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
          />
        </div>

        {/* Properties Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedProperties.length > 0 ? (
          <Card className="bg-white shadow-md border border-gray-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader column="name" label="Name" />
                      <SortableHeader column="address" label="Address" />
                      <SortableHeader column="type" label="Type" />
                      <SortableHeader column="floors" label="Floors" />
                      <SortableHeader column="units" label="Units" />
                      <SortableHeader column="bedrooms" label="Bedrooms" />
                      <SortableHeader column="bathrooms" label="Bathrooms" />
                      <SortableHeader column="square_feet" label="Square Feet" />
                      <SortableHeader column="status" label="Status" />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProperties.map((property) => (
                      <TableRow key={property.id} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Link 
                              href={`/properties/${property.id}`}
                              prefetch={true}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Property"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                            <Link 
                              href={`/properties/${property.id}/edit`}
                              prefetch={true}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Edit Property"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteProperty(property.id)}
                              className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
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

        {!loading && sortedProperties.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first property.'}
            </p>
            <div className="mt-6">
              <Link href="/properties/new" prefetch={true}>
                <Button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                  <Plus className="h-4 w-4" />
                  Add Property
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
