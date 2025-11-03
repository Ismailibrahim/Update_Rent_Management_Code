'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { ArrowLeft, Save, X } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI, assetsAPI, rentalUnitTypesAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';

interface Property {
  id: number;
  name: string;
  street: string;
  city: string;
  island: string;
  bedrooms: number;
  bathrooms: number;
}

interface Asset {
  id: number;
  name: string;
  brand?: string;
  category: string;
}

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface RentalUnit {
  id: number;
  number_of_rooms: number;
  number_of_toilets: number;
}

function NewRentalUnitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const propertyIdFromUrl = searchParams.get('property');
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [unitTypes, setUnitTypes] = useState<RentalUnitType[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [existingRentalUnits, setExistingRentalUnits] = useState<RentalUnit[]>([]);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const lastFetchedPropertyId = useRef<number | null>(null);
  const [formData, setFormData] = useState({
    property_id: propertyIdFromUrl || '',
    unit_number: '',
    unit_type: '',
    floor_number: '',
    // New separate columns
    rent_amount: '',
    deposit_amount: '',
    currency: 'MVR',
    number_of_rooms: '',
    number_of_toilets: '',
    square_feet: '',
    // Utility meter information
    water_meter_number: '',
    water_billing_account: '',
    electricity_meter_number: '',
    electricity_billing_account: '',
    // Access card numbers
    access_card_numbers: '',
    status: 'available',
    description: '',
    assets: []
  });

  const allowedUnitTypes = ['residential', 'office', 'shop', 'warehouse', 'other'];
  const mapToAllowedUnitType = (name: string): string => {
    if (!name) return 'other';
    const normalized = name.trim().toLowerCase();
    return allowedUnitTypes.includes(normalized) ? normalized : 'other';
  };

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await assetsAPI.getAll();
      setAssets(response.data.assets || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to fetch assets');
    }
  };

  const fetchUnitTypes = async () => {
    try {
      const response = await rentalUnitTypesAPI.getAll({ active_only: true });
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setUnitTypes(types);
    } catch (error) {
      console.error('Error fetching unit types:', error);
    }
  };

  const fetchPropertyDetails = useCallback(async (propertyId: number) => {
    if (isLoadingProperty || lastFetchedPropertyId.current === propertyId) {
      return; // Prevent duplicate calls
    }
    
    try {
      setIsLoadingProperty(true);
      lastFetchedPropertyId.current = propertyId;
      
      const response = await propertiesAPI.getById(propertyId);
      const property = response.data.property;
      setSelectedProperty(property);
      
      // Fetch existing rental units for this property
      const rentalUnitsResponse = await rentalUnitsAPI.getByProperty(propertyId);
      setExistingRentalUnits(rentalUnitsResponse.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to fetch property details');
      lastFetchedPropertyId.current = null; // Reset on error
    } finally {
      setIsLoadingProperty(false);
    }
  }, [isLoadingProperty]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchProperties();
      fetchAssets();
      fetchUnitTypes();
      
      // If coming from a property page, fetch property details
      if (propertyIdFromUrl) {
        fetchPropertyDetails(parseInt(propertyIdFromUrl));
      }
    }
  }, [user, authLoading, router, propertyIdFromUrl, fetchPropertyDetails]);

  const capacity = useMemo(() => {
    if (!selectedProperty) return { availableRooms: 0, availableToilets: 0, totalRooms: 0, totalToilets: 0, allocatedRooms: 0, allocatedToilets: 0 };
    
    const totalRooms = selectedProperty.bedrooms || 0;
    const totalToilets = selectedProperty.bathrooms || 0;
    
    const allocatedRooms = existingRentalUnits.reduce((sum, unit) => sum + unit.number_of_rooms, 0);
    const allocatedToilets = existingRentalUnits.reduce((sum, unit) => sum + unit.number_of_toilets, 0);
    
    return {
      availableRooms: totalRooms - allocatedRooms,
      availableToilets: totalToilets - allocatedToilets,
      totalRooms,
      totalToilets,
      allocatedRooms,
      allocatedToilets
    };
  }, [selectedProperty, existingRentalUnits]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.property_id) {
      toast.error('Please select a property');
      return;
    }

    if (!formData.unit_number) {
      toast.error('Please enter unit number');
      return;
    }

    // Validate capacity
    const requestedRooms = parseInt(formData.number_of_rooms) || 0;
    const requestedToilets = parseFloat(formData.number_of_toilets) || 0;
    
    if (requestedRooms > capacity.availableRooms) {
      toast.error(`Cannot add ${requestedRooms} rooms. Only ${capacity.availableRooms} rooms available.`);
      return;
    }
    
    if (requestedToilets > capacity.availableToilets) {
      toast.error(`Cannot add ${requestedToilets} toilets. Only ${capacity.availableToilets} toilets available.`);
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        property_id: parseInt(formData.property_id),
        floor_number: parseInt(formData.floor_number),
        // New separate columns
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount),
        currency: formData.currency,
        number_of_rooms: parseInt(formData.number_of_rooms),
        number_of_toilets: parseInt(formData.number_of_toilets),
        square_feet: formData.square_feet ? parseFloat(formData.square_feet) : undefined,
        // Utility meter information - convert empty strings to undefined
        water_meter_number: formData.water_meter_number?.trim() || undefined,
        water_billing_account: formData.water_billing_account?.trim() || undefined,
        electricity_meter_number: formData.electricity_meter_number?.trim() || undefined,
        electricity_billing_account: formData.electricity_billing_account?.trim() || undefined,
        // Access card numbers - convert empty strings to undefined
        access_card_numbers: formData.access_card_numbers?.trim() || undefined,
        // Include assets with quantities for creation
        assets: selectedAssets.map(assetId => {
          return {
            asset_id: assetId,
            quantity: 1 // Default quantity for new assignments
          };
        })
      };

      await rentalUnitsAPI.create(submitData);
      
      if (selectedAssets.length > 0) {
        toast.success(`Rental unit created successfully with ${selectedAssets.length} asset(s) assigned`);
      } else {
        toast.success('Rental unit created successfully');
      }
      
      router.push('/rental-units');
    } catch (error: unknown) {
      console.error('Error creating rental unit:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (axiosError.response?.data?.errors) {
          const errors = axiosError.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          toast.error('Failed to create rental unit: ' + (axiosError.response?.data?.message || 'Unknown error'));
        }
      } else {
        toast.error('Failed to create rental unit: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/rental-units');
  };

  const handlePropertyChange = (propertyId: string) => {
    setFormData(prev => ({ ...prev, property_id: propertyId }));
    if (propertyId && propertyId !== propertyIdFromUrl && !isLoadingProperty) {
      // Only fetch if it's different from the URL property ID and not already loading
      fetchPropertyDetails(parseInt(propertyId));
    } else if (!propertyId) {
      setSelectedProperty(null);
      setExistingRentalUnits([]);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Link href="/rental-units" prefetch={true}>
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
            <h1 className="text-3xl font-bold text-gray-900">Add Rental Unit</h1>
            <p className="mt-2 text-gray-600">
              Create a new rental unit
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Rental Unit Details</CardTitle>
            <CardDescription className="text-gray-600">
              Fill in the details for the new rental unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!propertyIdFromUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property * <span className="text-xs text-green-600">(Updated: Shows street address)</span>
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a property</option>
                      {properties.map((property) => {
                        const street = (property.street || '').trim();
                        const city = (property.city || '').trim();
                        const island = (property.island || '').trim();
                        
                        let displayText = property.name;
                        if (street) {
                          displayText = `${property.name} - ${street}`;
                        } else if (city || island) {
                          const location = [city, island].filter(Boolean).join(', ');
                          if (location) {
                            displayText = `${property.name} - ${location}`;
                          }
                        }
                        
                        return (
                          <option key={property.id} value={property.id.toString()}>
                            {displayText}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {propertyIdFromUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      {(() => {
                        const property = properties.find(p => p.id.toString() === propertyIdFromUrl);
                        if (!property) return 'Loading...';
                        const street = (property.street || '').trim();
                        const city = (property.city || '').trim();
                        const island = (property.island || '').trim();
                        
                        if (street) {
                          return `${property.name} - ${street}`;
                        } else if (city || island) {
                          const location = [city, island].filter(Boolean).join(', ');
                          return location ? `${property.name} - ${location}` : property.name;
                        }
                        return property.name;
                      })()}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Number *
                  </label>
                  <Input
                    placeholder="Enter unit number"
                    value={formData.unit_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_number: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Type *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.unit_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
                    required
                  >
                    <option value="">Select unit type</option>
                    {unitTypes.map((unitType) => {
                      const value = mapToAllowedUnitType(unitType.name);
                      return (
                        <option key={unitType.id} value={value}>
                          {unitType.name}
                        </option>
                      );
                    })}
                    {unitTypes.length === 0 && (
                      <>
                        {allowedUnitTypes.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Capacity Display */}
              {selectedProperty && (
                <div key={`capacity-${selectedProperty.id}`} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {/* Property Name Header */}
                  <div className="mb-4 pb-3 border-b border-blue-300">
                    <h3 className="text-xl font-bold text-blue-900 mb-1" data-testid="property-name-header">
                      {selectedProperty.name || 'Property Name'}
                    </h3>
                    {(selectedProperty.street || selectedProperty.city || selectedProperty.island) && (
                      <p className="text-sm text-blue-700 mt-1">
                        {[selectedProperty.street, selectedProperty.city, selectedProperty.island].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Property Capacity</h4>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Bedrooms Column */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-blue-800">Bedrooms</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total:</span>
                          <span className="font-medium">{capacity.totalRooms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Allocated:</span>
                          <span className="font-medium">{capacity.allocatedRooms}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700 font-medium">Available:</span>
                          <span className="font-bold text-green-800">{capacity.availableRooms}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bathrooms Column */}
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-blue-800">Bathrooms</h5>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total:</span>
                          <span className="font-medium">{capacity.totalToilets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Allocated:</span>
                          <span className="font-medium">{capacity.allocatedToilets}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700 font-medium">Available:</span>
                          <span className="font-bold text-green-800">{capacity.availableToilets}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number *
                  </label>
                  <Input
                    type="number"
                    placeholder="Floor number"
                    value={formData.floor_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, floor_number: e.target.value }))}
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      currency: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="MVR">MVR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms *
                  </label>
                  <Input
                    type="number"
                    placeholder="Number of rooms"
                    value={formData.number_of_rooms}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      number_of_rooms: e.target.value
                    }))}
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Toilets *
                  </label>
                  <Input
                    type="number"
                    placeholder="Number of toilets"
                    value={formData.number_of_toilets}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      number_of_toilets: e.target.value
                    }))}
                    min="0"
                    step="0.5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet (Optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="Square feet"
                    value={formData.square_feet}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      square_feet: e.target.value
                    }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Amount *
                  </label>
                  <Input
                    type="number"
                    placeholder="Monthly rent amount"
                    value={formData.rent_amount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      rent_amount: e.target.value
                    }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Amount *
                  </label>
                  <Input
                    type="number"
                    placeholder="Deposit amount"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      deposit_amount: e.target.value
                    }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  placeholder="Unit description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Utility Meter Information */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Utility Meter Information</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Enter water and electricity meter details for this rental unit (optional)
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Meter Number
                    </label>
                    <Input
                      placeholder="Enter water meter number"
                      value={formData.water_meter_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, water_meter_number: e.target.value }))}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Water Billing Account Number
                    </label>
                    <Input
                      placeholder="Enter water billing account number"
                      value={formData.water_billing_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, water_billing_account: e.target.value }))}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electricity Meter Number
                    </label>
                    <Input
                      placeholder="Enter electricity meter number"
                      value={formData.electricity_meter_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, electricity_meter_number: e.target.value }))}
                      maxLength={100}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Electricity Billing Account Number
                    </label>
                    <Input
                      placeholder="Enter electricity billing account number"
                      value={formData.electricity_billing_account}
                      onChange={(e) => setFormData(prev => ({ ...prev, electricity_billing_account: e.target.value }))}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              {/* Access Card Numbers */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Card Numbers</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Enter access card numbers separated by commas (optional). Each card number must be unique across all rental units.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Numbers
                  </label>
                  <textarea
                    placeholder="e.g., CARD001, CARD002, CARD003"
                    value={formData.access_card_numbers}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_card_numbers: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[80px]"
                    maxLength={500}
                  />
                  {formData.access_card_numbers && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Parsed Card Numbers:</p>
                      <ul className="space-y-1">
                        {formData.access_card_numbers
                          .split(',')
                          .map(card => card.trim())
                          .filter(card => card.length > 0)
                          .map((card, index) => (
                            <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                {index + 1}
                              </span>
                              <span>{card}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign Assets (Optional)
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Select assets from the dropdown to assign to this rental unit
                  </p>
                  
                  {assets.length > 0 ? (
                    <div className="space-y-4">
                      {/* Asset Dropdown */}
                      <div>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              const assetId = parseInt(e.target.value);
                              if (!selectedAssets.includes(assetId)) {
                                setSelectedAssets(prev => [...prev, assetId]);
                              }
                              e.target.value = ''; // Reset dropdown
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select an asset to add...</option>
                          {assets.map((asset) => (
                            <option key={asset.id} value={asset.id.toString()}>
                              {asset.name} {asset.brand && `(${asset.brand})`} - {asset.category}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Assets List */}
                      {selectedAssets.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Selected Assets:</h4>
                          <div className="space-y-2">
                            {selectedAssets.map((assetId) => {
                              const asset = assets.find(a => a.id === assetId);
                              if (!asset) return null;
                              
                              return (
                                <div
                                  key={assetId}
                                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                >
                                  <div>
                                    <div className="font-medium text-gray-900">{asset.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {asset.brand && `${asset.brand} • `}{asset.category}
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedAssets(prev => prev.filter(id => id !== assetId))}
                                    className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No assets available. Create assets first to assign them to rental units.</p>
                    </div>
                  )}
                </div>
              </div>

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
                      Create Rental Unit
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

export default function NewRentalUnitPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewRentalUnitPageContent />
    </Suspense>
  );
}
