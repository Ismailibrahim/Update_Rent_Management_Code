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
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { propertiesAPI } from '@/services/api';
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

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<PropertyFormData | null>(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<PropertyFormData>({
    defaultValues: {
      status: 'vacant',
      type: 'apartment',
      number_of_floors: 1,
      number_of_rental_units: 1
    }
  });

  const fetchProperty = useCallback(async () => {
    try {
      setLoading(true);
      const response = await propertiesAPI.getById(parseInt(propertyId));
      const propertyData = response.data.property;
      
      // Map the property data to form data
      const formData: PropertyFormData = {
        name: propertyData.name || '',
        street: propertyData.street || '',
        city: propertyData.city || '',
        island: propertyData.island || '',
        type: propertyData.type || 'apartment',
        status: propertyData.status || 'vacant',
        number_of_floors: propertyData.number_of_floors || 1,
        number_of_rental_units: propertyData.number_of_rental_units || 1,
        bedrooms: propertyData.bedrooms || 0,
        bathrooms: propertyData.bathrooms || 0,
        square_feet: propertyData.square_feet || 0,
        year_built: propertyData.year_built || new Date().getFullYear(),
        description: propertyData.description || ''
      };
      
      setProperty(formData);
      reset(formData);
    } catch (error) {
      console.error('Error fetching property:', error);
      toast.error('Failed to fetch property details');
      router.push('/properties');
    } finally {
      setLoading(false);
    }
  }, [propertyId, router, reset]);

  useEffect(() => {
    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, fetchProperty]);

  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);
      await propertiesAPI.update(parseInt(propertyId), data);
      toast.success('Property updated successfully!');
      router.push('/properties');
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Failed to update property');
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCancel}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
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
                    >
                      <option value="apartment">Apartment</option>
                      <option value="house">House</option>
                      <option value="villa">Villa</option>
                      <option value="commercial">Commercial</option>
                      <option value="office">Office</option>
                      <option value="shop">Shop</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="land">Land</option>
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
                    <Input
                      placeholder="Enter island"
                      {...register('island', { required: 'Island is required' })}
                    />
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
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center"
                >
                  {loading ? (
                    'Updating...'
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
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
