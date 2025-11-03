'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/UI/Card';
import { Button } from '../../../../components/UI/Button';
import { Input } from '../../../../components/UI/Input';
import { ArrowLeft, Save, X } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI, assetsAPI, tenantsAPI, rentalUnitTypesAPI } from '../../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../../components/Layout/SidebarLayout';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Property {
  id: number;
  name: string;
  street: string;
  city: string;
  island: string;
}

interface Asset {
  id: number;
  name: string;
  brand?: string;
  serial_no?: string;
  category: string;
  status?: string;
  maintenance_notes?: string;
  quantity?: number;
}

interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  full_name?: string;
}

export default function EditRentalUnitPage() {
  const router = useRouter();
  const params = useParams();
  const rentalUnitId = params.id as string;
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [unitTypes, setUnitTypes] = useState<Array<{ id: number; name: string; is_active: boolean }>>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [originalAssets, setOriginalAssets] = useState<number[]>([]); // Track originally assigned assets
  const [maintenanceNotes, setMaintenanceNotes] = useState<{[key: number]: {notes: string}}>({});
  const [loading, setLoading] = useState(false);
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
    tenant_id: '',
    notes: ''
  });

  const fetchRentalUnit = useCallback(async () => {
    try {
      const response = await rentalUnitsAPI.getById(parseInt(rentalUnitId));
      const unit = response.data.rentalUnit;
      
      setFormData({
        property_id: unit.property_id.toString(),
        unit_number: unit.unit_number,
        unit_type: unit.unit_type || '',
        floor_number: unit.floor_number.toString(),
        // New separate columns
        rent_amount: unit.rent_amount.toString(),
        deposit_amount: unit.deposit_amount ? unit.deposit_amount.toString() : '',
        currency: unit.currency,
        number_of_rooms: unit.number_of_rooms.toString(),
        number_of_toilets: unit.number_of_toilets.toString(),
        square_feet: unit.square_feet ? unit.square_feet.toString() : '',
        // Utility meter information
        water_meter_number: unit.water_meter_number || '',
        water_billing_account: unit.water_billing_account || '',
        electricity_meter_number: unit.electricity_meter_number || '',
        electricity_billing_account: unit.electricity_billing_account || '',
        // Access card numbers
        access_card_numbers: unit.access_card_numbers || '',
        status: unit.status,
        tenant_id: unit.tenant_id ? unit.tenant_id.toString() : '',
        notes: unit.notes || ''
      });

      // Set selected assets with quantities and maintenance details
      if (unit.assets && unit.assets.length > 0) {
        console.log('Unit assets:', unit.assets);
        const assetIds = unit.assets.map((asset: { id: number }) => asset.id);
        setSelectedAssets(assetIds);
        setOriginalAssets(assetIds); // Track originally assigned assets
        // Update asset quantities and status from the unit's assets
        setAssets(prevAssets => {
          return prevAssets.map(asset => {
            const unitAsset = unit.assets.find((ua: { id: number; pivot?: { quantity?: number; status?: string } }) => ua.id === asset.id);
            if (unitAsset) {
              console.log(`Asset ${asset.id} pivot data:`, unitAsset.pivot);
              return { 
                ...asset, 
                quantity: unitAsset.pivot?.quantity || 1,
                status: unitAsset.pivot?.status || 'working'
              };
            }
            return asset;
          });
        });

        // Initialize maintenance notes state from pivot data
        const initialNotes: { [key: number]: { notes: string } } = {};
        unit.assets.forEach((ua: { id: number; pivot?: { maintenance_notes?: string } }) => {
          if (ua.pivot && typeof ua.pivot.maintenance_notes === 'string' && ua.pivot.maintenance_notes.length > 0) {
            initialNotes[ua.id] = { notes: ua.pivot.maintenance_notes };
          }
        });
        setMaintenanceNotes(initialNotes);
      } else {
        setSelectedAssets([]);
        setOriginalAssets([]);
      }
    } catch (error) {
      console.error('Error fetching rental unit:', error);
      toast.error('Failed to fetch rental unit details');
    }
  }, [rentalUnitId]);

  useEffect(() => {
    const loadData = async () => {
      await fetchAssets();
      await fetchUnitTypes();
      await fetchRentalUnit();
      await fetchProperties();
      await fetchTenants();
    };
    loadData();
  }, [rentalUnitId, fetchRentalUnit]);

  const fetchUnitTypes = async () => {
    try {
      const response = await rentalUnitTypesAPI.getAll({ active_only: true });
      const types = (response.data?.data?.unitTypes ?? response.data?.unitTypes) || [];
      setUnitTypes(types);
    } catch (error) {
      console.error('Error fetching unit types:', error);
    }
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
      const fetchedAssets = response.data.assets || [];
      
      // Preserve existing quantities and status if assets are already loaded
      setAssets(prevAssets => {
        if (prevAssets.length > 0) {
          return fetchedAssets.map((asset: Record<string, unknown>) => {
            const existingAsset = prevAssets.find(pa => pa.id === asset.id);
            return existingAsset ? { 
              ...asset, 
              quantity: existingAsset.quantity,
              status: existingAsset.status
            } : asset;
          });
        }
        return fetchedAssets;
      });
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to fetch assets');
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await tenantsAPI.getAll();
      setTenants(response.data.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast.error('Failed to fetch tenants');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.property_id) {
      toast.error('Please select a property');
      return;
    }

    try {
      setLoading(true);
      const submitData = {
        ...formData,
        property_id: parseInt(formData.property_id),
        unit_type: formData.unit_type,
        floor_number: parseInt(formData.floor_number),
        // New separate columns
        rent_amount: parseFloat(formData.rent_amount),
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : undefined,
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
        tenant_id: formData.tenant_id ? parseInt(formData.tenant_id) : undefined
      };

      console.log('Submitting rental unit data:', submitData);
      await rentalUnitsAPI.update(parseInt(rentalUnitId), submitData);
      
      // Handle asset assignments and removals
      console.log('Original assets:', originalAssets);
      console.log('Selected assets:', selectedAssets);
      
      // Find assets to remove (were originally assigned but now unselected)
      const assetsToRemove = originalAssets.filter(assetId => !selectedAssets.includes(assetId));
      
      // Find assets to add (newly selected)
      const assetsToAdd = selectedAssets.filter(assetId => !originalAssets.includes(assetId));
      
      console.log('Assets to remove:', assetsToRemove);
      console.log('Assets to add:', assetsToAdd);
      
      // Remove assets that were unselected
      if (assetsToRemove.length > 0) {
        try {
          for (const assetId of assetsToRemove) {
            await rentalUnitsAPI.removeAsset(parseInt(rentalUnitId), assetId);
            console.log(`Removed asset ${assetId} from rental unit`);
          }
          toast.success(`Removed ${assetsToRemove.length} asset(s) from rental unit`);
        } catch (removeError) {
          console.error('Error removing assets:', removeError);
          toast.error('Failed to remove some assets');
        }
      }
      
      // Add newly selected assets
      if (assetsToAdd.length > 0) {
        try {
          // Prepare assets with quantities
          const assetsWithQuantities = assetsToAdd.map(assetId => {
            const asset = assets.find(a => a.id === assetId);
            console.log(`Asset ${assetId}:`, asset);
            return {
              asset_id: assetId,
              quantity: asset?.quantity || 1
            };
          });
          
          console.log('Adding assets to rental unit:', assetsWithQuantities);
          const addResponse = await rentalUnitsAPI.addAssets(parseInt(rentalUnitId), assetsWithQuantities);
          console.log('Add assets response:', addResponse.data);
          toast.success(`Added ${assetsToAdd.length} asset(s) to rental unit`);
        } catch (addError: unknown) {
          console.error('Error adding assets:', addError);
          if (addError && typeof addError === 'object' && 'response' in addError) {
            const axiosError = addError as { response?: { data?: { message?: string } } };
            console.error('Asset error response:', axiosError.response?.data);
            toast.error('Failed to add assets: ' + (axiosError.response?.data?.message || 'Unknown error'));
          } else {
            toast.error('Failed to add assets: Unknown error');
          }
        }
      }
      
      // Show success message if no asset changes
      if (assetsToRemove.length === 0 && assetsToAdd.length === 0) {
        toast.success('Rental unit updated successfully');
      }

      // Handle asset status updates
      const statusUpdates = assets.filter(asset => 
        selectedAssets.includes(asset.id) && asset.status
      );
      
      if (statusUpdates.length > 0) {
        try {
          for (const asset of statusUpdates) {
            const updateData: { status: string; maintenance_notes?: string; quantity?: number } = {
              status: asset.status || 'working',
              quantity: asset.quantity || 1
            };
            
            // Include maintenance notes if status is maintenance
            if (asset.status === 'maintenance' && maintenanceNotes[asset.id]) {
              updateData.maintenance_notes = maintenanceNotes[asset.id].notes;
            }
            
            await rentalUnitsAPI.updateAssetStatus(parseInt(rentalUnitId), asset.id, updateData);
          }
          toast.success(`Updated status for ${statusUpdates.length} asset(s)`);
        } catch (statusError) {
          console.error('Error updating asset statuses:', statusError);
          toast.error('Failed to update some asset statuses');
        }
      }
      
      // Navigate back to rental units list
      router.push('/rental-units');
    } catch (error: unknown) {
      console.error('Error updating rental unit:', error);

      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]> } } };
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors;
          Object.values(errors).forEach((errMsgs: string[]) => {
            errMsgs.forEach((msg: string) => toast.error(msg));
          });
        } else {
          toast.error('Failed to update rental unit');
        }
      } else {
        toast.error('Failed to update rental unit');
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
            <h1 className="text-3xl font-bold text-gray-900">Edit Rental Unit</h1>
            <p className="mt-2 text-gray-600">
              Update rental unit information
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rental Unit Details</CardTitle>
            <CardDescription>
              Update the details for this rental unit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Property *
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id.toString()}>
                        {property.name}{property.street && property.street.trim() ? ` - ${property.street.trim()}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

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
                    Unit Type *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.unit_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_type: e.target.value }))}
                    required
                  >
                    <option value="">Select unit type</option>
                    {unitTypes.map((unitType) => {
                      const allowed = ['residential','office','shop','warehouse','other'];
                      const value = (unitType.name || '').trim().toLowerCase();
                      const mapped = allowed.includes(value) ? value : 'other';
                      return (
                        <option key={unitType.id} value={mapped}>
                          {unitType.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
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
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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

              {/* Tenant Assignment */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant Assignment
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => {
                      const tenantId = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        tenant_id: tenantId,
                        status: tenantId ? 'occupied' : 'available'
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No tenant assigned</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id.toString()}>
                        {tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}
                        {tenant.phone && ` - ${tenant.phone}`}
                      </option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Asset Management */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manage Assets
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Add or remove assets assigned to this rental unit
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
                                // Set default quantity to 1 for new assets
                                const updatedAssets = assets.map(asset => 
                                  asset.id === assetId ? { ...asset, quantity: 1 } : asset
                                );
                                setAssets(updatedAssets);
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

                      {/* Selected Assets Table */}
                      {selectedAssets.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Assigned Assets:</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border border-gray-200 rounded-lg">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Asset Name</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Brand</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Serial No</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Quantity</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                                  <th className="text-left py-3 px-4 font-medium text-gray-600">Maintenance Notes</th>
                                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedAssets.map((assetId) => {
                                  const asset = assets.find(a => a.id === assetId);
                                  if (!asset) return null;

                                  return (
                                    <tr key={assetId} className="border-b border-gray-100 hover:bg-gray-50">
                                      <td className="py-3 px-4">
                                        <div className="font-medium text-gray-900">{asset.name}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-gray-600">{asset.brand || 'N/A'}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-gray-600">{asset.serial_no || 'N/A'}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <div className="text-gray-600">{asset.category}</div>
                                      </td>
                                      <td className="py-3 px-4">
                                        <input
                                          type="number"
                                          min="1"
                                          value={asset.quantity || 1}
                                          onChange={(e) => {
                                            const newQuantity = parseInt(e.target.value) || 1;
                                            console.log(`Updating asset ${assetId} quantity to:`, newQuantity);
                                            const updatedAssets = assets.map(a => 
                                              a.id === assetId ? { ...a, quantity: newQuantity } : a
                                            );
                                            setAssets(updatedAssets);
                                            console.log('Updated assets:', updatedAssets);
                                          }}
                                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </td>
                                      <td className="py-3 px-4">
                                        <select
                                          value={asset.status || 'working'}
                                          onChange={(e) => {
                                            const updatedAssets = assets.map(a => 
                                              a.id === assetId ? { ...a, status: e.target.value } : a
                                            );
                                            setAssets(updatedAssets);
                                          }}
                                          className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        >
                                          <option value="working">Working</option>
                                          <option value="maintenance">Maintenance</option>
                                        </select>
                                      </td>
                                      <td className="py-3 px-4">
                                        {asset.status === 'maintenance' ? (
                                          <div className="space-y-2">
                                            <textarea
                                              placeholder="Describe the maintenance issue..."
                                              value={maintenanceNotes[assetId]?.notes || ''}
                                              onChange={(e) => setMaintenanceNotes(prev => ({
                                                ...prev,
                                                [assetId]: {
                                                  ...prev[assetId],
                                                  notes: e.target.value
                                                }
                                              }))}
                                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                                              rows={2}
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-xs">N/A</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedAssets(prev => prev.filter(id => id !== assetId))}
                                          className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Rental Unit
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
