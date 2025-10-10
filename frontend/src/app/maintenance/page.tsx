'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Wrench, RefreshCw } from 'lucide-react';
import { rentalUnitsAPI, maintenanceCostsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface Asset {
  id: number;
  asset_id: number;
  rental_unit_id: number;
  name: string;
  brand?: string;
  category: string;
  status: string;
  maintenance_notes?: string;
  quantity?: number;
  maintenance_cost?: {
    id: number;
    repair_cost: string;
    currency: string;
    repair_date: string;
    description?: string;
    repair_provider?: string;
    notes?: string;
  };
  rental_unit: {
    id: number;
    unit_number: string;
    property: {
      id: number;
      name: string;
    };
  };
  updated_at: string;
}

export default function MaintenancePage() {
  const [maintenanceAssets, setMaintenanceAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [maintenanceQuantities, setMaintenanceQuantities] = useState<{[key: number]: number}>({});
  const [showCostForm, setShowCostForm] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [existingCostData, setExistingCostData] = useState<{
    id: number;
    repair_cost: number;
    currency: string;
    description: string;
    repair_date: string;
    repair_provider: string;
    notes: string;
    bill_file_paths: string;
  } | null>(null);
  const [costForm, setCostForm] = useState({
    repair_cost: '',
    currency: 'MVR',
    description: '',
    repair_date: '',
    repair_provider: '',
    notes: '',
    bills: [] as File[]
  });

  useEffect(() => {
    fetchMaintenanceAssets();
  }, []);

  const fetchMaintenanceAssets = async () => {
    try {
      setLoading(true);
      const response = await rentalUnitsAPI.getMaintenanceAssets();
      const assets = response.data.assets || [];
      setMaintenanceAssets(assets);
      
      // Initialize maintenance quantities
      const quantities: {[key: number]: number} = {};
      assets.forEach((asset: Asset) => {
        quantities[asset.id] = asset.quantity || 1;
      });
      setMaintenanceQuantities(quantities);

      // Check which assets have cost details
      console.log('🔍 Checking which assets have cost details...');
      const assetsWithCostsSet = new Set<number>();
      for (const asset of assets) {
        try {
          console.log(`Checking asset ${asset.id} (${asset.name}) for cost details...`);
          const costResponse = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
          console.log(`Cost response for asset ${asset.id}:`, costResponse.data);
          
          if (costResponse.data && costResponse.data.maintenance_costs && costResponse.data.maintenance_costs.length > 0) {
            console.log(`✅ Asset ${asset.id} has cost details`);
            assetsWithCostsSet.add(asset.id);
          } else {
            console.log(`❌ Asset ${asset.id} has no cost details`);
          }
        } catch (error) {
          // Asset doesn't have cost details yet
          console.log(`❌ Error checking cost details for asset ${asset.id}:`, error);
        }
      }
      console.log('Assets with costs:', Array.from(assetsWithCostsSet));
      
      // Debug: Log the final state
      console.log('🔍 Final assetsWithCosts state:', Array.from(assetsWithCostsSet));
      console.log('🔍 Total assets found:', assets.length);
      console.log('🔍 Assets with costs count:', assetsWithCostsSet.size);
    } catch (error) {
      console.error('Error fetching maintenance assets:', error);
      toast.error('Failed to fetch maintenance assets');
    } finally {
      setLoading(false);
    }
  };

  const handleCostFormSubmit = async () => {
    console.log('🚀 handleCostFormSubmit called!');
    console.log('🚀 Current costForm state:', costForm);
    console.log('🚀 isEditing:', isEditing);
    console.log('🚀 existingCostData:', existingCostData);
    
    if (!selectedAsset || !costForm.repair_cost) {
      toast.error('Please fill in the repair cost');
      return;
    }

    try {
      if (isEditing && existingCostData) {
        // Update existing maintenance cost
        console.log('🔍 DEBUG: Updating maintenance cost with data:', {
          id: existingCostData.id,
          repair_cost: parseFloat(costForm.repair_cost),
          currency: costForm.currency,
          description: costForm.description,
          repair_date: costForm.repair_date,
          repair_provider: costForm.repair_provider,
          notes: costForm.notes,
        });
        
        console.log('🔍 DEBUG: Raw costForm.repair_cost:', costForm.repair_cost);
        console.log('🔍 DEBUG: Parsed repair_cost:', parseFloat(costForm.repair_cost));
        console.log('🔍 DEBUG: Is NaN?', isNaN(parseFloat(costForm.repair_cost)));
        console.log('🔍 DEBUG: Full costForm object:', costForm);
        
        // Validate that repair_cost is a valid number
        const repairCost = parseFloat(costForm.repair_cost);
        if (isNaN(repairCost) || repairCost <= 0) {
          toast.error('Please enter a valid repair cost');
          return;
        }
        
        await maintenanceCostsAPI.update(existingCostData.id, {
          repair_cost: repairCost,
          currency: costForm.currency,
          description: costForm.description,
          repair_date: costForm.repair_date,
          repair_provider: costForm.repair_provider,
          notes: costForm.notes,
        }, costForm.bills);

        toast.success('Maintenance cost updated successfully');
        handleCloseModal();
        fetchMaintenanceAssets(); // Refresh the maintenance assets list
      } else {
        // Create new maintenance cost
        // Validate that repair_cost is a valid number
        const repairCost = parseFloat(costForm.repair_cost);
        if (isNaN(repairCost) || repairCost <= 0) {
          toast.error('Please enter a valid repair cost');
          return;
        }
        
        await maintenanceCostsAPI.create({
          rental_unit_asset_id: selectedAsset.id,
          repair_cost: repairCost,
          currency: costForm.currency,
          description: costForm.description,
          repair_date: costForm.repair_date,
          repair_provider: costForm.repair_provider,
          notes: costForm.notes,
        }, costForm.bills);

        toast.success('Maintenance cost recorded successfully');
        fetchMaintenanceAssets(); // Refresh the maintenance assets list
        handleCloseModal();
      }
      
    } catch (error) {
      console.error('Error recording maintenance cost:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'record'} maintenance cost`);
    }
  };

  const markAssetAsWorking = async (asset: Asset) => {
    console.log('=== MARK ASSET AS WORKING START ===');
    console.log('Asset ID:', asset.id);
    console.log('Asset Name:', asset.name);
    
    try {
      console.log('✅ Proceeding to update asset status (cost details already verified)');
      const quantity = maintenanceQuantities[asset.id] || 1;
      
      // First, update maintenance cost status to 'paid' to make it visible on Maintenance Cost page
      console.log('Updating maintenance cost status to paid...');
      const costResponse = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
      if (costResponse.data?.maintenance_costs?.length > 0) {
        // Find the most recent cost record
        const recentCost = costResponse.data.maintenance_costs[0];
        await maintenanceCostsAPI.update(recentCost.id, { status: 'paid' });
        console.log('✅ Maintenance cost status updated to paid');
      }
      
      console.log('Updating asset status to working...');
      await rentalUnitsAPI.updateAssetStatus(asset.rental_unit_id, asset.asset_id, { 
        status: 'working',
        quantity: quantity
      });
      
      console.log('✅ Asset status updated successfully');
      toast.success(`${asset.name} (Qty: ${quantity}) status updated to working`);
      fetchMaintenanceAssets(); // Refresh the list
      console.log('=== MARK ASSET AS WORKING END (SUCCESS) ===');
    } catch (error) {
      console.error('❌ Error in markAssetAsWorking:', error);
      toast.error('Failed to update asset status');
      console.log('=== MARK ASSET AS WORKING END (ERROR) ===');
    }
  };

  const handleCloseModal = () => {
    setShowCostForm(false);
    setSelectedAsset(null);
    setIsEditing(false);
    setExistingCostData(null);
    setCostForm({
      repair_cost: '',
      currency: 'MVR',
      description: '',
      repair_date: '',
      repair_provider: '',
      notes: '',
      bills: []
    });
  };

  const handleCostDetailsClick = async (asset: Asset) => {
    console.log('=== HANDLE COST DETAILS CLICK START ===');
    console.log('Asset ID:', asset.id);
    console.log('Asset Name:', asset.name);
    
    try {
      // Check if maintenance cost already exists for this asset
      console.log('Checking for existing maintenance cost...');
      const response = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
      console.log('Cost response:', response.data);
      
      if (response.data && response.data.maintenance_costs && response.data.maintenance_costs.length > 0) {
        // Load existing maintenance cost data
        const existingCost = response.data.maintenance_costs[0];
        console.log('✅ Found existing maintenance cost:', existingCost);
        
        setExistingCostData(existingCost);
        setIsEditing(true);
        
        // Populate form with existing data
        const formattedDate = existingCost.repair_date ? new Date(existingCost.repair_date).toISOString().split('T')[0] : '';
        setCostForm({
          repair_cost: existingCost.repair_cost?.toString() || '',
          currency: existingCost.currency || 'MVR',
          description: existingCost.description || '',
          repair_date: formattedDate,
          repair_provider: existingCost.repair_provider || '',
          notes: existingCost.notes || '',
          bills: []
        });
        
        console.log('✅ Form populated with existing data');
      } else {
        // No existing cost, start fresh
        console.log('ℹ️ No existing maintenance cost found, starting fresh');
        setExistingCostData(null);
        setIsEditing(false);
        
        // Reset form to defaults
        setCostForm({
          repair_cost: '',
          currency: 'MVR',
          description: '',
          repair_date: '',
          repair_provider: '',
          notes: '',
          bills: []
        });
      }
      
      setSelectedAsset(asset);
      setShowCostForm(true);
      console.log('✅ Cost details form opened');
      console.log('=== HANDLE COST DETAILS CLICK END (SUCCESS) ===');
    } catch (error) {
      console.error('❌ Error in handleCostDetailsClick:', error);
      toast.error('Failed to load maintenance cost details');
      console.log('=== HANDLE COST DETAILS CLICK END (ERROR) ===');
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
            <p className="mt-2 text-gray-600">
              Manage assets requiring maintenance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => {
                fetchMaintenanceAssets();
              }}
              className="flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Assets Requiring Maintenance Section */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Assets Requiring Maintenance</CardTitle>
            <CardDescription className="text-gray-600">
              Assets that have been marked as needing maintenance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Asset Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Brand</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Cost Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Repair Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Maintenance Notes</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceAssets.map((asset) => (
                    <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{asset.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{asset.brand || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{asset.category}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          <div className="font-medium">{asset.rental_unit.property.name}</div>
                          <div className="text-gray-500">Unit {asset.rental_unit.unit_number}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={maintenanceQuantities[asset.id] || 1}
                          onChange={(e) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            setMaintenanceQuantities(prev => ({
                              ...prev,
                              [asset.id]: newQuantity
                            }));
                          }}
                          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {(() => {
                            // Find maintenance cost for this asset
                            const costData = maintenanceAssets.find(a => a.id === asset.id);
                            if (costData && costData.maintenance_cost) {
                              return `${costData.maintenance_cost.currency} ${parseFloat(costData.maintenance_cost.repair_cost).toLocaleString()}`;
                            }
                            return <span className="text-gray-400">No cost recorded</span>;
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">
                          {(() => {
                            // Find maintenance cost for this asset
                            const costData = maintenanceAssets.find(a => a.id === asset.id);
                            if (costData && costData.maintenance_cost && costData.maintenance_cost.repair_date) {
                              return new Date(costData.maintenance_cost.repair_date).toLocaleDateString();
                            }
                            return <span className="text-gray-400">No date set</span>;
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">
                          {asset.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600 max-w-xs">
                          {asset.maintenance_notes ? (
                            <div className="bg-yellow-50 p-2 rounded border">
                              {asset.maintenance_notes}
                            </div>
                          ) : (
                            <span className="text-gray-400">No notes provided</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCostDetailsClick(asset)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Cost Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔴 DONE BUTTON CLICKED for asset:', asset.id);
                              
                              // Direct API check - only allow if cost details were added AFTER asset was put into maintenance
                              try {
                                console.log('🔍 DEBUG: Checking cost details via API for asset ID:', asset.id);
                                console.log('🔍 DEBUG: Asset details:', asset);
                                console.log('🔍 DEBUG: Asset updated_at:', asset.updated_at);
                                
                                const response = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
                                console.log('🔍 DEBUG: Full API response:', response);
                                console.log('🔍 DEBUG: Response data:', response.data);
                                console.log('🔍 DEBUG: Maintenance costs array:', response.data?.maintenance_costs);
                                console.log('🔍 DEBUG: Array length:', response.data?.maintenance_costs?.length);
                                
                                if (!response.data || !response.data.maintenance_costs || response.data.maintenance_costs.length === 0) {
                                  console.log('🚫 BLOCKED: No cost details found');
                                  toast.error('Please fill out cost details first. Click &quot;Cost Details&quot; button to record maintenance costs before marking as done.');
                                  return;
                                }
                                
                                // Check if any cost details were created AFTER the asset was put into maintenance
                                const assetMaintenanceDate = new Date(asset.updated_at);
                                const recentCosts = response.data.maintenance_costs.filter((cost: { created_at: string }) => {
                                  const costDate = new Date(cost.created_at);
                                  const isRecent = costDate >= assetMaintenanceDate;
                                  console.log('🔍 DEBUG: Cost created_at:', cost.created_at, 'Asset updated_at:', asset.updated_at, 'Is recent:', isRecent);
                                  return isRecent;
                                });
                                
                                console.log('🔍 DEBUG: Recent costs count:', recentCosts.length);
                                
                                if (recentCosts.length === 0) {
                                  console.log('🚫 BLOCKED: No recent cost details found (all costs are older than maintenance date)');
                                  toast.error('Please add fresh cost details for this maintenance cycle. Click &quot;Cost Details&quot; button to record new maintenance costs.');
                                  return;
                                }
                                
                                console.log('✅ Recent cost details found, proceeding...');
                                markAssetAsWorking(asset);
                              } catch (error) {
                                console.log('🚫 BLOCKED: Error checking cost details:', error);
                                console.log('🚫 DEBUG: Error details:', error);
                                toast.error('Please fill out cost details first. Click &quot;Cost Details&quot; button to record maintenance costs before marking as done.');
                                return;
                              }
                            }}
                            className="text-green-600 hover:text-green-700 border-green-200"
                            title="Mark as done"
                          >
                            Done
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {maintenanceAssets.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No assets requiring maintenance</h3>
                <p className="mt-1 text-sm text-gray-500">
                  All assets are in working condition.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Form Modal */}
        {showCostForm && selectedAsset && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => {
              // Only close if clicking directly on the backdrop, not on child elements
              if (e.target === e.currentTarget) {
                handleCloseModal();
              }
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4">
                  {isEditing ? 'Edit Maintenance Cost' : 'Record Maintenance Cost'}
                </h2>
                <p className="text-gray-600 mb-6">
                  Record the repair cost and details for <strong>{selectedAsset.name}</strong> at {selectedAsset.rental_unit.property.name} Unit {selectedAsset.rental_unit.unit_number}. After saving the cost, use the &quot;Done&quot; button to mark the asset as working.
                </p>
              </div>

              <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repair Cost *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costForm.repair_cost}
                      onChange={(e) => {
                        console.log('🔧 Repair cost changed from', costForm.repair_cost, 'to', e.target.value);
                        setCostForm({...costForm, repair_cost: e.target.value});
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={costForm.currency}
                      onChange={(e) => setCostForm({...costForm, currency: e.target.value})}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="USD">USD</option>
                      <option value="MVR">MVR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={costForm.description}
                    onChange={(e) => setCostForm({...costForm, description: e.target.value})}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe the repair work done..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repair Date
                    </label>
                    <input
                      type="date"
                      value={costForm.repair_date}
                      onChange={(e) => setCostForm({...costForm, repair_date: e.target.value})}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {isEditing && (
                      <p className="text-xs text-gray-500 mt-1">
                        Debug: {costForm.repair_date || 'No date'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repair Provider
                    </label>
                    <input
                      type="text"
                      value={costForm.repair_provider}
                      onChange={(e) => setCostForm({...costForm, repair_provider: e.target.value})}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Company or technician name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attach Bills
                  </label>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      setCostForm({...costForm, bills: [...costForm.bills, ...newFiles]});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: PDF, JPG, PNG (max 10MB each)
                  </p>
                  
                  {/* Display existing attached bills when editing */}
                  {isEditing && existingCostData && existingCostData.bill_file_paths && existingCostData.bill_file_paths.split(',').length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Existing Attached Bills:</p>
                      <div className="space-y-2">
                        {existingCostData.bill_file_paths.split(',').map((billPath: string, index: number) => {
                          const fileName = billPath.split('/').pop() || 'Unknown file';
                          return (
                            <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded-md border border-green-200">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-700">{fileName}</span>
                                <span className="text-xs text-gray-500">(Existing)</span>
                              </div>
                              <a
                                href={`/storage/${billPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700 text-sm"
                              >
                                View
                              </a>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Note: Adding new files will keep existing bills. To replace, contact administrator.
                      </p>
                    </div>
                  )}
                  
                  {/* Display selected files */}
                  {costForm.bills.length > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Selected Files:</p>
                        <button
                          type="button"
                          onClick={() => setCostForm({...costForm, bills: []})}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2">
                        {costForm.bills.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-gray-700">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedBills = costForm.bills.filter((_, i) => i !== index);
                                setCostForm({...costForm, bills: updatedBills});
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={costForm.notes}
                    onChange={(e) => setCostForm({...costForm, notes: e.target.value})}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCostFormSubmit}
                  disabled={!costForm.repair_cost}
                >
                  {isEditing ? 'Update' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}