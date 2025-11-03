'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  description?: string;
}

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<RentalUnitType[]>([]);
  const [islands, setIslands] = useState<Island[]>([]);
  
  const { register, handleSubmit, formState: { errors } } = useForm<PropertyFormData>({
    defaultValues: {
      status: 'vacant',
      type: '',
      number_of_floors: 1,
      number_of_rental_units: 1
    }
  });

  useEffect(() => {
    const fetchPropertyTypes = async () => {
      try {
        const response = await rentalUnitTypesAPI.getAll({ active_only: true });
        const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
        setPropertyTypes(types);
      } catch (error) {
        console.error('Error fetching property types:', error);
        toast.error('Failed to fetch property types');
      }
    };

    const fetchIslands = async () => {
      try {
        const response = await islandsAPI.getAll({ active_only: true });
        const islandsData = response.data?.data || [];
        setIslands(islandsData);
      } catch (error) {
        console.error('Error fetching islands:', error);
        toast.error('Failed to fetch islands');
      }
    };

    fetchPropertyTypes();
    fetchIslands();
  }, []);

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);
      await propertiesAPI.create(data);
      toast.success('Property created successfully!');
      router.push('/properties');
    } catch (error: unknown) {
      console.error('Error creating property:', error);
      
      let errorMessage = 'Failed to create property';
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
        const errors = axiosError.response?.data?.errors;
        
        if (errors) {
          // Display specific error messages
          const errorList = Object.values(errors).flat();
          errorMessage = errorList.join(', ');
        } else {
          errorMessage = axiosError.response?.data?.message || axiosError.response?.data?.error || errorMessage;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/properties');
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
            <p className="mt-2 text-gray-600">
              Create a new rental property
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
              Enter the details for your new property
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
                    >
                      <option value="">Select property type</option>
                      {propertyTypes.map((type) => (
                        <option key={type.id} value={type.name.toLowerCase()}>
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
                      City *
                    </label>
                    <Input
                      placeholder="Enter city"
                      {...register('city', { required: 'City is required' })}
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Island *
                    </label>
                    <Select
                      {...register('island', { required: 'Island is required' })}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Floors *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...register('number_of_floors', { 
                        required: 'Number of floors is required',
                        valueAsNumber: true 
                      })}
                    />
                    {errors.number_of_floors && (
                      <p className="mt-1 text-sm text-red-600">{errors.number_of_floors.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Number of Rental Units *
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bedrooms *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      {...register('bedrooms', { 
                        required: 'Number of bedrooms is required',
                        min: { value: 1, message: 'At least 1 bedroom is required' },
                        valueAsNumber: true 
                      })}
                    />
                    {errors.bedrooms && (
                      <p className="mt-1 text-sm text-red-600">{errors.bedrooms.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bathrooms *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.5"
                      placeholder="1"
                      {...register('bathrooms', { 
                        required: 'Number of bathrooms is required',
                        min: { value: 1, message: 'At least 1 bathroom is required' },
                        valueAsNumber: true 
                      })}
                    />
                    {errors.bathrooms && (
                      <p className="mt-1 text-sm text-red-600">{errors.bathrooms.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Square Feet
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...register('square_feet', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year Built
                    </label>
                    <Input
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      placeholder="2020"
                      {...register('year_built', { valueAsNumber: true })}
                    />
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

              {/* Description */}
              <FormSection title="Description">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Enter property description..."
                    rows={4}
                    {...register('description')}
                  />
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Property
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
