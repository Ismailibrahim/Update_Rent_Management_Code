'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Select } from '../../../components/UI/Select';
import { 
  Package, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building2,
  HomeIcon,
  Search,
  RotateCcw
} from 'lucide-react';
import { rentalUnitsAPI, assetsAPI, propertiesAPI, type RentalUnit, type Asset, type Property } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';

interface AssetAssignment {
  asset_id: number;
  quantity: number;
  serial_numbers?: string;
}

interface BulkResult {
  success: number;
  failed: number;
  total_units: number;
  total_assets: number;
  unit_results: Array<{
    rental_unit_id: number;
    success: number;
    failed: number;
    skipped: number;
    errors: string[];
  }>;
}

export default function BulkAssetsPage() {
  const [loading, setLoading] = useState(false);
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<number>>(new Set());
  const [assetAssignments, setAssetAssignments] = useState<AssetAssignment[]>([
    { asset_id: 0, quantity: 1, serial_numbers: '' }
  ]);
  const [result, setResult] = useState<BulkResult | null>(null);

  useEffect(() => {
    fetchRentalUnits();
    fetchProperties();
    fetchAssets();
  }, []);

  const fetchRentalUnits = async () => {
    try {
      const response = await rentalUnitsAPI.getAll();
      setRentalUnits(response.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      toast.error('Failed to fetch rental units');
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await propertiesAPI.getAll();
      setProperties(response.data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
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

  const filteredRentalUnits = rentalUnits.filter(unit => {
    const matchesSearch = 
      unit.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.property?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProperty = selectedProperty === 'all' || unit.property_id?.toString() === selectedProperty;
    
    return matchesSearch && matchesProperty;
  });

  const handleToggleUnit = (unitId: number) => {
    const newSelected = new Set(selectedUnitIds);
    if (newSelected.has(unitId)) {
      newSelected.delete(unitId);
    } else {
      newSelected.add(unitId);
    }
    setSelectedUnitIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUnitIds.size === filteredRentalUnits.length) {
      setSelectedUnitIds(new Set());
    } else {
      setSelectedUnitIds(new Set(filteredRentalUnits.map(u => u.id)));
    }
  };

  const handleAddAsset = () => {
    setAssetAssignments([...assetAssignments, { asset_id: 0, quantity: 1, serial_numbers: '' }]);
  };

  const handleRemoveAsset = (index: number) => {
    setAssetAssignments(assetAssignments.filter((_, i) => i !== index));
  };

  const handleAssetChange = (index: number, field: keyof AssetAssignment, value: string | number) => {
    const updated = [...assetAssignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssetAssignments(updated);
  };

  const handleSubmit = async () => {
    if (selectedUnitIds.size === 0) {
      toast.error('Please select at least one rental unit');
      return;
    }

    const validAssets = assetAssignments.filter(a => a.asset_id > 0 && a.quantity > 0);
    if (validAssets.length === 0) {
      toast.error('Please add at least one asset with valid quantity');
      return;
    }

    // Validate all assets have asset_id and quantity
    for (const asset of validAssets) {
      if (!asset.asset_id || asset.quantity < 1) {
        toast.error('Please ensure all assets have a valid asset selected and quantity >= 1');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        rental_unit_ids: Array.from(selectedUnitIds),
        assets: validAssets.map(a => ({
          asset_id: a.asset_id,
          quantity: a.quantity,
          serial_numbers: a.serial_numbers?.trim() || undefined
        }))
      };

      const response = await rentalUnitsAPI.bulkAssignAssets(payload);
      setResult(response.data.results);
      
      const successCount = response.data.results.success;
      const failedCount = response.data.results.failed;
      
      toast.success(`Assets assigned to ${successCount} rental unit(s) successfully`);
      
      if (failedCount > 0) {
        toast.error(`${failedCount} rental unit(s) failed to assign assets`);
      }

      // Clear selections after successful assignment
      setSelectedUnitIds(new Set());
      setAssetAssignments([{ asset_id: 0, quantity: 1, serial_numbers: '' }]);
    } catch (error: any) {
      console.error('Error assigning assets:', error);
      const errorMessage = error.response?.data?.message || 'Failed to assign assets';
      toast.error(errorMessage);
      
      if (error.response?.data?.results) {
        setResult(error.response.data.results);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    setSelectedUnitIds(new Set());
    setAssetAssignments([{ asset_id: 0, quantity: 1, serial_numbers: '' }]);
    setResult(null);
    setSearchTerm('');
    setSelectedProperty('all');
    toast.success('Selections cleared');
  };

  const getAssetName = (assetId: number) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 'Select Asset';
    return `${asset.brand ? asset.brand + ' ' : ''}${asset.name}`.trim();
  };

  const getPropertyName = (propertyId?: number) => {
    if (!propertyId) return 'Unknown';
    const property = properties.find(p => p.id === propertyId);
    return property?.name || 'Unknown';
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-8 w-8" />
              Bulk Asset Assignment
            </h1>
            <p className="mt-2 text-gray-600">
              Select multiple rental units and assign assets to all of them at once. Perfect for initial setup.
            </p>
          </div>
          {(selectedUnitIds.size > 0 || assetAssignments.length > 1 || result) && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        {/* Rental Unit Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HomeIcon className="h-5 w-5" />
              Select Rental Units
            </CardTitle>
            <CardDescription>
              Select the rental units you want to assign assets to. {selectedUnitIds.size > 0 && `(${selectedUnitIds.size} selected)`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Property</label>
                <Select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                >
                  <option value="all">All Properties</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id.toString()}>
                      {property.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Units</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by unit number or property name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Select All Button */}
            {filteredRentalUnits.length > 0 && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedUnitIds.size === filteredRentalUnits.length ? 'Deselect All' : 'Select All'}
                </Button>
                <span className="text-sm text-gray-600">
                  {filteredRentalUnits.length} unit(s) found
                </span>
              </div>
            )}

            {/* Rental Units List */}
            <div className="max-h-96 overflow-y-auto border rounded-md">
              {filteredRentalUnits.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No rental units found. {searchTerm || selectedProperty !== 'all' ? 'Try adjusting your filters.' : 'Create rental units first.'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredRentalUnits.map(unit => (
                    <label
                      key={unit.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUnitIds.has(unit.id)}
                        onChange={() => handleToggleUnit(unit.id)}
                        className="mr-3 h-4 w-4 text-blue-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{unit.unit_number}</span>
                          {unit.floor_number && (
                            <span className="text-sm text-gray-500">Floor {unit.floor_number}</span>
                          )}
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-600">{getPropertyName(unit.property_id)}</span>
                          {unit.status && (
                            <>
                              <span className="text-sm text-gray-500">•</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                unit.status === 'occupied' ? 'bg-green-100 text-green-700' :
                                unit.status === 'available' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {unit.status}
                              </span>
                            </>
                          )}
                        </div>
                        {unit.tenant && (
                          <div className="text-sm text-gray-500 mt-1">
                            Tenant: {unit.tenant.full_name || `${unit.tenant.first_name} ${unit.tenant.last_name}`}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Asset Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Assets to Assign
            </CardTitle>
            <CardDescription>
              Add assets that will be assigned to all selected rental units
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {assetAssignments.map((assignment, index) => (
              <div key={index} className="flex gap-4 items-start p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset *</label>
                    <Select
                      value={assignment.asset_id.toString()}
                      onChange={(e) => handleAssetChange(index, 'asset_id', parseInt(e.target.value))}
                    >
                      <option value="0">Select Asset</option>
                      {assets.map(asset => (
                        <option key={asset.id} value={asset.id.toString()}>
                          {asset.brand ? `${asset.brand} ` : ''}{asset.name} {asset.category ? `(${asset.category})` : ''}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <Input
                      type="number"
                      min="1"
                      value={assignment.quantity}
                      onChange={(e) => handleAssetChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      placeholder="Quantity"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Numbers (Optional)</label>
                    <Input
                      type="text"
                      value={assignment.serial_numbers || ''}
                      onChange={(e) => handleAssetChange(index, 'serial_numbers', e.target.value)}
                      placeholder="e.g., SN001, SN002"
                    />
                  </div>
                </div>
                <div className="pt-6">
                  {assetAssignments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAsset(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddAsset}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Asset
            </Button>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {selectedUnitIds.size > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Ready to assign <strong>{assetAssignments.filter(a => a.asset_id > 0).length}</strong> asset(s) to <strong>{selectedUnitIds.size}</strong> rental unit(s)
                  </p>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Assign Assets ({selectedUnitIds.size} units)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Assignment Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Success</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-1">{result.success}</p>
                  <p className="text-sm text-green-600">units</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 mt-1">{result.failed}</p>
                  <p className="text-sm text-red-600">units</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Total</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{result.total_units}</p>
                  <p className="text-sm text-blue-600">units processed</p>
                </div>
              </div>

              {result.unit_results && result.unit_results.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Unit Details:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-gray-50">
                    {result.unit_results.map((unitResult, index) => {
                      const unit = rentalUnits.find(u => u.id === unitResult.rental_unit_id);
                      return (
                        <div key={index} className={`mb-3 p-3 rounded border ${
                          unitResult.failed > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">
                              {unit?.unit_number || `Unit ID: ${unitResult.rental_unit_id}`}
                            </span>
                            <span className={`text-sm px-2 py-1 rounded ${
                              unitResult.failed > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {unitResult.success} success, {unitResult.failed} failed
                            </span>
                          </div>
                          {unitResult.errors && unitResult.errors.length > 0 && (
                            <div className="mt-2 text-sm text-red-700">
                              {unitResult.errors.map((error, errIndex) => (
                                <div key={errIndex}>• {error}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

