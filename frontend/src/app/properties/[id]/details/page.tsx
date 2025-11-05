'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/UI/Tabs';
import {
  ArrowLeft,
  Edit,
  Plus,
  Building2,
  MapPin,
  Users,
  Wrench,
  DollarSign,
  Package,
  FileText,
  TrendingUp,
  Search,
  Eye,
  Tool,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload
} from 'lucide-react';
import {
  propertiesAPI,
  rentalUnitsAPI,
  maintenanceAPI,
  maintenanceCostsAPI,
  rentInvoicesAPI
} from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';
import { ResponsiveTable } from '@/components/Responsive/ResponsiveTable';

// Interfaces
interface Property {
  id: number;
  name: string;
  street: string;
  island: string;
  type: string;
  status: string;
  number_of_rental_units: number;
  created_at: string;
  updated_at: string;
}

interface RentalUnit {
  id: number;
  property_id: number;
  unit_number: string;
  floor_number: number;
  number_of_rooms: number;
  number_of_toilets: number;
  rent_amount: number;
  deposit_amount?: number;
  currency: string;
  status: string;
  tenant_id?: number;
  move_in_date?: string;
  lease_end_date?: string;
  notes?: string;
  is_active: boolean;
  tenant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

interface Asset {
  id: number;
  asset_id: number;
  rental_unit_id: number;
  quantity: number;
  serial_numbers?: string;
  purchase_date?: string;
  warranty_end_date?: string;
  estimated_life_remaining?: number;
  status: string;
  asset: {
    id: number;
    name: string;
    brand?: string;
    serial_no?: string;
    category: string;
  };
  rental_unit: {
    id: number;
    unit_number: string;
  };
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  property_id: number;
  rental_unit_id?: number;
  tenant_id?: number;
  priority: string;
  status: string;
  request_date: string;
  scheduled_date?: string;
  completed_date?: string;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  rentalUnit?: {
    unit_number: string;
  };
  created_at: string;
}

interface MaintenanceCost {
  id: number;
  repair_cost: number;
  currency: string;
  description?: string;
  repair_date?: string;
  repair_provider?: string;
  status: string;
  rental_unit_asset?: {
    asset: {
      name: string;
    };
    rental_unit: {
      unit_number: string;
    };
  };
  created_at: string;
}

interface Tenant {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  lease_start_date?: string;
  lease_end_date?: string;
}

interface RentInvoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  currency: string;
  status: string;
}

export default function PropertyDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  
  // State
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [maintenanceCosts, setMaintenanceCosts] = useState<MaintenanceCost[]>([]);
  const [rentInvoices, setRentInvoices] = useState<RentInvoice[]>([]);
  
  // Loading states
  const [rentalUnitsLoading, setRentalUnitsLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  
  // Filter states
  const [maintenanceStatusFilter, setMaintenanceStatusFilter] = useState<string>('all');
  const [assetSearchTerm, setAssetSearchTerm] = useState('');
  const [maintenanceSearchTerm, setMaintenanceSearchTerm] = useState('');

  // Component unmount tracking (must be declared before use in callbacks)
  const isMountedRef = useRef(true);

  // Fetch property (with timeout handling and retry)
  const fetchProperty = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true);
      
      // Increase timeout to 25 seconds and use axios timeout instead
      const response = await propertiesAPI.getById(parseInt(propertyId));
      
      if (!isMountedRef.current) return;
      
      if (response?.data?.property) {
        setProperty(response.data.property);
      } else {
        toast.error('Property data not found in response');
        setProperty(null);
      }
      setLoading(false);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching property:', error);
      
      // Check if it's an axios timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Request timed out. The server may be slow. Please try refreshing the page.');
      } else if (error.response?.status === 404) {
        toast.error('Property not found.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication required. Please log in again.');
        router.push('/login');
      } else {
        toast.error('Failed to fetch property details. Please try again.');
      }
      
      setLoading(false);
      // Set property to null so error state shows
      setProperty(null);
    }
  }, [propertyId, router]);

  // Fetch rental units (without assets)
  const fetchRentalUnits = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setRentalUnitsLoading(true);
      const response = await rentalUnitsAPI.getByProperty(parseInt(propertyId));
      
      if (!isMountedRef.current) return;
      
      setRentalUnits(response?.data?.rentalUnits || []);
      setRentalUnitsLoading(false);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching rental units:', error);
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Rental units fetch timed out. Please try again.');
      } else {
        toast.error('Failed to fetch rental units');
      }
      setRentalUnitsLoading(false);
    }
  }, [propertyId]);

  // Refs to track if data has been fetched (prevent infinite loops)
  const assetsFetchedRef = useRef(false);
  const maintenanceFetchedRef = useRef(false);
  const invoicesFetchedRef = useRef(false);

  // Fetch assets for all rental units (lazy loaded)
  const fetchAssets = useCallback(async () => {
    if (!isMountedRef.current || assetsLoading || assetsFetchedRef.current) return; // Prevent duplicate fetches
    
    try {
      setAssetsLoading(true);
      assetsFetchedRef.current = true;
      const units = rentalUnits.length > 0 ? rentalUnits : (await rentalUnitsAPI.getByProperty(parseInt(propertyId))).data?.rentalUnits || [];
      
      if (!isMountedRef.current) return;
      
      if (!units || units.length === 0) {
        setAssets([]);
        setAssetsLoading(false);
        return;
      }

      // Fetch assets for all units in parallel
      const assetPromises = units.map(async (unit) => {
        if (!unit || !unit.id) return [];
        try {
          const assetsResponse = await rentalUnitsAPI.getAssets(unit.id);
          return assetsResponse?.data?.assets || [];
        } catch (err) {
          console.error(`Error fetching assets for unit ${unit.id}:`, err);
          return []; // Return empty array on error
        }
      });

      const assetArrays = await Promise.all(assetPromises);
      const allAssets = assetArrays.flat().filter(asset => asset && asset.asset && asset.rental_unit);
      
      if (!isMountedRef.current) return;
      
      setAssets(allAssets);
      setAssetsLoading(false);
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching assets:', error);
      toast.error('Failed to fetch assets');
      setAssetsLoading(false);
      assetsFetchedRef.current = false; // Reset on error to allow retry
    }
  }, [propertyId, rentalUnits.length, assetsLoading]);

  // Fetch maintenance requests
  const fetchMaintenance = useCallback(async () => {
    if (!isMountedRef.current || maintenanceLoading || maintenanceFetchedRef.current) return; // Prevent duplicate fetches
    
    try {
      setMaintenanceLoading(true);
      maintenanceFetchedRef.current = true;

      const [requestsResponse, costsResponse] = await Promise.all([
        maintenanceAPI.getAll({ property_id: propertyId }),
        maintenanceCostsAPI.getAll({ property_id: propertyId })
      ]);
      
      if (!isMountedRef.current) return;
      
      const requests = requestsResponse?.data?.maintenanceRequests?.data || requestsResponse?.data?.maintenanceRequests || [];
      const costs = costsResponse?.data?.maintenanceCosts || costsResponse?.data?.data || [];
      
      setMaintenanceRequests(Array.isArray(requests) ? requests : []);
      setMaintenanceCosts(Array.isArray(costs) ? costs : []);
      setMaintenanceLoading(false);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching maintenance:', error);
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast.error('Maintenance data fetch timed out. Please try again.');
      } else {
        toast.error('Failed to fetch maintenance data');
      }
      setMaintenanceLoading(false);
      maintenanceFetchedRef.current = false; // Reset on error to allow retry
    }
  }, [propertyId, maintenanceLoading]);

  // Fetch rent invoices (lazy loaded - only when needed)
  const fetchRentInvoices = useCallback(async () => {
    // Prevent duplicate fetches
    if (!isMountedRef.current || invoicesFetchedRef.current) return;
    
    try {
      invoicesFetchedRef.current = true;
      const response = await rentInvoicesAPI.getAll({ property_id: propertyId });
      
      if (!isMountedRef.current) return;
      
      const invoices = response?.data?.rentInvoices || response?.data?.data || [];
      setRentInvoices(Array.isArray(invoices) ? invoices : []);
    } catch (error: any) {
      if (!isMountedRef.current) return;
      
      console.error('Error fetching rent invoices:', error);
      // Silently fail for invoices - not critical for initial load
      // Set empty array to prevent retry loops
      setRentInvoices([]);
      invoicesFetchedRef.current = false; // Reset on error to allow retry
    }
  }, [propertyId]);

  // Initial data fetch - only essential data (no invoices - lazy loaded)
  useEffect(() => {
    if (!propertyId) return;
    
    isMountedRef.current = true;
    
    // Reset refs when property changes
    assetsFetchedRef.current = false;
    maintenanceFetchedRef.current = false;
    invoicesFetchedRef.current = false;
    
    const loadData = async () => {
      try {
        await Promise.all([
          fetchProperty(),
          fetchRentalUnits(),
          fetchMaintenance()
        ]);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadData();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // Load tab-specific data when tab changes (lazy loading)
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (activeTab === 'assets' && !assetsLoading && !assetsFetchedRef.current && rentalUnits.length > 0) {
      fetchAssets();
    }
    if (activeTab === 'maintenance' && !maintenanceLoading && !maintenanceFetchedRef.current) {
      fetchMaintenance();
    }
    if (activeTab === 'financials' && !invoicesFetchedRef.current) {
      fetchRentInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, rentalUnits.length]);

  // Calculations - with null safety
  const occupiedUnits = (rentalUnits || []).filter(u => u && u.status === 'occupied' && u.tenant_id);
  const vacantUnits = (rentalUnits || []).filter(u => u && u.status === 'vacant');
  const totalUnits = rentalUnits.length;
  const occupiedCount = occupiedUnits.length;
  const vacantCount = vacantUnits.length;
  const totalMonthlyRent = occupiedUnits.reduce((sum, unit) => sum + (unit?.rent_amount || 0), 0);
  const openMaintenanceCount = (maintenanceRequests || []).filter(m => m && ['open', 'in_progress'].includes(m.status)).length;
  
  // Get all tenants (for multiple units)
  const allTenants = occupiedUnits
    .filter(u => u?.tenant)
    .map(u => ({
      name: `${u.tenant?.first_name || ''} ${u.tenant?.last_name || ''}`.trim(),
      email: u.tenant?.email || '',
      phone: u.tenant?.phone || '',
      unitNumber: u.unit_number,
      moveInDate: u.move_in_date,
      leaseEndDate: u.lease_end_date,
      securityDeposit: u.deposit_amount || 0,
      currency: u.currency || 'MVR'
    }));

  // Get earliest lease end date (most urgent)
  const earliestLeaseEndDate = occupiedUnits
    .filter(u => u?.lease_end_date)
    .map(u => new Date(u.lease_end_date!))
    .sort((a, b) => a.getTime() - b.getTime())[0];

  // Recent maintenance (last 5) - with null safety
  const recentMaintenance = (maintenanceRequests || [])
    .filter(m => m && m.created_at)
    .sort((a, b) => {
      try {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 5);

  // Total maintenance spend YTD - with null safety
  const currentYear = new Date().getFullYear();
  const ytdMaintenanceSpend = (maintenanceCosts || [])
    .filter(cost => {
      if (!cost) return false;
      try {
        const costDate = cost.repair_date || cost.created_at;
        if (!costDate) return false;
        return new Date(costDate).getFullYear() === currentYear;
      } catch {
        return false;
      }
    })
    .reduce((sum, cost) => sum + (cost?.repair_cost || 0), 0);

  // Filtered maintenance - with null safety
  const filteredMaintenance = (maintenanceRequests || []).filter(req => {
    if (!req) return false;
    if (maintenanceStatusFilter !== 'all' && req.status !== maintenanceStatusFilter) {
      return false;
    }
    if (maintenanceSearchTerm) {
      const searchLower = maintenanceSearchTerm.toLowerCase();
      const titleMatch = req.title?.toLowerCase().includes(searchLower) || false;
      const descMatch = req.description?.toLowerCase().includes(searchLower) || false;
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  });

  // Filtered assets - with null safety
  const filteredAssets = (assets || []).filter(asset => {
    if (!asset || !asset.asset || !asset.rental_unit) return false;
    if (assetSearchTerm) {
      const searchLower = assetSearchTerm.toLowerCase();
      const nameMatch = asset.asset.name?.toLowerCase().includes(searchLower) || false;
      const brandMatch = asset.asset.brand?.toLowerCase().includes(searchLower) || false;
      const serialMatch = asset.serial_numbers?.toLowerCase().includes(searchLower) || false;
      const unitMatch = asset.rental_unit.unit_number?.toLowerCase().includes(searchLower) || false;
      if (!nameMatch && !brandMatch && !serialMatch && !unitMatch) return false;
    }
    return true;
  });

  // Total asset value (placeholder - would need purchase price from asset data)
  const totalAssetValue = assets.length; // Placeholder count

  if (loading) {
    return (
      <SidebarLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 rounded-lg border border-gray-200 animate-pulse"></div>
            ))}
          </div>
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading property details...</p>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!property) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h2>
            <p className="text-gray-600 mb-4">The property you're looking for doesn't exist or couldn't be loaded.</p>
            <Button onClick={() => router.push('/properties')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Properties
            </Button>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/properties" prefetch={true}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.name || `${property.street}`}</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600 flex items-center">
                <MapPin className="h-4 w-4 mr-1" />
                {property.street}, {property.island}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/properties/${propertyId}/edit`} prefetch={true}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Property
              </Button>
            </Link>
            <Button onClick={() => router.push(`/maintenance?property_id=${propertyId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Work Order
            </Button>
            <Button onClick={() => router.push(`/assets?property_id=${propertyId}`)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tenant">Tenant & Lease</TabsTrigger>
            <TabsTrigger value="assets">Assets/Inventory</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Log</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Occupancy Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {totalUnits > 0 ? (
                      <span className="text-green-600">{occupiedCount}/{totalUnits}</span>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {occupiedCount} occupied, {vacantCount} vacant
                  </p>
                  {earliestLeaseEndDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Earliest lease ends {earliestLeaseEndDate.toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Monthly Rent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {occupiedUnits.length > 0 && occupiedUnits[0]?.currency ? occupiedUnits[0].currency : 'MVR'} {totalMonthlyRent.toLocaleString()}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{occupiedUnits.length} occupied unit(s)</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Next Payment Due</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {rentInvoices.length > 0 && rentInvoices[0] ? (
                      <>
                        {rentInvoices[0].currency || 'MVR'} {rentInvoices[0].total_amount?.toLocaleString() || '0'}
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                  {rentInvoices.length > 0 && rentInvoices[0]?.due_date ? (
                    <p className="text-xs text-gray-500 mt-1">
                      {rentInvoices[0].due_date ? new Date(rentInvoices[0].due_date).toLocaleDateString() : '-'}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">View Financials tab to load</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Open Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{openMaintenanceCount}</div>
                  <p className="text-xs text-gray-500 mt-1">Open work order(s)</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tenants Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Tenants Overview
                    </div>
                    {allTenants.length > 0 && (
                      <span className="text-sm font-normal text-gray-500">{allTenants.length} tenant(s)</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allTenants.length > 0 ? (
                    <div className="space-y-3">
                      {allTenants.slice(0, 3).map((tenant, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{tenant.name}</p>
                              <p className="text-xs text-gray-500 mt-1">Unit {tenant.unitNumber}</p>
                              <p className="text-xs text-gray-600 mt-1">{tenant.phone}</p>
                              {tenant.leaseEndDate && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Lease ends {new Date(tenant.leaseEndDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {allTenants.length > 3 && (
                        <p className="text-xs text-center text-gray-500 mt-2">
                          + {allTenants.length - 3} more tenant(s). View Tenant & Lease tab for details.
                        </p>
                      )}
                      {allTenants.length <= 3 && (
                        <Link href="#tenant" onClick={() => setActiveTab('tenant')}>
                          <p className="text-xs text-center text-blue-600 mt-2 cursor-pointer hover:underline">
                            View all tenant details →
                          </p>
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No tenants currently assigned</p>
                      <Link href="#tenant" onClick={() => setActiveTab('tenant')}>
                        <Button variant="outline" size="sm" className="mt-3">
                          View Units
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Maintenance Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Wrench className="h-5 w-5 mr-2" />
                    Recent Maintenance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMaintenance.length > 0 ? (
                    <div className="space-y-3">
                      {recentMaintenance.map((maintenance) => (
                        maintenance ? (
                          <div key={maintenance.id || `maintenance-${Math.random()}`} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{maintenance.title || '-'}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {maintenance.created_at ? new Date(maintenance.created_at).toLocaleDateString() : '-'}
                              </p>
                              {maintenance.actual_cost && (
                                <p className="text-xs font-semibold text-blue-600 mt-1">
                                  {maintenance.actual_cost.toLocaleString()} {maintenance.rentalUnit?.unit_number || ''}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              maintenance.status === 'completed' ? 'bg-green-100 text-green-800' :
                              maintenance.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {maintenance.status || 'unknown'}
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No maintenance records</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rental Units Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Rental Units Summary
                  </div>
                  <Link href="#tenant" onClick={() => setActiveTab('tenant')}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All →
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rentalUnitsLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : rentalUnits.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{occupiedCount}</p>
                        <p className="text-xs text-gray-600 mt-1">Occupied</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{vacantCount}</p>
                        <p className="text-xs text-gray-600 mt-1">Vacant</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium text-gray-600 mb-2">Recent Units:</p>
                      <div className="space-y-2">
                        {rentalUnits.slice(0, 3).map((unit) => (
                          <div key={unit.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-900">Unit {unit.unit_number}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              unit.status === 'occupied' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {unit.status}
                            </span>
                          </div>
                        ))}
                      </div>
                      {rentalUnits.length > 3 && (
                        <p className="text-xs text-gray-500 mt-2">
                          + {rentalUnits.length - 3} more unit(s)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No rental units found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Asset Count Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Asset Count Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {assetsLoading ? (
                    <span className="text-gray-400 animate-pulse">Loading...</span>
                  ) : (
                    assets.length || '-'
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {assets.length === 0 && !assetsLoading
                    ? 'View Assets tab to load asset count'
                    : 'Tracked assets across all units'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tenant & Lease Tab */}
          <TabsContent value="tenant" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tenant & Lease Information</CardTitle>
              </CardHeader>
              <CardContent>
                {occupiedUnits.length > 0 ? (
                  <div className="space-y-6">
                    {occupiedUnits.map((unit) => (
                      <div key={unit.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Unit {unit.unit_number}
                          </h3>
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            unit.status === 'occupied' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {unit.status}
                          </span>
                        </div>
                        
                        {unit.tenant ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Tenant Name</label>
                              <p className="text-gray-900">
                                {(unit.tenant.first_name || '')} {(unit.tenant.last_name || '')}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Email</label>
                              <p className="text-gray-900">{unit.tenant.email || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Phone</label>
                              <p className="text-gray-900">{unit.tenant.phone || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Move-in Date</label>
                              <p className="text-gray-900">
                                {unit.move_in_date ? new Date(unit.move_in_date).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Lease End Date</label>
                              <p className="text-gray-900">
                                {unit.lease_end_date ? new Date(unit.lease_end_date).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Security Deposit</label>
                              <p className="text-gray-900">
                                {unit.currency || 'MVR'} {unit.deposit_amount?.toLocaleString() || '0'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500">No tenant assigned</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                    <div className="text-center py-12 text-gray-600">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No tenants currently assigned</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets/Inventory Tab */}
          <TabsContent value="assets" className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search assets..."
                  value={assetSearchTerm}
                  onChange={(e) => setAssetSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => router.push(`/assets?property_id=${propertyId}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Assets/Inventory ({filteredAssets.length})
                  </CardTitle>
                  <div className="text-sm font-medium text-gray-600">
                    Total Value: {filteredAssets.length} assets
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {assetsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredAssets.length > 0 ? (
                  <ResponsiveTable
                    data={filteredAssets}
                    keyExtractor={(asset) => `${asset?.asset_id || 'unknown'}-${asset?.rental_unit_id || 'unknown'}`}
                    columns={[
                      {
                        header: 'Item Name',
                        accessor: (asset) => (
                          <div>
                            <div className="font-semibold text-gray-900">{asset?.asset?.name || '-'}</div>
                            {asset?.asset?.brand && (
                              <div className="text-sm text-gray-500">{asset.asset.brand}</div>
                            )}
                          </div>
                        ),
                        mobileLabel: 'Item',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Model/Serial',
                        accessor: (asset) => (
                          <div className="text-sm">
                            {asset?.asset?.serial_no || asset?.serial_numbers || '-'}
                          </div>
                        ),
                        mobileLabel: 'Serial',
                        mobilePriority: 'medium',
                      },
                      {
                        header: 'Purchase Date',
                        accessor: (asset) => (
                          <span className="text-sm">
                            {asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}
                          </span>
                        ),
                        mobileLabel: 'Purchase Date',
                        mobilePriority: 'low',
                      },
                      {
                        header: 'Warranty End',
                        accessor: (asset) => (
                          <span className="text-sm">
                            {asset.warranty_end_date ? new Date(asset.warranty_end_date).toLocaleDateString() : '-'}
                          </span>
                        ),
                        mobileLabel: 'Warranty',
                        mobilePriority: 'low',
                      },
                      {
                        header: 'Unit',
                        accessor: (asset) => (
                          <span className="text-sm font-medium">Unit {asset?.rental_unit?.unit_number || '-'}</span>
                        ),
                        mobileLabel: 'Unit',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Status',
                        accessor: (asset) => (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            asset.status === 'active' ? 'bg-green-100 text-green-800' :
                            asset.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {asset.status}
                          </span>
                        ),
                        mobileLabel: 'Status',
                        mobilePriority: 'high',
                      },
                    ]}
                    actions={(asset) => (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => asset?.rental_unit_id && router.push(`/rental-units/${asset.rental_unit_id}`)}
                          title="View Asset Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => asset?.asset_id && asset?.rental_unit_id && router.push(`/maintenance?asset_id=${asset.asset_id}&rental_unit_id=${asset.rental_unit_id}`)}
                          title="Log Service/Repair"
                        >
                          <Tool className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    emptyMessage="No assets found"
                  />
                ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No assets found</p>
                    <Button className="mt-4" onClick={() => router.push(`/assets?property_id=${propertyId}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Asset
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Log Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Total Maintenance Spend YTD
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-600">
                  {maintenanceCosts.length > 0 && maintenanceCosts[0]?.currency ? maintenanceCosts[0].currency : 'MVR'} {ytdMaintenanceSpend.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Year-to-date maintenance costs for {new Date().getFullYear()}
                </p>
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search maintenance..."
                  value={maintenanceSearchTerm}
                  onChange={(e) => setMaintenanceSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={maintenanceStatusFilter}
                  onChange={(e) => setMaintenanceStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-900"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wrench className="h-5 w-5 mr-2" />
                  Maintenance Log ({filteredMaintenance.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredMaintenance.length > 0 ? (
                  <ResponsiveTable
                    data={filteredMaintenance}
                    keyExtractor={(req) => req?.id?.toString() || `maintenance-${Math.random()}`}
                    columns={[
                      {
                        header: 'Date',
                        accessor: (req) => (
                          <span className="text-sm">
                            {req?.request_date ? new Date(req.request_date).toLocaleDateString() : '-'}
                          </span>
                        ),
                        mobileLabel: 'Date',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Description',
                        accessor: (req) => (
                          <div>
                            <div className="font-medium text-gray-900">{req?.title || '-'}</div>
                            {req?.description && (
                              <div className="text-sm text-gray-500 line-clamp-1">{req.description}</div>
                            )}
                          </div>
                        ),
                        mobileLabel: 'Description',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Status',
                        accessor: (req) => {
                          const statusConfig = {
                            completed: { bg: 'bg-green-100', text: 'text-green-800', darkBg: '', darkText: '', icon: CheckCircle2 },
                            in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', darkBg: '', darkText: '', icon: Clock },
                            open: { bg: 'bg-red-100', text: 'text-red-800', darkBg: '', darkText: '', icon: AlertCircle },
                          };
                          const config = statusConfig[(req?.status || 'open') as keyof typeof statusConfig] || statusConfig.open;
                          const Icon = config.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
                              <Icon className="h-3 w-3" />
                              {req?.status || 'unknown'}
                            </span>
                          );
                        },
                        mobileLabel: 'Status',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Total Cost',
                        accessor: (req) => (
                          <div className="font-semibold text-gray-900">
                            {req?.actual_cost ? (
                              <>
                                {req.actual_cost.toLocaleString()}
                                {req?.rentalUnit?.unit_number && (
                                  <span className="text-xs text-gray-500 ml-1">
                                    (Unit {req.rentalUnit.unit_number})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        ),
                        mobileLabel: 'Cost',
                        mobilePriority: 'high',
                      },
                      {
                        header: 'Contractor/Vendor',
                        accessor: (req) => (
                          <span className="text-sm">{req?.assigned_to || '-'}</span>
                        ),
                        mobileLabel: 'Vendor',
                        mobilePriority: 'medium',
                      },
                    ]}
                    actions={(req) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => req?.id && router.push(`/maintenance/${req.id}`)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    emptyMessage="No maintenance records found"
                  />
                ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Wrench className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No maintenance records found</p>
                    <Button className="mt-4" onClick={() => router.push(`/maintenance?property_id=${propertyId}`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Order
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {rentInvoices.length > 0 && rentInvoices[0]?.currency ? rentInvoices[0].currency : 'MVR'} {(rentInvoices || [])
                      .filter(inv => inv && inv.status === 'paid')
                      .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0)
                      .toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">From paid invoices</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {maintenanceCosts.length > 0 && maintenanceCosts[0]?.currency ? maintenanceCosts[0].currency : 'MVR'} {ytdMaintenanceSpend.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Maintenance costs YTD</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {rentInvoices.length > 0 && rentInvoices[0]?.currency ? rentInvoices[0].currency : 'MVR'} {
                      Math.max(0, (rentInvoices || [])
                        .filter(inv => inv && inv.status === 'paid')
                        .reduce((sum, inv) => sum + (inv?.total_amount || 0), 0) - ytdMaintenanceSpend)
                        .toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Income - Expenses</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {rentInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {rentInvoices.slice(0, 10).map((invoice) => (
                      invoice ? (
                        <div key={invoice.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{invoice.invoice_number || '-'}</p>
                            <p className="text-sm text-gray-500">
                              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : '-'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {invoice.currency || 'MVR'} {invoice.total_amount?.toLocaleString() || '0'}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {invoice.status || 'unknown'}
                            </span>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                      <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No payment history</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Property Documents</CardTitle>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                    <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No documents uploaded</p>
                  <p className="text-sm text-gray-600 mt-2">Upload lease agreements, maintenance records, and other property documents</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}

