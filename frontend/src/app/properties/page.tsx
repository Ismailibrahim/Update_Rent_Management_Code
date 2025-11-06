'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Building2, Plus, Search, Edit, Trash2, Eye, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { propertiesAPI } from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveTable } from '@/components/Responsive/ResponsiveTable';
import { Select } from '@/components/UI/Select';

interface Property {
  id: number;
  name: string;
  street: string;
  island: string;
  type: string;
  status: string;
  number_of_rental_units: number;
  created_at: string;
  updated_at: string;
  rental_units?: Array<{ id: number; property_id: number; unit_number: string; status: string; tenant_id?: number }>;
}

export default function PropertiesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [rentalUnitsFilter, setRentalUnitsFilter] = useState<'all' | 'with_units' | 'without_units'>('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;

  useEffect(() => {
    // Don't block rendering - redirect in background
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    // Fetch data immediately when user is available
    if (user && !loading) {
      fetchProperties(1);
    }
  }, [user, authLoading, router]);

  // Debounce search and refetch when filter changes
  useEffect(() => {
    if (!user || authLoading) return;
    
    const timer = setTimeout(() => {
      fetchProperties(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, rentalUnitsFilter]);

  const fetchProperties = async (page: number = currentPage) => {
    try {
      setLoading(true);
      // When filtering by rental units, fetch all properties to filter properly
      // Otherwise, use pagination
      const shouldFetchAll = rentalUnitsFilter !== 'all';
      const response = await propertiesAPI.getAll({
        page: shouldFetchAll ? 1 : page,
        limit: shouldFetchAll ? 1000 : perPage, // Fetch up to 1000 properties when filtering
        ...(searchTerm && { search: searchTerm })
      });
      setProperties(response.data.properties || []);
      
      // Update pagination info
      if (response.data.pagination) {
        setCurrentPage(shouldFetchAll ? 1 : (response.data.pagination.current || page));
        setTotalPages(shouldFetchAll ? 1 : (response.data.pagination.pages || 1));
        setTotal(shouldFetchAll ? response.data.properties?.length || 0 : (response.data.pagination.total || 0));
      }
    } catch (error: unknown) {
      console.error('Error fetching properties:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch properties';
      
      // Check if it's an Axios error
      if (error && typeof error === 'object') {
        const axiosError = error as { 
          response?: { status?: number; data?: { message?: string; error?: string } };
          request?: unknown;
          message?: string;
          code?: string;
          config?: { url?: string; baseURL?: string; timeout?: number };
        };
        
        // Server responded with error status
        if (axiosError.response) {
          const status = axiosError.response.status;
          const message = axiosError.response.data?.message || axiosError.response.data?.error || errorMessage;
          
          if (status === 401) {
            errorMessage = 'Authentication required. Please log in again.';
          } else if (status === 403) {
            errorMessage = 'Access denied. You don\'t have permission to view properties.';
          } else if (status === 500) {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = message;
          }
        } 
        // Network error - request was made but no response received
        else if (axiosError.request || axiosError.message === 'Network Error' || axiosError.code === 'ECONNABORTED' || axiosError.code === 'ERR_NETWORK') {
          const baseURL = axiosError.config?.baseURL || 'Unknown';
          const url = axiosError.config?.url || 'Unknown';
          errorMessage = `Network error: Unable to connect to backend API at ${baseURL}${url}. Please ensure the backend server is running.`;
          console.error('Network error details:', {
            message: axiosError.message,
            code: axiosError.code,
            url: url,
            baseURL: baseURL,
            timeout: axiosError.config?.timeout
          });
        } 
        // Other axios errors
        else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } 
      // Standard Error object
      else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setLoading(false);
    }
  };

  // Filter properties based on rental units filter
  const filteredProperties = properties.filter((property) => {
    if (rentalUnitsFilter === 'all') {
      return true;
    }
    
    const hasRentalUnits = property.rental_units && property.rental_units.length > 0;
    
    if (rentalUnitsFilter === 'with_units') {
      return hasRentalUnits;
    }
    
    if (rentalUnitsFilter === 'without_units') {
      return !hasRentalUnits;
    }
    
    return true;
  });

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
      case 'units':
        aValue = a.number_of_rental_units || 0;
        bValue = b.number_of_rental_units || 0;
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
      <div 
        className="cursor-pointer hover:bg-gray-50 select-none transition-colors duration-150 font-semibold text-gray-700 flex items-center space-x-1.5" 
        onClick={() => handleSort(column)}
      >
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
    );
  };

  const handleDeleteProperty = async (id: number) => {
    // Validate ID
    if (!id || isNaN(id) || id <= 0) {
      console.error('Invalid property ID:', id);
      toast.error('Invalid property ID. Please try refreshing the page.');
      return;
    }

    if (!confirm('Are you sure you want to delete this property?')) return;
    
    // Optimistically remove from UI
    const previousProperties = [...properties];
    setProperties(prev => prev.filter(p => p.id !== id));
    
    try {
      await propertiesAPI.delete(id);
      toast.success('Property deleted successfully');
      
      // Update pagination and totals if needed
      const remainingProperties = previousProperties.filter(p => p.id !== id);
      
      if (remainingProperties.length === 0 && currentPage > 1) {
        // If we deleted the last item on the page, go to previous page
        const newPage = Math.max(1, currentPage - 1);
        setCurrentPage(newPage);
        fetchProperties(newPage);
      } else if (rentalUnitsFilter !== 'all') {
        // If filtering, we need to refetch to get accurate filtered count
        // But we can update the filtered list optimistically too
        const newFiltered = filteredProperties.filter(p => p.id !== id);
        if (newFiltered.length !== filteredProperties.length - 1) {
          // If counts don't match, refetch to be safe
          fetchProperties(1);
        }
      } else {
        // Update total count
        setTotal(prev => Math.max(0, prev - 1));
      }
      // No need to refetch - we already removed it from the list optimistically
    } catch (error: unknown) {
      // Restore previous state on error
      setProperties(previousProperties);
      
      console.error('Error deleting property:', error);
      
      let errorMessage = 'Failed to delete property';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number; 
            data?: { 
              message?: string; 
              error?: string; 
            };
          } 
        };
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to delete this property.';
        } else if (status === 404) {
          errorMessage = message || `Property with ID ${id} not found. It may have already been deleted.`;
        } else if (status === 400) {
          errorMessage = message || 'Cannot delete property. It may have associated rental units or other dependencies.';
        } else if (status === 409) {
          errorMessage = 'Cannot delete property. It may have associated rental units or other dependencies.';
        } else {
          errorMessage = message;
        }
      }
      
      toast.error(errorMessage);
      
      // Only refetch on error to ensure we have the latest data
      fetchProperties(currentPage);
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
            <Link href="/properties/new" prefetch={true}>
              <Button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search properties by name, address, or island..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400 hidden sm:block" />
            <Select
              value={rentalUnitsFilter}
              onChange={(e) => setRentalUnitsFilter(e.target.value as 'all' | 'with_units' | 'without_units')}
              className="w-full sm:w-64 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm"
            >
              <option value="all">All Properties</option>
              <option value="with_units">With Rental Units</option>
              <option value="without_units">Without Rental Units</option>
            </Select>
          </div>
        </div>

        {/* Properties Table - Responsive: Table on desktop, Cards on mobile */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveTable
            data={sortedProperties}
            keyExtractor={(property) => property.id}
            columns={[
              {
                header: (
                  <SortableHeader column="name" label="Name" />
                ),
                accessor: (property) => (
                  <span className="font-medium">{property.name}</span>
                ),
                mobileLabel: 'Name',
                mobilePriority: 'high',
              },
              {
                header: (
                  <SortableHeader column="address" label="Address" />
                ),
                accessor: (property) => (
                  <div className="text-sm text-gray-600">
                    {property.street}, {property.island}
                  </div>
                ),
                mobileLabel: 'Address',
                mobilePriority: 'high',
              },
              {
                header: (
                  <SortableHeader column="type" label="Type" />
                ),
                accessor: (property) => (
                  <span className="text-sm capitalize">{property.type}</span>
                ),
                mobileLabel: 'Type',
                mobilePriority: 'high',
              },
              {
                header: (
                  <SortableHeader column="units" label="Units" />
                ),
                accessor: (property) => property.number_of_rental_units || 'N/A',
                mobileLabel: 'Units',
                mobilePriority: 'medium',
              },
              {
                header: (
                  <SortableHeader column="status" label="Status" />
                ),
                accessor: (property) => (
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
                ),
                mobileLabel: 'Status',
                mobilePriority: 'high',
              },
            ]}
            actions={(property) => {
              // Ensure property ID is valid
              const propertyId = property?.id;
              if (!propertyId) {
                console.error('Property missing ID:', property);
                return null;
              }
              
              return (
                <>
                  <Link 
                    href={`/properties/${propertyId}/details`}
                    prefetch={true}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="View Property Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link 
                    href={`/properties/${propertyId}/edit`}
                    prefetch={true}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Edit Property"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Delete button clicked for property:', propertyId, property);
                      handleDeleteProperty(propertyId);
                    }}
                    className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Delete Property"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              );
            }}
            emptyMessage={
              searchTerm || rentalUnitsFilter !== 'all' 
                ? 'Try adjusting your search terms or filters.' 
                : 'Get started by adding your first property.'
            }
            emptyIcon={<Building2 className="mx-auto h-12 w-12 text-gray-400" />}
          />
        )}

        {/* Filtered Results Info */}
        {!loading && rentalUnitsFilter !== 'all' && (
          <div className="text-sm text-gray-600 px-2 py-2">
            {filteredProperties.length > 0 ? (
              <>
                Showing {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} 
                {rentalUnitsFilter === 'with_units' ? ' with rental units' : ' without rental units'}
              </>
            ) : (
              <>
                No properties found {rentalUnitsFilter === 'with_units' ? 'with rental units' : 'without rental units'}
              </>
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && rentalUnitsFilter === 'all' && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <Button
                variant="outline"
                onClick={() => fetchProperties(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => fetchProperties(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * perPage + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * perPage, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <Button
                    variant="outline"
                    onClick={() => fetchProperties(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="rounded-l-md"
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        onClick={() => fetchProperties(pageNum)}
                        className={currentPage === pageNum ? "z-10 bg-blue-600 text-white" : ""}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    onClick={() => fetchProperties(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="rounded-r-md"
                  >
                    Next
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
