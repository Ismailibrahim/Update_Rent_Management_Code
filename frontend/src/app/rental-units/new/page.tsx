'use client';

import React, { useState, useEffect, Suspense, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { ArrowLeft, Save, X } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI, assetsAPI, rentalUnitTypesAPI, currenciesAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import Link from 'next/link';

interface Property {
  id: number;
  name: string;
  street: string;
  island: string;
  bedrooms?: number;
  bathrooms?: number;
  number_of_rental_units?: number;
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

interface Currency {
  id: number;
  code: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface RentalUnit {
  id: number;
  property_id: number;
  number_of_rooms: number;
  number_of_toilets: number;
  status?: string;
}

function NewRentalUnitPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const propertyIdFromUrl = searchParams.get('property');
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [unitTypes, setUnitTypes] = useState<RentalUnitType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  // Each entry represents one asset item (qty=1) with optional location and installation date
  const [selectedAssets, setSelectedAssets] = useState<Array<{
    assetId: number, 
    quantity: 1, 
    location?: string, 
    installationDate?: string,
    id: string // Unique ID for React key
  }>>([]);
  const [assetQuantityInput, setAssetQuantityInput] = useState<string>('1');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [existingRentalUnits, setExistingRentalUnits] = useState<RentalUnit[]>([]);
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const lastFetchedPropertyId = useRef<number | null>(null);
  const [selectedDepositMonths, setSelectedDepositMonths] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    property_id: '',
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
    assets: []
  });
  const [isMounted, setIsMounted] = useState(false);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [allRentalUnits, setAllRentalUnits] = useState<RentalUnit[]>([]);

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
      const response = await rentalUnitTypesAPI.getUnitTypes({ active_only: true });
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setUnitTypes(types);
      
      if (types.length === 0) {
        console.warn('No unit types found in database. Using fallback options.');
      }
    } catch (error) {
      console.error('Error fetching unit types:', error);
      // Show a warning toast if API fails, but still allow form submission with fallback options
      toast.error('Failed to load unit types from server. Using default options.', { duration: 3000 });
      setUnitTypes([]); // Ensure fallback options are shown
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await currenciesAPI.getAll();
      const fetchedCurrencies = response.data.currencies || [];
      setCurrencies(fetchedCurrencies);
      
      // Set default currency to the one marked as is_default, or use the first currency
      // Only update if formData.currency is still the default 'MVR' (initial state)
      if (fetchedCurrencies.length > 0 && formData.currency === 'MVR') {
        const defaultCurrency = fetchedCurrencies.find((c: Currency) => c.is_default);
        const currencyToUse = defaultCurrency || fetchedCurrencies[0];
        if (currencyToUse.code !== 'MVR') {
          setFormData(prev => ({ ...prev, currency: currencyToUse.code }));
        }
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to fetch currencies');
    }
  };

  const fetchAllRentalUnits = async () => {
    try {
      const response = await rentalUnitsAPI.getAll();
      setAllRentalUnits(response.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      // Don't show error toast as this is not critical for the form
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

  // Set mounted state and initialize property_id from URL after mount
  useEffect(() => {
    setIsMounted(true);
    if (propertyIdFromUrl) {
      setFormData(prev => ({ ...prev, property_id: propertyIdFromUrl }));
    }
  }, [propertyIdFromUrl]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchProperties();
      fetchAssets();
      fetchUnitTypes();
      fetchCurrencies();
      fetchAllRentalUnits();
      
      // If coming from a property page, fetch property details
      if (propertyIdFromUrl) {
        fetchPropertyDetails(parseInt(propertyIdFromUrl));
      }
    }
  }, [user, authLoading, router, propertyIdFromUrl, fetchPropertyDetails]);

  // Calculate deposit amount when checkbox is checked or rent amount changes
  useEffect(() => {
    if (selectedDepositMonths && formData.rent_amount) {
      const rentAmount = parseFloat(formData.rent_amount);
      if (!isNaN(rentAmount) && rentAmount > 0) {
        const depositAmount = rentAmount * selectedDepositMonths;
        setFormData(prev => ({ ...prev, deposit_amount: depositAmount.toFixed(2) }));
      }
    }
  }, [selectedDepositMonths, formData.rent_amount]);

  const capacity = useMemo(() => {
    if (!selectedProperty) return { 
      availableRooms: 0, 
      availableToilets: 0, 
      totalRooms: 0, 
      totalToilets: 0, 
      allocatedRooms: 0, 
      allocatedToilets: 0,
      maxUnits: 0,
      existingUnits: 0,
      remainingUnits: 0
    };
    
    const totalRooms = selectedProperty.bedrooms || 0;
    const totalToilets = selectedProperty.bathrooms || 0;
    
    const allocatedRooms = existingRentalUnits.reduce((sum, unit) => sum + unit.number_of_rooms, 0);
    const allocatedToilets = existingRentalUnits.reduce((sum, unit) => sum + unit.number_of_toilets, 0);
    
    // Get property's max rental units (from properties table)
    const maxUnits = selectedProperty.number_of_rental_units || 0;
    const existingUnits = existingRentalUnits.length;
    const remainingUnits = Math.max(0, maxUnits - existingUnits);
    
    return {
      availableRooms: totalRooms - allocatedRooms,
      availableToilets: totalToilets - allocatedToilets,
      totalRooms,
      totalToilets,
      allocatedRooms,
      allocatedToilets,
      maxUnits,
      existingUnits,
      remainingUnits
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

    // Validate rental unit capacity
    if (capacity.remainingUnits <= 0) {
      toast.error(
        `Cannot create rental unit. Property "${selectedProperty?.name || 'selected property'}" has reached its maximum capacity of ${capacity.maxUnits} units. No more units can be added to this property.`,
        { duration: 6000 }
      );
      return;
    }

    // Validate capacity (only if property has bedrooms/bathrooms defined)
    if (selectedProperty?.bedrooms || selectedProperty?.bathrooms) {
      const requestedRooms = parseInt(formData.number_of_rooms) || 0;
      const requestedToilets = parseFloat(formData.number_of_toilets) || 0;
      
      if (selectedProperty.bedrooms && requestedRooms > capacity.availableRooms) {
        toast.error(`Cannot add ${requestedRooms} rooms. Only ${capacity.availableRooms} rooms available.`);
        return;
      }
      
      if (selectedProperty.bathrooms && requestedToilets > capacity.availableToilets) {
        toast.error(`Cannot add ${requestedToilets} toilets. Only ${capacity.availableToilets} toilets available.`);
        return;
      }
    }

    try {
      setLoading(true);
      // Helper function to safely parse numeric values
      const parseNumericValue = (value: string): number | null => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      const parseIntegerValue = (value: string): number | null => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          return null;
        }
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
      };

      const submitData: any = {
        property_id: parseInt(formData.property_id),
        unit_number: formData.unit_number,
        unit_type: formData.unit_type,
        floor_number: parseIntegerValue(formData.floor_number),
        // New separate columns
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: parseFloat(formData.deposit_amount),
        currency: formData.currency,
        number_of_rooms: parseIntegerValue(formData.number_of_rooms),
        number_of_toilets: parseNumericValue(formData.number_of_toilets),
        square_feet: parseNumericValue(formData.square_feet),
        status: formData.status,
        // Utility meter information - convert empty strings to null
        water_meter_number: formData.water_meter_number?.trim() || null,
        water_billing_account: formData.water_billing_account?.trim() || null,
        electricity_meter_number: formData.electricity_meter_number?.trim() || null,
        electricity_billing_account: formData.electricity_billing_account?.trim() || null,
        // Access card numbers - convert empty strings to null
        access_card_numbers: formData.access_card_numbers?.trim() || null,
      };
      
      // Remove null values from optional fields to keep payload clean
      const optionalFields = ['floor_number', 'number_of_rooms', 'number_of_toilets', 'square_feet', 'water_meter_number', 'water_billing_account', 'electricity_meter_number', 'electricity_billing_account', 'access_card_numbers'];
      optionalFields.forEach(field => {
        if (submitData[field] === null || submitData[field] === undefined) {
          delete submitData[field];
        }
      });

      // Only include assets if there are any selected
      // Each entry is already qty=1, so we send them as separate entries
      if (selectedAssets.length > 0) {
        submitData.assets = selectedAssets.map(asset => {
          const assetData: any = {
            asset_id: parseInt(String(asset.assetId)), // Ensure it's an integer
            quantity: 1 // Always 1 per entry (integer)
          };
          
          // Add optional fields only if they have values
          if (asset.location && asset.location.trim()) {
            assetData.asset_location = asset.location.trim();
          }
          
          if (asset.installationDate && asset.installationDate.trim()) {
            assetData.installation_date = asset.installationDate.trim();
          }
          
          return assetData;
        });
      }

      // Debug log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Submitting rental unit data:', JSON.stringify(submitData, null, 2));
        if (submitData.assets) {
          console.log('Assets being sent:', JSON.stringify(submitData.assets, null, 2));
        }
      }

      await rentalUnitsAPI.create(submitData);
      
      if (selectedAssets.length > 0) {
        toast.success(`Rental unit created successfully with ${selectedAssets.length} asset item(s) assigned`);
      } else {
        toast.success('Rental unit created successfully');
      }
      
      router.push('/rental-units');
    } catch (error: unknown) {
      console.error('Error creating rental unit:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string }; status?: number } };
        
        // Log full error details for debugging
        console.error('Full error response:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
        });
        
        if (axiosError.response?.data?.errors) {
          const errors = axiosError.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          const errorText = errorMessages.join(', ');
          console.error('Validation errors:', errors);
          toast.error('Validation failed: ' + errorText, { duration: 5000 });
        } else {
          const errorMessage = axiosError.response?.data?.message || 'Unknown error';
          console.error('Error message:', errorMessage);
          toast.error('Failed to create rental unit: ' + errorMessage);
        }
      } else {
        console.error('Unexpected error format:', error);
        toast.error('Failed to create rental unit: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/rental-units');
  };

  const handleAddAsset = () => {
    if (!selectedAssetId) {
      toast.error('Please select an asset first');
      return;
    }

    const quantity = parseInt(assetQuantityInput) || 1;
    if (quantity <= 0) {
      toast.error('Quantity must be at least 1');
      return;
    }

    const assetId = parseInt(selectedAssetId);
    const asset = assets.find(a => a.id === assetId);
    if (asset) {
      // Create separate entries for each quantity
      const newEntries = Array.from({ length: quantity }, (_, i) => ({
        assetId,
        quantity: 1 as const,
        location: '',
        installationDate: '',
        id: `${assetId}-${Date.now()}-${i}-${Math.random()}`
      }));
      setSelectedAssets(prev => [...prev, ...newEntries]);
      setSelectedAssetId('');
      setAssetQuantityInput('1');
    }
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

  // Filter properties based on checkbox state
  const filteredProperties = useMemo(() => {
    if (!showAvailableOnly) {
      return properties;
    }

    // Calculate rental unit counts for each property
    const propertyUnitCounts = new Map<number, { total: number; available: number }>();
    
    allRentalUnits.forEach(unit => {
      const propertyId = unit.property_id;
      const current = propertyUnitCounts.get(propertyId) || { total: 0, available: 0 };
      propertyUnitCounts.set(propertyId, {
        total: current.total + 1,
        available: current.available + (unit.status === 'available' ? 1 : 0)
      });
    });

    // Filter properties that have remaining capacity for new rental units
    // Only show properties where remainingUnits > 0 (can still create new units)
    return properties.filter(property => {
      const counts = propertyUnitCounts.get(property.id) || { total: 0, available: 0 };
      const maxUnits = property.number_of_rental_units || 0;
      const existingUnits = counts.total;
      const remainingUnits = Math.max(0, maxUnits - existingUnits);

      // Only show properties that have remaining capacity
      return remainingUnits > 0;
    });
  }, [properties, showAvailableOnly, allRentalUnits]);

  // Clear selected property if it's filtered out when checkbox is toggled
  useEffect(() => {
    if (formData.property_id && showAvailableOnly) {
      const isPropertyInFilteredList = filteredProperties.some(
        p => p.id.toString() === formData.property_id
      );
      if (!isPropertyInFilteredList) {
        // Property doesn't meet filter criteria, clear selection
        setFormData(prev => ({ ...prev, property_id: '' }));
        setSelectedProperty(null);
        setExistingRentalUnits([]);
        toast.info('Selected property has no remaining capacity. Please select a different property.');
      }
    }
  }, [showAvailableOnly, filteredProperties, formData.property_id]);

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
            <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {!propertyIdFromUrl && (
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Property * <span className="text-xs text-green-600">(Updated: Shows street address)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showAvailableOnly}
                          onChange={(e) => setShowAvailableOnly(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Available Properties</span>
                      </label>
                    </div>
                    <select
                      value={formData.property_id}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      suppressHydrationWarning
                    >
                      <option value="">Select a property</option>
                      {filteredProperties.map((property) => {
                        const street = (property.street || '').trim();
                        const island = (property.island || '').trim();
                        
                        let displayText = property.name;
                        if (street && island) {
                          displayText = `${property.name} - ${street}, ${island}`;
                        } else if (street) {
                          displayText = `${property.name} - ${street}`;
                        } else if (island) {
                          displayText = `${property.name} - ${island}`;
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
                        const island = (property.island || '').trim();
                        
                        if (street && island) {
                          return `${property.name} - ${street}, ${island}`;
                        } else if (street) {
                          return `${property.name} - ${street}`;
                        } else if (island) {
                          return `${property.name} - ${island}`;
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={formData.unit_type || ''}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      setFormData(prev => ({ ...prev, unit_type: selectedValue }));
                    }}
                    required
                    disabled={loading || isLoadingProperty}
                    suppressHydrationWarning
                  >
                    <option value="">Select unit type</option>
                    {unitTypes.map((unitType) => {
                      // Map unit type names to backend-compatible values
                      const normalizedName = unitType.name.trim().toLowerCase();
                      let value = 'other'; // default fallback
                      
                      if (normalizedName === 'office') {
                        value = 'office';
                      } else if (normalizedName.includes('retail') || normalizedName.includes('shop')) {
                        value = 'shop';
                      } else if (normalizedName === 'warehouse') {
                        value = 'warehouse';
                      } else if (normalizedName === 'residential' || normalizedName.includes('studio') || normalizedName.includes('br') || normalizedName.includes('penthouse')) {
                        value = 'residential';
                      } else if (normalizedName === 'other') {
                        value = 'other';
                      } else if (allowedUnitTypes.includes(normalizedName)) {
                        value = normalizedName;
                      }
                      
                      // Use a unique key based on both id and name to ensure React properly tracks changes
                      return (
                        <option key={`${unitType.id}-${unitType.name}`} value={value}>
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
                    {(selectedProperty.street || selectedProperty.island) && (
                      <p className="text-sm text-blue-700 mt-1">
                        {[selectedProperty.street, selectedProperty.island].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Property Capacity</h4>
                  
                  {/* Rental Units Capacity - Most Important */}
                  <div className="mb-4 p-3 bg-white rounded-lg border-2 border-blue-300">
                    <h5 className="text-sm font-semibold text-blue-900 mb-2">Rental Units</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-blue-700">Maximum Units:</span>
                        <span className="font-medium">{capacity.maxUnits}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-blue-700">Existing Units:</span>
                        <span className="font-medium">{capacity.existingUnits}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-blue-200">
                        <span className={`font-medium ${capacity.remainingUnits > 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {capacity.remainingUnits > 0 ? 'Remaining Units:' : '⚠️ At Capacity:'}
                        </span>
                        <span className={`font-bold ${capacity.remainingUnits > 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {capacity.remainingUnits}
                        </span>
                      </div>
                      {capacity.remainingUnits === 0 && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Cannot create more units. Property has reached its maximum capacity.
                        </p>
                      )}
                      {capacity.remainingUnits > 0 && capacity.remainingUnits <= 2 && (
                        <p className="text-xs text-yellow-600 mt-2 font-medium">
                          ⚠️ Only {capacity.remainingUnits} unit{capacity.remainingUnits !== 1 ? 's' : ''} remaining.
                        </p>
                      )}
                    </div>
                  </div>

                  {(selectedProperty.bedrooms || selectedProperty.bathrooms) && (
                    <div className="grid grid-cols-2 gap-6">
                      {/* Bedrooms Column */}
                      {selectedProperty.bedrooms && (
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
                      )}
                      
                      {/* Bathrooms Column */}
                      {selectedProperty.bathrooms && (
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
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number
                  </label>
                  <Input
                    type="number"
                    placeholder="Floor number"
                    value={formData.floor_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, floor_number: e.target.value }))}
                    min="1"
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
                    suppressHydrationWarning
                  >
                    {currencies.length > 0 ? (
                      currencies.map((currency) => (
                        <option key={currency.id} value={currency.code}>
                          {currency.code}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="MVR">MVR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms
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
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Toilets
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
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <label className="block text-sm font-medium text-gray-700">
                      Deposit Amount *
                    </label>
                    <div className="flex items-center gap-4">
                      {[1, 2, 3].map((months) => (
                        <label key={months} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedDepositMonths === months}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDepositMonths(months);
                                if (formData.rent_amount) {
                                  const rentAmount = parseFloat(formData.rent_amount);
                                  if (!isNaN(rentAmount) && rentAmount > 0) {
                                    const depositAmount = rentAmount * months;
                                    setFormData(prev => ({ ...prev, deposit_amount: depositAmount.toFixed(2) }));
                                  }
                                }
                              } else {
                                setSelectedDepositMonths(null);
                                setFormData(prev => ({ ...prev, deposit_amount: '' }));
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{months} Month{months > 1 ? 's' : ''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Input
                    type="number"
                    placeholder="Deposit amount"
                    value={formData.deposit_amount}
                    onChange={(e) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        deposit_amount: e.target.value
                      }));
                      // Clear selection if user manually edits deposit
                      if (selectedDepositMonths !== null) {
                        setSelectedDepositMonths(null);
                      }
                    }}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
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
                    suppressHydrationWarning
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
                    Select assets from the dropdown to assign to this rental unit. Enter a quantity and press Enter to create separate lines for each item. Each item can have its own location and installation date.
                  </p>
                  
                  {assets.length > 0 ? (
                    <div className="space-y-4">
                      {/* Asset Dropdown with Quantity Input */}
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <select
                            value={selectedAssetId}
                            onChange={(e) => {
                              setSelectedAssetId(e.target.value);
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            suppressHydrationWarning
                          >
                            <option value="">Select an asset...</option>
                            {assets.map((asset) => (
                              <option key={asset.id} value={asset.id.toString()}>
                                {asset.name} {asset.brand && `(${asset.brand})`} - {asset.category}
                              </option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={assetQuantityInput}
                            onChange={(e) => {
                              setAssetQuantityInput(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAsset();
                              }
                            }}
                            className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Button
                            type="button"
                            onClick={handleAddAsset}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Select an asset, enter quantity, then click "Add" or press Enter. Each item will be added as a separate line (qty=1) so you can specify location and installation date for each.
                        </p>
                      </div>

                      {/* Selected Assets List */}
                      {selectedAssets.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-gray-700">Selected Assets ({selectedAssets.length} item{selectedAssets.length !== 1 ? 's' : ''}):</h4>
                          <div className="space-y-3">
                            {selectedAssets.map((selectedAsset, index) => {
                              const asset = assets.find(a => a.id === selectedAsset.assetId);
                              if (!asset) return null;
                              
                              return (
                                <div
                                  key={selectedAsset.id}
                                  className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3"
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{asset.name}</div>
                                      <div className="text-sm text-gray-500">
                                        {asset.brand && `${asset.brand} • `}{asset.category}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded border border-gray-300">
                                        Qty: 1
                                      </span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedAssets(prev => prev.filter((_, idx) => idx !== index))}
                                        className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Location and Installation Date Fields */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Location (Optional)
                                      </label>
                                      <Input
                                        type="text"
                                        placeholder="e.g., Living Room, Kitchen"
                                        value={selectedAsset.location || ''}
                                        onChange={(e) => {
                                          setSelectedAssets(prev => 
                                            prev.map((sa, idx) => 
                                              idx === index ? { ...sa, location: e.target.value } : sa
                                            )
                                          );
                                        }}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Installation Date (Optional)
                                      </label>
                                      <Input
                                        type="date"
                                        value={selectedAsset.installationDate || ''}
                                        onChange={(e) => {
                                          setSelectedAssets(prev => 
                                            prev.map((sa, idx) => 
                                              idx === index ? { ...sa, installationDate: e.target.value } : sa
                                            )
                                          );
                                        }}
                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
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
                  disabled={loading || (selectedProperty && capacity.remainingUnits <= 0)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title={selectedProperty && capacity.remainingUnits <= 0 ? 'Property has reached maximum unit capacity' : ''}
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
