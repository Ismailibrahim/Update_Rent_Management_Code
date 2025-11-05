'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Building2, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { rentalUnitsAPI, propertiesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
          <div className="flex gap-2">
            <Link href="/rental-units/bulk-new" prefetch={true}>
              <Button variant="outline" className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium">
                <Plus className="h-4 w-4" />
                Bulk Create
              </Button>
            </Link>
            <Link href="/rental-units/new" prefetch={true}>
              <Button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                <Plus className="h-4 w-4" />
                Add Rental Unit
              </Button>
            </Link>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Units</CardTitle>
              <Building2 className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalUnits}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Available</CardTitle>
              <div className="h-3 w-3 bg-green-500 rounded-full shadow-sm"></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{availableUnits}</div>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Occupied</CardTitle>
              <div className="h-3 w-3 bg-red-500 rounded-full shadow-sm"></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{occupiedUnits}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              placeholder="Search rental units by unit number, property name, or tenant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg shadow-sm transition-all duration-200"
            />
          </div>
          <select
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500 shadow-sm transition-all duration-200"
          >
            <option value="all">All Properties</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id.toString()}>
                {property.name}{property.street && property.street.trim() ? ` - ${property.street.trim()}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden md:block">
          <Card className="w-full bg-white shadow-md border border-gray-200">
            <CardContent className="p-0">
              <div className="w-full overflow-x-auto">
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
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Unit Details
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Floor
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Rooms/Toilets
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Rent Amount
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-2 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Assets
                      </th>
                      <th className="px-2 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredRentalUnits.map((unit) => (
                      <tr key={unit.id} className="hover:bg-blue-50/50 transition-colors duration-150 border-b border-gray-100">
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
                        <td className="px-2 py-2 text-sm font-medium align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link 
                              href={`/rental-units/${unit.id}/edit`}
                              prefetch={true}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                              className={`h-9 px-3 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                                unit.is_active 
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700' 
                                  : 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700'
                              }`}
                              title={unit.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {unit.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteRentalUnit(unit.id)}
                              className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
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
        </div>

        {/* Mobile Card View - Hidden on desktop */}
        <div className="md:hidden space-y-4">
          {filteredRentalUnits.map((unit) => (
            <Card key={unit.id} className="bg-white shadow-md border border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: Unit Number and Status */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Unit {unit.unit_number}
                        </h3>
                        {unit.unit_type && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {formatUnitType(unit.unit_type)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{unit.property?.name || 'Unknown Property'}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Floor</p>
                      <p className="text-sm font-medium text-gray-900">{unit.floor_number}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rooms/Toilets</p>
                      <p className="text-sm font-medium text-gray-900">{unit.number_of_rooms}/{unit.number_of_toilets}</p>
                    </div>
                    {typeof unit.square_feet === 'number' && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Square Feet</p>
                        <p className="text-sm font-medium text-gray-900">{unit.square_feet}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rent Amount</p>
                      <p className="text-sm font-medium text-gray-900">
                        {unit.currency} {Math.round(Number(unit.rent_amount || 0)).toLocaleString('en-US')}
                      </p>
                    </div>
                  </div>

                  {/* Tenant Info */}
                  {unit.status === 'occupied' && unit.tenant && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tenant</p>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900">
                          {unit.tenant.full_name || `${unit.tenant.first_name} ${unit.tenant.last_name}`}
                        </p>
                        {unit.tenant.phone && (
                          <p className="text-xs text-gray-600">{unit.tenant.phone}</p>
                        )}
                        {unit.tenant.email && (
                          <p className="text-xs text-gray-600 truncate">{unit.tenant.email}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Assets */}
                  {unit.assets && unit.assets.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Assets</p>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.assets.slice(0, 4).map((asset) => {
                          const isMaintenance = asset.pivot?.status === 'maintenance';
                          const isActiveAssignment = asset.pivot?.is_active !== false;
                          const qty = asset.pivot?.quantity ?? undefined;
                          return (
                            <span
                              key={asset.id}
                              className={`inline-flex px-2 py-1 text-xs rounded-full border ${
                                isMaintenance
                                  ? 'bg-orange-50 text-orange-800 border-orange-200'
                                  : isActiveAssignment
                                  ? 'bg-green-50 text-green-800 border-green-200'
                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              {asset.name}
                              {typeof qty === 'number' && (
                                <span className="ml-1 opacity-80">({qty})</span>
                              )}
                              {isMaintenance && <span className="ml-1">🔧</span>}
                            </span>
                          );
                        })}
                        {unit.assets.length > 4 && (
                          <span className="inline-flex px-2 py-1 text-xs text-gray-600">
                            +{unit.assets.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
                    <Link 
                      href={`/rental-units/${unit.id}/edit`}
                      prefetch={true}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm"
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleToggleStatus(unit.id, unit.is_active)}
                      className={`h-9 px-3 rounded-lg text-xs font-medium transition-all duration-200 shadow-sm ${
                        unit.is_active 
                          ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700' 
                          : 'bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700'
                      }`}
                      title={unit.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {unit.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteRentalUnit(unit.id)}
                      className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && filteredRentalUnits.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No rental units found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedProperty !== 'all' ? 'Try adjusting your search terms or filters.' : 'Get started by adding your first rental unit using the button above.'}
            </p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}