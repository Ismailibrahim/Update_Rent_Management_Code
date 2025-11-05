'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { ArrowLeft, Save, X, Plus, Minus, Copy } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI, rentalUnitTypesAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

interface Property {
  id: number;
  name: string;
  street: string;
  island: string;
  number_of_rental_units?: number;
}

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function BulkNewRentalUnitPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [unitTypes, setUnitTypes] = useState<RentalUnitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [existingRentalUnits, setExistingRentalUnits] = useState<number[]>([]);
  
  const [commonData, setCommonData] = useState({
    property_id: '',
    unit_type: '',
    floor_number: '',
    rent_amount: '',
    deposit_amount: '',
    currency: 'MVR',
    number_of_rooms: '',
    number_of_toilets: '',
    square_feet: '',
    status: 'available',
  });

  const [creationMode, setCreationMode] = useState<'sequential' | 'range' | 'custom'>('sequential');
  
  // Sequential mode: Start number, count, prefix, suffix
  const [sequentialConfig, setSequentialConfig] = useState({
    start_number: '1',
    count: '10',
    prefix: '',
    suffix: '',
    padding: '0', // Zero padding (e.g., 001, 002)
  });

  // Range mode: Floor range, units per floor
  const [rangeConfig, setRangeConfig] = useState({
    floor_start: '1',
    floor_end: '5',
    units_per_floor_start: '1',
    units_per_floor_end: '10',
  });

  // Custom mode: Comma-separated unit numbers
  const [customUnits, setCustomUnits] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchProperties();
      fetchUnitTypes();
    }
  }, [user, authLoading, router]);

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to fetch properties');
    }
  };

  const fetchUnitTypes = async () => {
    try {
      const response = await rentalUnitTypesAPI.getUnitTypes({ active_only: true });
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setUnitTypes(types);
    } catch (error) {
      console.error('Error fetching unit types:', error);
    }
  };

  const fetchPropertyDetails = useCallback(async (propertyId: number) => {
    try {
      const property = properties.find(p => p.id === propertyId);
      if (property) {
        setSelectedProperty(property);
        
        // Fetch existing rental units to prevent duplicates
        const rentalUnitsResponse = await rentalUnitsAPI.getByProperty(propertyId);
        const existingUnits = (rentalUnitsResponse.data.rentalUnits || []).map((u: { unit_number: string }) => u.unit_number);
        setExistingRentalUnits(existingUnits);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
      toast.error('Failed to fetch property details');
    }
  }, [properties]);

  useEffect(() => {
    if (commonData.property_id) {
      fetchPropertyDetails(parseInt(commonData.property_id));
    } else {
      setSelectedProperty(null);
      setExistingRentalUnits([]);
    }
  }, [commonData.property_id, fetchPropertyDetails]);

  const generateUnitNumbers = (): string[] => {
    const units: string[] = [];
    
    if (creationMode === 'sequential') {
      const start = parseInt(sequentialConfig.start_number) || 1;
      const count = parseInt(sequentialConfig.count) || 1;
      const padding = parseInt(sequentialConfig.padding) || 0;
      const prefix = sequentialConfig.prefix || '';
      const suffix = sequentialConfig.suffix || '';
      
      for (let i = 0; i < count; i++) {
        const number = start + i;
        const paddedNumber = padding > 0 ? number.toString().padStart(padding, '0') : number.toString();
        units.push(`${prefix}${paddedNumber}${suffix}`);
      }
    } else if (creationMode === 'range') {
      const floorStart = parseInt(rangeConfig.floor_start) || 1;
      const floorEnd = parseInt(rangeConfig.floor_end) || 1;
      const unitStart = parseInt(rangeConfig.units_per_floor_start) || 1;
      const unitEnd = parseInt(rangeConfig.units_per_floor_end) || 1;
      
      for (let floor = floorStart; floor <= floorEnd; floor++) {
        for (let unit = unitStart; unit <= unitEnd; unit++) {
          units.push(`${floor}${unit.toString().padStart(2, '0')}`);
        }
      }
    } else if (creationMode === 'custom') {
      const customList = customUnits.split(',').map(u => u.trim()).filter(u => u.length > 0);
      units.push(...customList);
    }
    
    return units;
  };

  const previewUnits = generateUnitNumbers();
  const duplicateUnits = previewUnits.filter(u => existingRentalUnits.includes(u));
  const newUnits = previewUnits.filter(u => !existingRentalUnits.includes(u));

  const capacity = selectedProperty ? {
    maxUnits: selectedProperty.number_of_rental_units || 0,
    existingUnits: existingRentalUnits.length,
    remainingUnits: Math.max(0, (selectedProperty.number_of_rental_units || 0) - existingRentalUnits.length),
  } : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commonData.property_id) {
      toast.error('Please select a property');
      return;
    }

    if (!commonData.unit_type) {
      toast.error('Please select a unit type');
      return;
    }

    if (!commonData.rent_amount || !commonData.deposit_amount) {
      toast.error('Please enter rent amount and deposit amount');
      return;
    }

    const unitsToCreate = newUnits;
    if (unitsToCreate.length === 0) {
      toast.error('No new units to create. All unit numbers already exist.');
      return;
    }

    if (capacity && unitsToCreate.length > capacity.remainingUnits) {
      toast.error(`Cannot create ${unitsToCreate.length} units. Only ${capacity.remainingUnits} units remaining for this property.`);
      return;
    }

    if (duplicateUnits.length > 0) {
      const proceed = confirm(
        `Warning: ${duplicateUnits.length} unit number(s) already exist and will be skipped:\n${duplicateUnits.slice(0, 5).join(', ')}${duplicateUnits.length > 5 ? '...' : ''}\n\nDo you want to continue creating ${newUnits.length} new unit(s)?`
      );
      if (!proceed) return;
    }

    try {
      setLoading(true);
      
      const parseNumericValue = (value: string): number | null => {
        if (!value || value.trim() === '') return null;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
      };

      const parseIntegerValue = (value: string): number | null => {
        if (!value || value.trim() === '') return null;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? null : parsed;
      };

      // Prepare units array for bulk creation
      const units = unitsToCreate.map(unitNumber => {
        const unitData: any = {
          unit_number: unitNumber,
          unit_type: commonData.unit_type,
          rent_amount: parseFloat(commonData.rent_amount),
          deposit_amount: parseFloat(commonData.deposit_amount),
          currency: commonData.currency,
          status: commonData.status,
        };

        // Add optional fields only if they have values
        const floorNumber = parseIntegerValue(commonData.floor_number);
        if (floorNumber !== null) {
          unitData.floor_number = floorNumber;
        }

        const numRooms = parseIntegerValue(commonData.number_of_rooms);
        if (numRooms !== null) {
          unitData.number_of_rooms = numRooms;
        }

        const numToilets = parseNumericValue(commonData.number_of_toilets);
        if (numToilets !== null) {
          unitData.number_of_toilets = numToilets;
        }

        const sqFeet = parseNumericValue(commonData.square_feet);
        if (sqFeet !== null) {
          unitData.square_feet = sqFeet;
        }

        return unitData;
      });

      // Use bulk creation endpoint with upfront capacity validation
      const response = await rentalUnitsAPI.bulkCreate({
        property_id: parseInt(commonData.property_id),
        units: units,
      });

      toast.success(response.data.message || `Successfully created ${units.length} rental unit(s)!`);
      router.push('/rental-units');
    } catch (error: unknown) {
      console.error('Error in bulk creation:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; errors?: any; duplicate_units?: string[] } } };
        const errorMessage = axiosError.response?.data?.message || 'Failed to create rental units';
        const duplicateUnits = axiosError.response?.data?.duplicate_units;
        
        if (duplicateUnits && duplicateUnits.length > 0) {
          toast.error(`${errorMessage}\nDuplicate units: ${duplicateUnits.join(', ')}`);
        } else {
          toast.error(errorMessage);
        }
        
        // Log detailed errors if available
        if (axiosError.response?.data?.errors) {
          console.error('Validation errors:', axiosError.response.data.errors);
        }
      } else {
        toast.error('An error occurred during bulk creation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/rental-units');
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
            <h1 className="text-3xl font-bold text-gray-900">Bulk Create Rental Units</h1>
            <p className="mt-2 text-gray-600">
              Create multiple rental units at once with shared properties
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Common Properties</CardTitle>
            <CardDescription className="text-gray-600">
              These properties will be applied to all units being created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property *
                  </label>
                  <select
                    value={commonData.property_id}
                    onChange={(e) => setCommonData(prev => ({ ...prev, property_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id.toString()}>
                        {property.name} - {property.street}, {property.island}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Type *
                  </label>
                  <select
                    value={commonData.unit_type}
                    onChange={(e) => setCommonData(prev => ({ ...prev, unit_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select unit type</option>
                    {unitTypes.map((unitType) => {
                      const normalizedName = unitType.name.trim().toLowerCase();
                      let value = 'other';
                      if (normalizedName === 'office') value = 'office';
                      else if (normalizedName.includes('retail') || normalizedName.includes('shop')) value = 'shop';
                      else if (normalizedName === 'warehouse') value = 'warehouse';
                      else if (normalizedName === 'residential' || normalizedName.includes('studio') || normalizedName.includes('br')) value = 'residential';
                      else if (normalizedName === 'other') value = 'other';
                      
                      return (
                        <option key={unitType.id} value={value}>
                          {unitType.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Floor Number
                  </label>
                  <Input
                    type="number"
                    placeholder="Floor number"
                    value={commonData.floor_number}
                    onChange={(e) => setCommonData(prev => ({ ...prev, floor_number: e.target.value }))}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    value={commonData.currency}
                    onChange={(e) => setCommonData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="MVR">MVR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Amount * (per unit)
                  </label>
                  <Input
                    type="number"
                    placeholder="Monthly rent amount"
                    value={commonData.rent_amount}
                    onChange={(e) => setCommonData(prev => ({ ...prev, rent_amount: e.target.value }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Amount * (per unit)
                  </label>
                  <Input
                    type="number"
                    placeholder="Deposit amount"
                    value={commonData.deposit_amount}
                    onChange={(e) => setCommonData(prev => ({ ...prev, deposit_amount: e.target.value }))}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms
                  </label>
                  <Input
                    type="number"
                    placeholder="Number of rooms"
                    value={commonData.number_of_rooms}
                    onChange={(e) => setCommonData(prev => ({ ...prev, number_of_rooms: e.target.value }))}
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
                    value={commonData.number_of_toilets}
                    onChange={(e) => setCommonData(prev => ({ ...prev, number_of_toilets: e.target.value }))}
                    min="0"
                    step="0.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet
                  </label>
                  <Input
                    type="number"
                    placeholder="Square feet"
                    value={commonData.square_feet}
                    onChange={(e) => setCommonData(prev => ({ ...prev, square_feet: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={commonData.status}
                    onChange={(e) => setCommonData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="renovation">Renovation</option>
                    <option value="deactivated">Deactivated</option>
                  </select>
                </div>
              </div>

              {/* Capacity Display */}
              {capacity && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Property Capacity</h4>
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
                        Remaining Units:
                      </span>
                      <span className={`font-bold ${capacity.remainingUnits > 0 ? 'text-green-800' : 'text-red-800'}`}>
                        {capacity.remainingUnits}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Unit Creation Mode */}
              <div className="space-y-4 border-t pt-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Unit Number Generation</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Choose how to generate unit numbers
                  </p>
                </div>

                <div className="flex gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setCreationMode('sequential')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      creationMode === 'sequential'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sequential
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('range')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      creationMode === 'range'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Floor Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('custom')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${
                      creationMode === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Custom List
                  </button>
                </div>

                {/* Sequential Mode */}
                {creationMode === 'sequential' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Number *
                      </label>
                      <Input
                        type="number"
                        value={sequentialConfig.start_number}
                        onChange={(e) => setSequentialConfig(prev => ({ ...prev, start_number: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Count *
                      </label>
                      <Input
                        type="number"
                        value={sequentialConfig.count}
                        onChange={(e) => setSequentialConfig(prev => ({ ...prev, count: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prefix (Optional)
                      </label>
                      <Input
                        type="text"
                        value={sequentialConfig.prefix}
                        onChange={(e) => setSequentialConfig(prev => ({ ...prev, prefix: e.target.value }))}
                        placeholder="e.g., A"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Suffix (Optional)
                      </label>
                      <Input
                        type="text"
                        value={sequentialConfig.suffix}
                        onChange={(e) => setSequentialConfig(prev => ({ ...prev, suffix: e.target.value }))}
                        placeholder="e.g., -B"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zero Padding (Optional)
                      </label>
                      <Input
                        type="number"
                        value={sequentialConfig.padding}
                        onChange={(e) => setSequentialConfig(prev => ({ ...prev, padding: e.target.value }))}
                        min="0"
                        max="5"
                        placeholder="e.g., 3 for 001, 002"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave 0 for no padding</p>
                    </div>
                  </div>
                )}

                {/* Range Mode */}
                {creationMode === 'range' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor Start *
                      </label>
                      <Input
                        type="number"
                        value={rangeConfig.floor_start}
                        onChange={(e) => setRangeConfig(prev => ({ ...prev, floor_start: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Floor End *
                      </label>
                      <Input
                        type="number"
                        value={rangeConfig.floor_end}
                        onChange={(e) => setRangeConfig(prev => ({ ...prev, floor_end: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Units Per Floor Start *
                      </label>
                      <Input
                        type="number"
                        value={rangeConfig.units_per_floor_start}
                        onChange={(e) => setRangeConfig(prev => ({ ...prev, units_per_floor_start: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Units Per Floor End *
                      </label>
                      <Input
                        type="number"
                        value={rangeConfig.units_per_floor_end}
                        onChange={(e) => setRangeConfig(prev => ({ ...prev, units_per_floor_end: e.target.value }))}
                        min="1"
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-600">
                        Example: Floor 1-3, Units 1-5 per floor = 101, 102, 103, 104, 105, 201, 202, 203, 204, 205, 301, 302, 303, 304, 305
                      </p>
                    </div>
                  </div>
                )}

                {/* Custom Mode */}
                {creationMode === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Numbers (comma-separated) *
                    </label>
                    <textarea
                      value={customUnits}
                      onChange={(e) => setCustomUnits(e.target.value)}
                      placeholder="e.g., 101, 102, 103, A1, B2, C3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter unit numbers separated by commas
                    </p>
                  </div>
                )}

                {/* Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      Preview ({previewUnits.length} units)
                    </h4>
                    {newUnits.length > 0 && (
                      <span className="text-sm text-green-600 font-medium">
                        {newUnits.length} new, {duplicateUnits.length} duplicate
                      </span>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {previewUnits.slice(0, 50).map((unit, index) => {
                        const isDuplicate = duplicateUnits.includes(unit);
                        return (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              isDuplicate
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : 'bg-green-100 text-green-700 border border-green-300'
                            }`}
                            title={isDuplicate ? 'This unit already exists' : 'New unit'}
                          >
                            {unit}
                          </span>
                        );
                      })}
                      {previewUnits.length > 50 && (
                        <span className="px-2 py-1 rounded text-xs text-gray-500">
                          ... and {previewUnits.length - 50} more
                        </span>
                      )}
                    </div>
                  </div>
                  {duplicateUnits.length > 0 && (
                    <p className="text-xs text-red-600 mt-2">
                      ⚠️ {duplicateUnits.length} unit number(s) already exist and will be skipped
                    </p>
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
                  disabled={loading || newUnits.length === 0 || (capacity && newUnits.length > capacity.remainingUnits)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating {newUnits.length} units...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Create {newUnits.length} Unit{newUnits.length !== 1 ? 's' : ''}
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

