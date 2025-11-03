'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { ArrowLeft, Edit, Trash2, Building2, MapPin, Calendar, Users, Home } from 'lucide-react';
import { propertiesAPI, rentalUnitsAPI } from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';

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

interface RentalUnit {
  id: number;
  property_id: number;
  unit_number: string;
  floor_number: number;
  number_of_rooms: number;
  number_of_toilets: number;
  rent_amount: number;
  deposit_amount: number;
  currency: string;
  status: string;
  tenant_id?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: number;
    name: string;
  };
}

export default function PropertyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [rentalUnitsLoading, setRentalUnitsLoading] = useState(false);

  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertiesAPI.getById(parseInt(propertyId));
      setProperty(response.data.property);
      setLoading(false); // Stop loading as soon as property data arrives
    } catch (error: unknown) {
      console.error('Error fetching property:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch property details';
      let responseStatus: number | undefined;
      
      if (error && typeof error === 'object' && 'response' in error) {
        // Server responded with error
        const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
        const status = axiosError.response?.status;
        responseStatus = status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to view this property.';
        } else if (status === 404) {
          errorMessage = 'Property not found.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = message;
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        // Request made but no response (network error)
        errorMessage = 'Network error. Please check your connection and ensure the backend API is running.';
      } else if (error instanceof Error) {
        // Error setting up request
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      
      // Only redirect if it's a 404 or 403 error
      if (responseStatus === 404 || responseStatus === 403) {
        router.push('/properties');
      } else {
        setLoading(false); // Ensure loading is set to false on error too
      }
    }
  }, [propertyId, router]);

  const fetchRentalUnits = useCallback(async () => {
    try {
      setRentalUnitsLoading(true);
      console.log('Fetching rental units for property ID:', propertyId);
      const response = await rentalUnitsAPI.getByProperty(parseInt(propertyId));
      console.log('Rental units response:', response);
      setRentalUnits(response.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      toast.error('Failed to fetch rental units');
    } finally {
      setRentalUnitsLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (propertyId) {
      // Fetch property first (critical data), then rental units (secondary data)
      // This allows the page to render property details immediately while rental units load
      fetchProperty();
      fetchRentalUnits(); // Don't wait for this to render the page
    }
  }, [propertyId, fetchProperty, fetchRentalUnits]);

  // Edit navigation is now handled by Link component with prefetch - no need for this handler

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    
    try {
      await propertiesAPI.delete(parseInt(propertyId));
      toast.success('Property deleted successfully');
      router.push('/properties');
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleDeleteRentalUnit = async (rentalUnitId: number) => {
    if (!confirm('Are you sure you want to delete this rental unit?')) return;
    
    try {
      await rentalUnitsAPI.delete(rentalUnitId);
      toast.success('Rental unit deleted successfully');
      // Refresh rental units list
      fetchRentalUnits();
    } catch (error) {
      console.error('Error deleting rental unit:', error);
      toast.error('Failed to delete rental unit');
    }
  };

  // Back navigation can use router.push since it's going back to a list page
  const handleBack = () => {
    router.push('/properties');
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6 animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-4 w-full bg-gray-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!property) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h2>
            <p className="text-gray-600 mb-4">The property you&apos;re looking for doesn&apos;t exist.</p>
            <Button onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/properties" prefetch={true}>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              <p className="mt-2 text-gray-600">
                <MapPin className="h-4 w-4 inline mr-1" />
                {property.street}, {property.city}, {property.island}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href={`/properties/${propertyId}/edit`} prefetch={true}>
              <Button className="flex items-center">
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Property Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Property Type</label>
                      <p className="text-lg font-semibold capitalize">{property.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Status</label>
                      <div className="mt-1">
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
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Number of Floors</label>
                      <p className="text-lg font-semibold">{property.number_of_floors}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Rental Units</label>
                      <p className="text-lg font-semibold">{property.number_of_rental_units}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bedrooms</label>
                      <p className="text-lg font-semibold">{property.bedrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Bathrooms</label>
                      <p className="text-lg font-semibold">{property.bathrooms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Square Feet</label>
                      <p className="text-lg font-semibold">
                        {property.square_feet ? property.square_feet.toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Year Built</label>
                      <p className="text-lg font-semibold">{property.year_built || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            {property.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Rental Units */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Home className="h-5 w-5 mr-2" />
                    Rental Units ({rentalUnits.length})
                  </CardTitle>
                  <Button 
                    onClick={() => router.push(`/rental-units/new?property=${propertyId}`)}
                    size="sm"
                  >
                    Add Unit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {rentalUnitsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : rentalUnits.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Floor
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rooms/Toilets
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rent
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tenant
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {rentalUnits.map((unit) => (
                          <tr key={unit.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                Unit {unit.unit_number}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {unit.floor_number}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {unit.number_of_rooms}/{unit.number_of_toilets}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {unit.currency} {unit.rent_amount?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                unit.status === 'available' 
                                  ? 'bg-green-100 text-green-800' 
                                  : unit.status === 'occupied'
                                  ? 'bg-red-100 text-red-800'
                                  : unit.status === 'deactivated'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {unit.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {unit.status === 'occupied' && unit.tenant 
                                  ? unit.tenant.name 
                                  : 'Available'
                                }
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => router.push(`/rental-units/${unit.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleDeleteRentalUnit(unit.id)}
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
                ) : (
                  <div className="text-center py-8">
                    <Home className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No rental units</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new rental unit.</p>
                    <div className="mt-6">
                      <Button 
                        onClick={() => router.push(`/rental-units/new?property=${propertyId}`)}
                        size="sm"
                      >
                        Add Rental Unit
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(property.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Last Updated</label>
                  <p className="text-sm text-gray-900">
                    {new Date(property.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push(`/rental-units?property=${propertyId}`)}
                  className="w-full flex items-center justify-center"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  View Rental Units
                </Button>
                <Button 
                  onClick={() => router.push(`/rental-units/new?property=${propertyId}`)}
                  className="w-full flex items-center justify-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Add Rental Unit
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
