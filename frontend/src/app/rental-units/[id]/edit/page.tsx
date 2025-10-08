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

interface Property {
  id: number;
  name: string;
  address: string;
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
  personal_info: {
    firstName: string;
    lastName: string;
  };
  contact_info?: {
    email: string;
    phone: string;
  };
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
    unit_details: {
      numberOfRooms: '',
      numberOfToilets: '',
      squareFeet: ''
    },
    financial: {
      rentAmount: '',
      depositAmount: '',
      currency: 'MVR'
    },
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
        unit_details: {
          numberOfRooms: unit.unit_details.numberOfRooms.toString(),
          numberOfToilets: unit.unit_details.numberOfToilets.toString(),
          squareFeet: typeof unit.unit_details.squareFeet === 'number' ? String(unit.unit_details.squareFeet) : ''
        },
        financial: {
          rentAmount: unit.financial.rentAmount.toString(),
          depositAmount: unit.financial.depositAmount.toString(),
          currency: unit.financial.currency
        },
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
        unit_details: {
          numberOfRooms: parseInt(formData.unit_details.numberOfRooms),
          numberOfToilets: parseFloat(formData.unit_details.numberOfToilets),
          squareFeet: formData.unit_details.squareFeet ? parseFloat(formData.unit_details.squareFeet) : undefined
        },
        financial: {
          rentAmount: parseFloat(formData.financial.rentAmount),
          depositAmount: parseFloat(formData.financial.depositAmount),
          currency: formData.financial.currency
        },
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
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleCancel} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rental Units
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Rental Unit</h1>
          <div></div> {/* Spacer for alignment */}
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
                        {property.name} - {property.address}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Square Feet (Optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="Square feet"
                    value={formData.unit_details.squareFeet}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      unit_details: { ...prev.unit_details, squareFeet: e.target.value }
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
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                />
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
                        {tenant.personal_info.firstName} {tenant.personal_info.lastName}
                        {tenant.contact_info?.phone && ` - ${tenant.contact_info.phone}`}
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
                                      <td className="py-3 px-4">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setSelectedAssets(prev => prev.filter(id => id !== assetId))}
                                          className="text-red-600 hover:text-red-700"
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

              <div className="flex justify-end space-x-4 pt-6">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Updating...' : <><Save className="h-4 w-4 mr-2" /> Update Rental Unit</>}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
