'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { ArrowLeft, Save, X } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI, assetsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter, useSearchParams } from 'next/navigation';

interface Property {
  id: number;
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
}

interface Asset {
  id: number;
  name: string;
  brand?: string;
  category: string;
}

interface RentalUnit {
  id: number;
  unit_details: {
    numberOfRooms: number;
    numberOfToilets: number;
  };
}

function NewRentalUnitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyIdFromUrl = searchParams.get('property');
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [existingRentalUnits, setExistingRentalUnits] = useState<RentalUnit[]>([]);
  const [formData, setFormData] = useState({
    property_id: propertyIdFromUrl || '',
    unit_number: '',
    floor_number: '',
    unit_details: {
      numberOfRooms: '',
      numberOfToilets: ''
    },
    financial: {
      rentAmount: '',
      depositAmount: '',
      currency: 'MVR'
    },
    status: 'available',
    description: '',
    assets: []
  });

  useEffect(() => {
    fetchProperties();
    fetchAssets();
    
    // If coming from a property page, fetch property details
    if (propertyIdFromUrl) {
      fetchPropertyDetails(parseInt(propertyIdFromUrl));
    }
  }, [propertyIdFromUrl]);

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

  const fetchPropertyDetails = async (propertyId: number) => {
    try {
      const response = await propertiesAPI.getById(propertyId);
      const property = response.data.property;
      setSelectedProperty(property);
      
      // Fetch existing rental units for this property
      const rentalUnitsResponse = await rentalUnitsAPI.getByProperty(propertyId);
      setExistingRentalUnits(rentalUnitsResponse.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to fetch property details');
    }
  };

  const calculateAvailableCapacity = () => {
    if (!selectedProperty) return { availableRooms: 0, availableToilets: 0 };
    
    const totalRooms = selectedProperty.bedrooms || 0;
    const totalToilets = selectedProperty.bathrooms || 0;
    
    const allocatedRooms = existingRentalUnits.reduce((sum, unit) => sum + unit.unit_details.numberOfRooms, 0);
    const allocatedToilets = existingRentalUnits.reduce((sum, unit) => sum + unit.unit_details.numberOfToilets, 0);
    
    return {
      availableRooms: totalRooms - allocatedRooms,
      availableToilets: totalToilets - allocatedToilets,
      totalRooms,
      totalToilets,
      allocatedRooms,
      allocatedToilets
    };
  };

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
    const capacity = calculateAvailableCapacity();
    const requestedRooms = parseInt(formData.unit_details.numberOfRooms) || 0;
    const requestedToilets = parseFloat(formData.unit_details.numberOfToilets) || 0;
    
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
        unit_details: {
          numberOfRooms: parseInt(formData.unit_details.numberOfRooms),
          numberOfToilets: parseFloat(formData.unit_details.numberOfToilets)
        },
        financial: {
          rentAmount: parseFloat(formData.financial.rentAmount),
          depositAmount: parseFloat(formData.financial.depositAmount),
          currency: formData.financial.currency
        },
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
    if (propertyId) {
      fetchPropertyDetails(parseInt(propertyId));
    } else {
      setSelectedProperty(null);
      setExistingRentalUnits([]);
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
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
                      Property *
                    </label>
                    <select
                      value={formData.property_id}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id.toString()}>
                          {property.name} - {property.address}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {propertyIdFromUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property
                    </label>
                    <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
                      {properties.find(p => p.id.toString() === propertyIdFromUrl)?.name || 'Loading...'}
                    </div>
                  </div>
                )}

                {/* Capacity Display */}
                {selectedProperty && (
                  <div className="col-span-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Property Capacity</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-700">Total Bedrooms:</span>
                          <span className="ml-2 font-medium">{calculateAvailableCapacity().totalRooms}</span>
                        </div>
                        <div>
                          <span className="text-blue-700">Total Bathrooms:</span>
                          <span className="ml-2 font-medium">{calculateAvailableCapacity().totalToilets}</span>
                        </div>
                        <div>
                          <span className="text-blue-700">Allocated Bedrooms:</span>
                          <span className="ml-2 font-medium">{calculateAvailableCapacity().allocatedRooms}</span>
                        </div>
                        <div>
                          <span className="text-blue-700">Allocated Bathrooms:</span>
                          <span className="ml-2 font-medium">{calculateAvailableCapacity().allocatedToilets}</span>
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Available Bedrooms:</span>
                          <span className="ml-2 font-bold text-green-800">{calculateAvailableCapacity().availableRooms}</span>
                        </div>
                        <div>
                          <span className="text-green-700 font-medium">Available Bathrooms:</span>
                          <span className="ml-2 font-bold text-green-800">{calculateAvailableCapacity().availableToilets}</span>
                        </div>
                      </div>
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
              </div>

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
                    value={formData.financial.currency}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      financial: { ...prev.financial, currency: e.target.value }
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
                    value={formData.unit_details.numberOfRooms}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      unit_details: { ...prev.unit_details, numberOfRooms: e.target.value }
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
                    value={formData.unit_details.numberOfToilets}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      unit_details: { ...prev.unit_details, numberOfToilets: e.target.value }
                    }))}
                    min="0"
                    step="0.5"
                    required
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
                    value={formData.financial.rentAmount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      financial: { ...prev.financial, rentAmount: e.target.value }
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
                    value={formData.financial.depositAmount}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      financial: { ...prev.financial, depositAmount: e.target.value }
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
                                    className="text-red-600 hover:text-red-700"
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

              <div className="flex justify-end space-x-4 pt-6">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Creating...' : 'Create Rental Unit'}
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
