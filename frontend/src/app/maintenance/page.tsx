'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Select } from '../../components/UI/Select';
import { Wrench, RefreshCw, Trash2 } from 'lucide-react';
import { rentalUnitsAPI, maintenanceCostsAPI, maintenanceRequestsAPI, currenciesAPI } from '../../services/api';
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
    currency_id?: number;
    currency?: {
      id: number;
      code: string;
    };
    repair_date: string;
    description?: string;
    repair_provider?: string;
    notes?: string;
    maintenance_request_id?: number;
  };
  rental_unit: {
    id: number;
    unit_number: string;
    property: {
      id: number;
      name: string;
    };
    tenant?: {
      id: number;
      full_name?: string;
    } | null;
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
  const [currencies, setCurrencies] = useState<Array<{ id: number; code: string; is_default: boolean }>>([]);
  const [existingCostData, setExistingCostData] = useState<{
    id: number;
    repair_cost: number;
    currency_id?: number;
    currency?: {
      id: number;
      code: string;
    };
    description: string;
    repair_date: string;
    repair_provider: string;
    notes: string;
    bill_file_paths: string;
  } | null>(null);
  const [costForm, setCostForm] = useState({
    repair_cost: '',
    currency_id: '',
    description: '',
    repair_date: '',
    repair_provider: '',
    notes: '',
    bills: [] as File[]
  });
  const [currenciesLoading, setCurrenciesLoading] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loadingCostDetails, setLoadingCostDetails] = useState<number | null>(null);
  const [savingCost, setSavingCost] = useState(false);
  const [processingDone, setProcessingDone] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 15;

  // Filter assets based on status
  const filteredAssets = useMemo(() => {
    if (!statusFilter) {
      return maintenanceAssets;
    }
    return maintenanceAssets.filter(asset => asset.status === statusFilter);
  }, [maintenanceAssets, statusFilter]);

  const allSelected = filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length;
  const partiallySelected = selectedAssetIds.length > 0 && selectedAssetIds.length < filteredAssets.length;

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const toggleSelectOne = (assetId: number, checked: boolean) => {
    setSelectedAssetIds(prev => {
      if (checked) {
        return prev.includes(assetId) ? prev : [...prev, assetId];
      }
      return prev.filter(id => id !== assetId);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedAssetIds.length === 0) {
      toast.error('No items selected');
      return;
    }
    // Confirm
    if (!confirm(`Delete maintenance records for ${selectedAssetIds.length} item(s)? This will remove maintenance costs, requests, and reset asset status to working.`)) return;

    try {
      const selectedAssets = maintenanceAssets.filter(a => selectedAssetIds.includes(a.id));
      
      // Delete maintenance costs and requests
      const deletions = [];
      const requestDeletions = [];
      
      for (const asset of selectedAssets) {
        if (asset.maintenance_cost?.id) {
          deletions.push(maintenanceCostsAPI.delete(asset.maintenance_cost.id));
        }
        if (asset.maintenance_cost?.maintenance_request_id) {
          requestDeletions.push(maintenanceRequestsAPI.delete(asset.maintenance_cost.maintenance_request_id as unknown as number));
        }
      }

      // Update asset status back to "working"
      const assetUpdates = selectedAssets.map(asset => 
        rentalUnitsAPI.updateAssetStatus(asset.rental_unit_id, asset.asset_id, {
          status: 'working',
          quantity: asset.quantity || 1
        })
      );

      if (deletions.length === 0 && requestDeletions.length === 0 && assetUpdates.length === 0) {
        toast('No maintenance records to delete for selected items');
        return;
      }

      await Promise.all([...deletions, ...requestDeletions, ...assetUpdates]);
      toast.success('Selected maintenance records deleted and assets reset to working');
      setSelectedAssetIds([]);
      fetchMaintenanceAssets(currentPage);
    } catch (e) {
      console.error('Bulk delete failed', e);
      toast.error('Failed to delete selected items');
    }
  };

  useEffect(() => {
    fetchMaintenanceAssets(currentPage);
    fetchCurrencies();
  }, [currentPage]);

  // Reset to page 1 when status filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      fetchMaintenanceAssets(1);
    }
  }, [statusFilter]);

  // Set default currency when currencies load
  useEffect(() => {
    if (currencies.length > 0 && !costForm.currency_id && !currenciesLoading) {
      const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
      if (defaultCurrency) {
        console.log('Setting default currency:', defaultCurrency);
        setCostForm(prev => ({ ...prev, currency_id: defaultCurrency.id.toString() }));
      }
    }
  }, [currencies, currenciesLoading]);

  const fetchCurrencies = async () => {
    try {
      setCurrenciesLoading(true);
      console.log('[fetchCurrencies] Starting fetch...');
      const response = await currenciesAPI.getAll();
      console.log('[fetchCurrencies] Response received:', response);
      console.log('[fetchCurrencies] Response data:', response.data);
      
      const currenciesList = response.data?.currencies || [];
      console.log('[fetchCurrencies] Currencies list:', currenciesList);
      console.log('[fetchCurrencies] Currencies count:', currenciesList.length);
      
      if (currenciesList.length === 0) {
        console.warn('[fetchCurrencies] No currencies found in response');
        toast.error('No currencies available. Please add currencies in the Currencies page.');
        setCurrencies([]);
        return;
      }
      
      setCurrencies(currenciesList);
      console.log('[fetchCurrencies] Currencies state updated, count:', currenciesList.length);
      
    } catch (error: any) {
      console.error('[fetchCurrencies] Error fetching currencies:', error);
      console.error('[fetchCurrencies] Error response:', error?.response);
      console.error('[fetchCurrencies] Error data:', error?.response?.data);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to fetch currencies';
      toast.error(errorMessage);
      setCurrencies([]);
    } finally {
      setCurrenciesLoading(false);
      console.log('[fetchCurrencies] Loading complete, currenciesLoading set to false');
    }
  };

  const fetchMaintenanceAssets = async (page: number = currentPage) => {
    try {
      setLoading(true);
      const response = await rentalUnitsAPI.getMaintenanceAssets({
        page,
        per_page: perPage
      });
      const assets = response.data.assets || [];
      setMaintenanceAssets(assets);
      
      // Initialize maintenance quantities
      const quantities: {[key: number]: number} = {};
      assets.forEach((asset: Asset) => {
        quantities[asset.id] = asset.quantity || 1;
      });
      setMaintenanceQuantities(quantities);

      // Update pagination state
      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.current_page);
        setTotalPages(response.data.pagination.last_page);
        setTotal(response.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching maintenance assets:', error);
      toast.error('Failed to fetch maintenance assets');
    } finally {
      setLoading(false);
    }
  };

  const handleCostFormSubmit = async () => {
    if (!selectedAsset || !costForm.repair_cost) {
      toast.error('Please fill in the repair cost');
      return;
    }

    setSavingCost(true);

    try {
      // Validate that repair_cost is a valid number
      const repairCost = parseFloat(costForm.repair_cost);
      if (isNaN(repairCost) || repairCost <= 0) {
        toast.error('Please enter a valid repair cost');
        return;
      }

      if (isEditing && existingCostData) {
        // Update existing maintenance cost
        await maintenanceCostsAPI.update(existingCostData.id, {
          repair_cost: repairCost,
          currency_id: costForm.currency_id ? parseInt(costForm.currency_id) : undefined,
          description: costForm.description,
          repair_date: costForm.repair_date,
          repair_provider: costForm.repair_provider,
          notes: costForm.notes,
        }, costForm.bills);

        toast.success('Maintenance cost updated successfully');
        handleCloseModal();
        // Only refresh the specific asset instead of all assets
        fetchMaintenanceAssets(currentPage);
      } else {
        // Create new maintenance cost
        await maintenanceCostsAPI.create({
          rental_unit_asset_id: selectedAsset.id,
          repair_cost: repairCost,
          currency_id: costForm.currency_id ? parseInt(costForm.currency_id) : undefined,
          description: costForm.description,
          repair_date: costForm.repair_date,
          repair_provider: costForm.repair_provider,
          notes: costForm.notes,
        }, costForm.bills);

        toast.success('Maintenance cost recorded successfully');
        handleCloseModal();
        fetchMaintenanceAssets(currentPage);
      }
      
    } catch (error) {
      console.error('Error recording maintenance cost:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'record'} maintenance cost`);
    } finally {
      setSavingCost(false);
    }
  };

  const markAssetAsWorking = async (asset: Asset) => {
    setProcessingDone(asset.id);
    
    try {
      const quantity = maintenanceQuantities[asset.id] || 1;
      
      // First, update maintenance cost status to 'paid' to make it visible on Maintenance Cost page
      const costResponse = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
      if (costResponse.data?.maintenance_costs?.length > 0) {
        // Find the most recent cost record
        const recentCost = costResponse.data.maintenance_costs[0];
        
        // Create a maintenance request first
        const maintenanceRequestResponse = await maintenanceRequestsAPI.create({
          title: `Maintenance for ${asset.name}`,
          description: `Maintenance completed for ${asset.name} in ${asset.rental_unit?.property?.name || 'Unknown Property'} - Unit ${asset.rental_unit?.unit_number || 'Unknown'}`,
          property_id: asset.rental_unit?.property?.id || 1,
          rental_unit_id: asset.rental_unit_id,
          tenant_id: asset.rental_unit?.tenant?.id || undefined,
          priority: 'medium',
          status: 'repaired',
          request_date: new Date().toISOString().split('T')[0],
          completed_date: new Date().toISOString().split('T')[0],
          actual_cost: recentCost.repair_cost,
        });
        
        if (maintenanceRequestResponse.data?.maintenance_request?.id) {
          const maintenanceRequestId = maintenanceRequestResponse.data.maintenance_request.id;
          
          // Update the maintenance cost to link it to the maintenance request
          await maintenanceCostsAPI.update(recentCost.id, { 
            status: 'paid',
            maintenance_request_id: maintenanceRequestId
          });
        } else {
          // Fallback: just update the cost status
          await maintenanceCostsAPI.update(recentCost.id, { status: 'paid' });
        }
      }
      
      // Validate required fields
      if (!asset.rental_unit_id || !asset.asset_id) {
        toast.error('Invalid asset data. Please refresh and try again.');
        throw new Error('Missing required IDs');
      }
      
      // Ensure IDs are numbers
      const rentalUnitId = parseInt(String(asset.rental_unit_id), 10);
      const assetId = parseInt(String(asset.asset_id), 10);
      
      if (isNaN(rentalUnitId) || isNaN(assetId)) {
        toast.error('Invalid asset ID format. Please refresh and try again.');
        throw new Error('Invalid ID format');
      }
      
      const updateData = { 
        status: 'repaired',
        quantity: quantity
      };
      
      await rentalUnitsAPI.updateAssetStatus(rentalUnitId, assetId, updateData);
      
      toast.success(`${asset.name} (Qty: ${quantity}) maintenance completed and marked as repaired`);
      fetchMaintenanceAssets(currentPage); // Refresh the list
    } catch (error) {
      console.error('Error in markAssetAsWorking:', error);
      toast.error('Failed to update asset status');
    } finally {
      setProcessingDone(null);
    }
  };

  const handleCloseModal = () => {
    setShowCostForm(false);
    setSelectedAsset(null);
    setIsEditing(false);
    setExistingCostData(null);
    const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
    setCostForm({
      repair_cost: '',
      currency_id: defaultCurrency ? defaultCurrency.id.toString() : '',
      description: '',
      repair_date: '',
      repair_provider: '',
      notes: '',
      bills: []
    });
  };

  const handleCostDetailsClick = async (asset: Asset) => {
    setLoadingCostDetails(asset.id);
    
    try {
      // Ensure currencies are loaded before opening form
      if (currencies.length === 0 && !currenciesLoading) {
        await fetchCurrencies();
      }
      
      // Check if maintenance cost already exists for this asset
      const response = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
      
      if (response.data && response.data.maintenance_costs && response.data.maintenance_costs.length > 0) {
        // Load existing maintenance cost data
        const existingCost = response.data.maintenance_costs[0];
        
        setExistingCostData(existingCost);
        setIsEditing(true);
        
        // Populate form with existing data
        const formattedDate = existingCost.repair_date ? new Date(existingCost.repair_date).toISOString().split('T')[0] : '';
        const currencyId = existingCost.currency_id || existingCost.currency?.id;
        const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
        setCostForm({
          repair_cost: existingCost.repair_cost?.toString() || '',
          currency_id: currencyId ? currencyId.toString() : (defaultCurrency ? defaultCurrency.id.toString() : ''),
          description: existingCost.description || '',
          repair_date: formattedDate,
          repair_provider: existingCost.repair_provider || '',
          notes: existingCost.notes || '',
          bills: []
        });
      } else {
        // No existing cost, start fresh
        setExistingCostData(null);
        setIsEditing(false);
        
        // Reset form to defaults
        const defaultCurrency = currencies.find(c => c.is_default) || currencies[0];
        if (!defaultCurrency && currencies.length === 0) {
          toast.error('Please wait for currencies to load or add currencies in the Currencies page.');
          return;
        }
        setCostForm({
          repair_cost: '',
          currency_id: defaultCurrency ? defaultCurrency.id.toString() : '',
          description: '',
          repair_date: '',
          repair_provider: '',
          notes: '',
          bills: []
        });
      }
      
      setSelectedAsset(asset);
      setShowCostForm(true);
    } catch (error) {
      console.error('Error in handleCostDetailsClick:', error);
      toast.error('Failed to load maintenance cost details');
    } finally {
      setLoadingCostDetails(null);
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
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedAssetIds.length === 0}
              className="flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedAssetIds.length})
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                fetchMaintenanceAssets(currentPage);
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
            {/* Status Filter */}
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-48"
                >
                  <option value="">All Status</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="repaired">Repaired</option>
                </Select>
              </div>
              {statusFilter && (
                <span className="text-sm text-gray-500">
                  Showing {filteredAssets.length} of {maintenanceAssets.length} assets
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs w-8">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(input) => { if (input) input.indeterminate = partiallySelected; }}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Asset Name</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Brand</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Category</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Location</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Qty</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Cost</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Date</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Status</th>
                    <th className="text-left py-1.5 px-2 font-medium text-gray-600 text-xs">Notes</th>
                    <th className="text-right py-1.5 px-2 font-medium text-gray-600 text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((asset) => (
                    <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-1.5 px-2">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(asset.id)}
                          onChange={(e) => toggleSelectOne(asset.id, e.target.checked)}
                          className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="font-medium text-gray-900 text-xs">{asset.name}</div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-gray-600 text-xs">{asset.brand || 'N/A'}</div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-gray-600 text-xs">{asset.category}</div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium">{asset.rental_unit.property.name}</div>
                          <div className="text-gray-500 text-[10px]">Unit {asset.rental_unit.unit_number}</div>
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
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
                          className="w-12 px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-xs text-gray-600">
                          {(() => {
                            // Find maintenance cost for this asset
                            const costData = maintenanceAssets.find(a => a.id === asset.id);
                            if (costData && costData.maintenance_cost) {
                              const currencyCode = costData.maintenance_cost.currency?.code || costData.maintenance_cost.currency || 'MVR';
                              return `${currencyCode} ${parseFloat(costData.maintenance_cost.repair_cost).toLocaleString()}`;
                            }
                            return <span className="text-gray-400 text-[10px]">No cost</span>;
                          })()}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-xs text-gray-600">
                          {(() => {
                            // Find maintenance cost for this asset
                            const costData = maintenanceAssets.find(a => a.id === asset.id);
                            if (costData && costData.maintenance_cost && costData.maintenance_cost.repair_date) {
                              return new Date(costData.maintenance_cost.repair_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            }
                            return <span className="text-gray-400 text-[10px]">No date</span>;
                          })()}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                          asset.status === 'repaired' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {asset.status === 'repaired' ? 'Repaired' : 'Maintenance'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="text-xs text-gray-600 max-w-xs">
                          {asset.maintenance_notes ? (
                            <div className="bg-yellow-50 p-1 rounded border text-[10px] line-clamp-2">
                              {asset.maintenance_notes}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[10px]">No notes</span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCostDetailsClick(asset)}
                            disabled={loadingCostDetails === asset.id}
                            className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 h-7"
                          >
                            {loadingCostDetails === asset.id ? (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                <span className="text-[10px]">Loading</span>
                              </>
                            ) : (
                              <span className="text-xs">Cost</span>
                            )}
                          </Button>
                          {asset.status === 'maintenance' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Direct API check - only allow if cost details were added AFTER asset was put into maintenance
                                try {
                                  const response = await maintenanceCostsAPI.getByRentalUnitAsset(asset.id);
                                  
                                  if (!response.data || !response.data.maintenance_costs || response.data.maintenance_costs.length === 0) {
                                    toast.error('Please fill out cost details first. Click "Cost Details" button to record maintenance costs before marking as done.');
                                    return;
                                  }
                                  
                                  // Check if any cost details were created AFTER the asset was put into maintenance
                                  const assetMaintenanceDate = new Date(asset.updated_at);
                                  const recentCosts = response.data.maintenance_costs.filter((cost: { created_at: string }) => {
                                    const costDate = new Date(cost.created_at);
                                    return costDate >= assetMaintenanceDate;
                                  });
                                  
                                  if (recentCosts.length === 0) {
                                    toast.error('Please add fresh cost details for this maintenance cycle. Click "Cost Details" button to record new maintenance costs.');
                                    return;
                                  }
                                  
                                  markAssetAsWorking(asset);
                                } catch (error) {
                                  console.error('Error checking cost details:', error);
                                  toast.error('Please fill out cost details first. Click "Cost Details" button to record maintenance costs before marking as done.');
                                  return;
                                }
                              }}
                              disabled={processingDone === asset.id}
                              className="text-green-600 hover:text-green-700 border-green-200 text-xs px-2 py-1 h-7"
                              title="Mark as done"
                            >
                              {processingDone === asset.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  <span className="text-[10px]">Processing</span>
                                </>
                              ) : (
                                <span className="text-xs">Done</span>
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {statusFilter ? `No assets with status "${statusFilter}"` : 'No assets requiring maintenance'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {statusFilter ? 'Try selecting a different status filter.' : 'All assets are in working condition.'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * perPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * perPage, total)}</span> of{' '}
                    <span className="font-medium">{total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      variant="outline"
                      onClick={() => fetchMaintenanceAssets(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="rounded-l-md"
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => fetchMaintenanceAssets(pageNum)}
                          disabled={loading}
                          className={currentPage === pageNum ? "z-10 bg-blue-600 text-white" : ""}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      onClick={() => fetchMaintenanceAssets(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="rounded-r-md"
                    >
                      Next
                    </Button>
                  </nav>
                </div>
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
                    {(() => {
                      console.log('[Currency Select] Render state:', {
                        currenciesLoading,
                        currenciesCount: currencies.length,
                        currencies: currencies,
                        currency_id: costForm.currency_id
                      });
                      return null;
                    })()}
                    <select
                      value={costForm.currency_id || ''}
                      onChange={(e) => {
                        console.log('[Currency Select] Changed to:', e.target.value);
                        setCostForm({...costForm, currency_id: e.target.value});
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      disabled={currenciesLoading || currencies.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    >
                      {currenciesLoading ? (
                        <option value="">Loading currencies...</option>
                      ) : currencies.length === 0 ? (
                        <option value="">No currencies available</option>
                      ) : (
                        currencies.map((currency) => (
                          <option key={currency.id} value={currency.id.toString()}>
                            {currency.code} {currency.is_default ? '(Default)' : ''}
                          </option>
                        ))
                      )}
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
                  disabled={!costForm.repair_cost || savingCost}
                >
                  {savingCost ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    isEditing ? 'Update' : 'Save'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}