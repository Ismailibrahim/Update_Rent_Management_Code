'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Building2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';

interface RentalUnit {
  id: number;
  property_id: number;
  unit_number: string;
  unit_type?: string;
  floor_number: number;
  // New separate columns
  rent_amount: number;
  deposit_amount?: number;
  currency: string;
  number_of_rooms: number;
  number_of_toilets: number;
  square_feet?: number;
  status: string;
  tenant_id?: number;
  move_in_date?: string;
  lease_end_date?: string;
  amenities?: Record<string, unknown>[];
  photos?: Record<string, unknown>[];
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  property?: {
    id: number;
    name: string;
    type: string;
    street: string;
    city: string;
    island: string;
  };
  tenant?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    full_name?: string;
  };
  assets?: Array<{
    id: number;
    name: string;
    brand?: string;
    category: string;
    status: string;
    pivot?: {
      assigned_date: string;
      notes?: string;
      is_active: boolean;
      status?: string;
      quantity?: number;
      maintenance_notes?: string;
    };
  }>;
}

interface Property {
  id: number;
  name: string;
  street: string;
  city: string;
  island: string;
}

export default function RentalUnitsPage() {
  const router = useRouter();
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  useEffect(() => {
    fetchRentalUnits();
    fetchProperties();
  }, []);

  // Refresh data when returning to this page
  useEffect(() => {
    const handleFocus = () => {
      fetchRentalUnits();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchRentalUnits = async () => {
    try {
      setLoading(true);
      const response = await rentalUnitsAPI.getAll();
      const units = response.data.rentalUnits || [];
      setRentalUnits(units);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      toast.error('Failed to fetch rental units');
    } finally {
      setLoading(false);
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

  const filteredRentalUnits = rentalUnits.filter(unit => {
    const matchesSearch = 
      unit.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (unit.tenant?.full_name || `${unit.tenant?.first_name} ${unit.tenant?.last_name}`).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProperty = selectedProperty === 'all' || unit.property_id.toString() === selectedProperty;
    
    return matchesSearch && matchesProperty;
  });

  const formatUnitType = (t?: string) => {
    if (!t) return 'Not set';
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  const handleDeleteRentalUnit = async (id: number) => {
    if (!confirm('Are you sure you want to delete this rental unit?')) return;
    
    try {
      await rentalUnitsAPI.delete(id);
      toast.success('Rental unit deleted successfully');
      fetchRentalUnits();
    } catch (error) {
      console.error('Error deleting rental unit:', error);
      toast.error('Failed to delete rental unit');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await rentalUnitsAPI.update(id, { is_active: !currentStatus });
      toast.success(`Rental unit ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchRentalUnits();
    } catch (error) {
      console.error('Error updating rental unit status:', error);
      toast.error('Failed to update rental unit status');
    }
  };


  // Calculate statistics
  const totalUnits = rentalUnits.length;
  const availableUnits = rentalUnits.filter(u => u.status === 'available').length;
  const occupiedUnits = rentalUnits.filter(u => u.status === 'occupied').length;

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
      <div className="w-full space-y-8 -mx-6 px-6">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rental Units</h1>
            <p className="mt-2 text-gray-600">
              Manage rental units and their details
            </p>
          </div>
          <Button className="flex items-center" onClick={() => router.push('/rental-units/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rental Unit
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Units</CardTitle>
              <Building2 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalUnits}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{availableUnits}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Occupied</CardTitle>
              <div className="h-2 w-2 bg-red-500 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{occupiedUnits}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search rental units..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id.toString()}>
                {property.name}{property.street && property.street.trim() ? ` - ${property.street.trim()}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Rental Units Table */}
        <Card className="w-full">
          <CardContent className="p-0">
            <div className="w-full">
              <table className="w-full table-auto">
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[18%]" />
                  <col className="w-[6%]" />
                  <col className="w-[8%]" />
                  <col className="w-[10%]" />
                  <col className="w-[8%]" />
                  <col className="w-[12%]" />
                  <col className="w-[12%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Details
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Floor
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rooms/Toilets
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rent Amount
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assets
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRentalUnits.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-2 py-2 align-top">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          Unit {unit.unit_number}
                        </div>
                        {unit.unit_type && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {formatUnitType(unit.unit_type)}
                            </span>
                          </div>
                        )}
                        {typeof unit.square_feet === 'number' && (
                          <div className="mt-1 text-xs text-gray-600 truncate">
                            Sq Ft: {unit.square_feet}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="text-sm text-gray-900 break-words">
                          {unit.property?.name || 'Unknown Property'}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top text-center">
                        <div className="text-sm text-gray-900">
                          {unit.floor_number}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top text-center">
                        <div className="text-sm text-gray-900">
                          {unit.number_of_rooms}/{unit.number_of_toilets}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {unit.currency} {Math.round(Number(unit.rent_amount || 0)).toLocaleString('en-US')}
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${
                          unit.status === 'available' 
                            ? 'bg-green-100 text-green-800' 
                            : unit.status === 'occupied'
                            ? 'bg-red-100 text-red-800'
                            : unit.status === 'deactivated'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {unit.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="text-sm text-gray-900">
                          {unit.status === 'occupied' && unit.tenant 
                            ? (
                              <div>
                                <div className="font-medium truncate" title={unit.tenant.full_name || `${unit.tenant.first_name} ${unit.tenant.last_name}`}>
                                  {unit.tenant.full_name || `${unit.tenant.first_name} ${unit.tenant.last_name}`}
                                </div>
                                {unit.tenant.phone && (
                                  <div className="text-xs text-gray-500 truncate">{unit.tenant.phone}</div>
                                )}
                                {unit.tenant.email && (
                                  <div className="text-xs text-gray-500 truncate">{unit.tenant.email}</div>
                                )}
                              </div>
                            )
                            : unit.status === 'deactivated'
                            ? 'Deactivated'
                            : 'Available'
                          }
                        </div>
                      </td>
                      <td className="px-2 py-2 align-top">
                        <div className="text-sm text-gray-900">
                          {unit.assets && unit.assets.length > 0 ? (
                            <div className="space-y-1">
                              {unit.assets.slice(0, 2).map((asset) => {
                                const isMaintenance = asset.pivot?.status === 'maintenance';
                                const isActiveAssignment = asset.pivot?.is_active !== false;
                                const qty = asset.pivot?.quantity ?? undefined;
                                return (
                                  <div key={asset.id} className="flex items-center space-x-1">
                                    <span className={`inline-flex px-1 py-0.5 text-xs rounded-full border truncate ${
                                      isMaintenance
                                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                                        : isActiveAssignment
                                        ? 'bg-green-50 text-green-800 border-green-200'
                                        : 'bg-gray-50 text-gray-700 border-gray-200'
                                    }`}>
                                      {asset.name}
                                      {typeof qty === 'number' && (
                                        <span className="ml-1 opacity-80">({qty})</span>
                                      )}
                                      {isMaintenance && <span className="ml-1 font-medium">🔧</span>}
                                    </span>
                                  </div>
                                );
                              })}
                              {unit.assets.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{unit.assets.length - 2} more
                                  {unit.assets.filter(a => a.pivot?.status === 'maintenance').length > 0 && (
                                    <span className="ml-1 text-orange-600">
                                      ({unit.assets.filter(a => a.pivot?.status === 'maintenance').length} 🔧)
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No assets</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-sm font-medium align-top">
                        <div className="flex flex-row gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              router.push(`/rental-units/${unit.id}/edit`);
                              // Refresh data after navigation
                              setTimeout(() => fetchRentalUnits(), 1000);
                            }}
                            className="h-7 px-2"
                            title="Edit"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                            className={`h-7 px-2 text-xs ${unit.is_active ? 'text-orange-600 hover:text-orange-700' : 'text-green-600 hover:text-green-700'}`}
                            title={unit.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {unit.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteRentalUnit(unit.id)}
                            className="h-7 px-2 text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {!loading && filteredRentalUnits.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rental units found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedProperty !== 'all' ? 'Try adjusting your search terms or filters.' : 'Get started by adding your first rental unit.'}
            </p>
            <div className="mt-6">
              <Button onClick={() => router.push('/rental-units/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rental Unit
              </Button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}