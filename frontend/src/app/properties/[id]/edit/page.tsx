'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { Textarea } from '@/components/UI/Textarea';
import { FormSection } from '@/components/UI/FormSection';
import { ArrowLeft, Save, Building2, X } from 'lucide-react';
import Link from 'next/link';
import { propertiesAPI, rentalUnitTypesAPI, islandsAPI, Island } from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';

interface PropertyFormData {
  name: string;
  street: string;
  island: string;
  type: string;
  status: string;
  number_of_rental_units: number;
}

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<PropertyFormData | null>(null);
  const [propertyTypes, setPropertyTypes] = useState<RentalUnitType[]>([]);
  const [islands, setIslands] = useState<Island[]>([]);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<PropertyFormData>({
    defaultValues: {
      status: 'vacant',
      type: '',
      island: '',
      number_of_rental_units: 1
    }
  });
  
  const selectedType = watch('type');
  const selectedIsland = watch('island');

  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertiesAPI.getById(parseInt(propertyId));
      const propertyData = response.data.property;
      
      // Map the property data to form data
      const formData: PropertyFormData = {
        name: propertyData.name || '',
        street: propertyData.street || '',
        island: propertyData.island || '',
        type: propertyData.type || '',
        status: propertyData.status || 'vacant',
        number_of_rental_units: propertyData.number_of_rental_units || 1
      };
      
      setProperty(formData);
      reset(formData);
      
      // Ensure property type is set correctly after types are loaded
      // The type from backend should match exactly with propertyTypes names
      if (formData.type) {
        setValue('type', formData.type);
      }
    } catch (error: unknown) {
      console.error('Error fetching property:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to fetch property details';
      let responseStatus: number | undefined;
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
        const status = axiosError.response?.status;
        responseStatus = status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to edit this property.';
        } else if (status === 404) {
          errorMessage = 'Property not found.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please check backend logs.';
        } else {
          errorMessage = message;
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        errorMessage = 'Network error. Please check your connection and ensure the backend API is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
      
      // Only redirect on 404 or 403
      if (responseStatus === 404 || responseStatus === 403) {
        router.push('/properties');
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId, router, reset]);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, fetchProperty]);

  useEffect(() => {
    // Fetch property types and islands in parallel for faster loading
    const fetchData = async () => {
      try {
        const [typesResponse, islandsResponse] = await Promise.all([
          rentalUnitTypesAPI.getPropertyTypes({ active_only: true }),
          islandsAPI.getAll({ active_only: true })
        ]);
        
        const types = (typesResponse.data?.data?.unitTypes ?? typesResponse.data?.unitTypes) || [];
        const islandsData = islandsResponse.data?.data || [];
        
        setPropertyTypes(types);
        setIslands(islandsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      }
    };

    fetchData();
  }, []);

  // Sync property type when both property and propertyTypes are available
  useEffect(() => {
    if (property && property.type && propertyTypes.length > 0) {
      // Find the exact match (case-insensitive) and set the correct case
      const matchedType = propertyTypes.find(
        t => t.name.toLowerCase() === property.type.toLowerCase()
      );
      if (matchedType && matchedType.name !== property.type) {
        // Update to the correct case from database
        setValue('type', matchedType.name);
        setProperty(prev => prev ? { ...prev, type: matchedType.name } : null);
      } else if (matchedType) {
        // Ensure form value is set even if case matches
        setValue('type', matchedType.name);
      }
    }
  }, [property, propertyTypes, setValue]);

  // Sync island when both property and islands are available
  useEffect(() => {
    if (property && property.island && islands.length > 0) {
      // Find the exact match (case-insensitive) and set the correct case
      const matchedIsland = islands.find(
        i => i.name.toLowerCase() === property.island.toLowerCase()
      );
      if (matchedIsland && matchedIsland.name !== property.island) {
        // Update to the correct case from database
        setValue('island', matchedIsland.name);
        setProperty(prev => prev ? { ...prev, island: matchedIsland.name } : null);
      } else if (matchedIsland) {
        // Ensure form value is set even if case matches
        setValue('island', matchedIsland.name);
      }
    }
  }, [property, islands, setValue]);

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);
      console.log('Updating property with data:', data);
      
      await propertiesAPI.update(parseInt(propertyId), data);
      
      toast.success('Property updated successfully!');
      router.push('/properties');
    } catch (error: unknown) {
      console.error('Error updating property:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to update property';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { 
          response?: { 
            status?: number; 
            data?: { 
              message?: string; 
              error?: string; 
              errors?: Record<string, string[]> 
            } 
          } 
        };
        const status = axiosError.response?.status;
        const message = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        const errors = axiosError.response?.data?.errors;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You don\'t have permission to edit this property.';
        } else if (status === 404) {
          errorMessage = 'Property not found.';
        } else if (status === 400 && errors) {
          // Validation errors (including duplicates)
          const errorList = Object.values(errors).flat().join(', ');
          errorMessage = errorList;
        } else if (status === 422 && errors) {
          // Validation errors
          const errorList = Object.values(errors).flat().join(', ');
          errorMessage = `Validation failed: ${errorList}`;
        } else if (status === 500) {
          errorMessage = `Server error: ${message}. Please check backend logs.`;
        } else {
          errorMessage = message;
        }
      } else if (error && typeof error === 'object' && 'request' in error) {
        errorMessage = 'Network error. Please check your connection and ensure the backend API is running.';
      } else if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/properties');
  };

  if (loading && !property) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Link href="/properties" prefetch={true}>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Property</h1>
            <p className="mt-2 text-gray-600">
              Update property information
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Property Information
            </CardTitle>
            <CardDescription>
              Update the details for this property
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Name *
                    </label>
                    <Input
                      placeholder="Enter property name"
                      {...register('name', { required: 'Property name is required' })}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <Select
                      {...register('type', { required: 'Property type is required' })}
                      value={selectedType || property?.type || ''}
                      onChange={(e) => setValue('type', e.target.value, { shouldValidate: true })}
                    >
                      <option value="">Select property type</option>
                      {propertyTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                      {propertyTypes.length === 0 && (
                        <option value="" disabled>Loading types...</option>
                      )}
                    </Select>
                    {errors.type && (
                      <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <Input
                      placeholder="Enter street address"
                      {...register('street', { required: 'Street address is required' })}
                    />
                    {errors.street && (
                      <p className="mt-1 text-sm text-red-600">{errors.street.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Island *
                    </label>
                    <Select
                      {...register('island', { required: 'Island is required' })}
                      value={selectedIsland || property?.island || ''}
                      onChange={(e) => setValue('island', e.target.value, { shouldValidate: true })}
                    >
                      <option value="">Select island</option>
                      {islands.map((island) => (
                        <option key={island.id} value={island.name}>
                          {island.name}
                        </option>
                      ))}
                      {islands.length === 0 && (
                        <option value="" disabled>Loading islands...</option>
                      )}
                    </Select>
                    {errors.island && (
                      <p className="mt-1 text-sm text-red-600">{errors.island.message}</p>
                    )}
                  </div>
                </div>
              </FormSection>

              {/* Property Details */}
              <FormSection title="Property Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Rental Units *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...register('number_of_rental_units', { 
                        required: 'Number of rental units is required',
                        valueAsNumber: true 
                      })}
                    />
                    {errors.number_of_rental_units && (
                      <p className="mt-1 text-sm text-red-600">{errors.number_of_rental_units.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Maximum number of rental units in this property</p>
                  </div>
                </div>
              </FormSection>

              {/* Status Information */}
              <FormSection title="Status Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <Select {...register('status')}>
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="maintenance">Under Maintenance</option>
                      <option value="renovation">Under Renovation</option>
                    </Select>
                  </div>
                </div>
              </FormSection>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Property
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
