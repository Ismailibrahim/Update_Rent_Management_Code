'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Users, Plus, Search, Edit, Trash2, Eye, Phone, Mail, Home, Building } from 'lucide-react';
import { tenantsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';

interface RentalUnit {
  id: number;
  unit_number: string;
  floor_number: number;
  // New separate columns
  rent_amount: number | string;
  currency: string;
  property: {
    id: number;
    name: string;
  };
  status: string;
}

interface Tenant {
  id: number;
  // Tenant type
  tenant_type?: 'individual' | 'company';
  // New separate columns
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  national_id?: string;
  nationality?: string;
  gender?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employment_company?: string;
  employment_position?: string;
  employment_salary?: number;
  employment_phone?: string;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  rental_units?: RentalUnit[];
  status: string;
  notes?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  // Company-specific fields
  company_name?: string;
  company_address?: string;
  company_registration_number?: string;
  company_gst_tin?: string;
  company_telephone?: string;
  company_email?: string;
  documents?: string[] | string;
  created_at: string;
  updated_at: string;
  // Computed properties
  full_name?: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      
      // Log API configuration for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        console.log('Fetching tenants from:', `${apiUrl}/tenants`);
      }
      
      const response = await tenantsAPI.getAll();
      setTenants(response.data.tenants || []);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      
      // Provide more detailed error information
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        console.error('Network Error Details:', {
          code: error.code,
          message: error.message,
          config: error.config,
          apiUrl: apiUrl,
        });
        toast.error(`Network Error: Unable to reach backend API. Please check if the server is running at ${apiUrl}`);
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const message = error.response.data?.message || `Server error (${status})`;
        toast.error(`Failed to fetch tenants: ${message}`);
      } else {
        toast.error('Failed to fetch tenants. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name || ''} ${tenant.last_name || ''}`.toLowerCase();
    const companyName = tenant.company_name?.toLowerCase() || '';
    const email = (tenant.email || '').toLowerCase();
    const phone = tenant.phone || '';
    const idNumber = tenant.national_id || '';
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) ||
           companyName.includes(searchLower) ||
           email.includes(searchLower) ||
           phone.includes(searchTerm) ||
           idNumber.includes(searchTerm);
  });

  const handleDeleteTenant = async (id: number) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    
    try {
      await tenantsAPI.delete(id);
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };

  const handleAddTenant = () => {
    router.push('/tenants/new');
  };

  const calculateTotalRent = (rentalUnits: RentalUnit[] = []) => {
    return rentalUnits.reduce((total, unit) => {
      const rentAmount = typeof unit.rent_amount === 'string' 
        ? parseFloat(unit.rent_amount) 
        : unit.rent_amount;
      
      // Handle undefined, null, or NaN values
      if (rentAmount === undefined || rentAmount === null || isNaN(rentAmount)) {
        return total;
      }
      return total + rentAmount;
    }, 0);
  };

  const formatCurrency = (amount: number | undefined | null, currency: string = 'MVR') => {
    // Handle undefined, null, or NaN values
    if (amount === undefined || amount === null || isNaN(amount)) {
      return currency === 'MVR' ? 'MVR 0' : '$0';
    }
    
    // Ensure currency is defined and default to MVR
    const safeCurrency = currency || 'MVR';
    
    // Handle MVR specifically without using Intl.NumberFormat
    if (safeCurrency === 'MVR') {
      const formattedAmount = Math.round(amount).toLocaleString('en-US');
      return `MVR ${formattedAmount}`;
    }
    
    // For other currencies, use proper Intl.NumberFormat
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tenants</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Manage your tenants and lease information
            </p>
          </div>
          <Button onClick={handleAddTenant} className="flex items-center w-full sm:w-auto gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">{tenants.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Home className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Active Rentals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {tenants.reduce((total, tenant) => total + (tenant.rental_units?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(tenants.reduce((total, tenant) => total + calculateTotalRent(tenant.rental_units), 0), 'MVR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tenants Table - Responsive: Table on desktop, Cards on mobile */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <ResponsiveTable
            data={filteredTenants}
            keyExtractor={(tenant) => tenant.id}
            columns={[
              {
                header: 'Tenant',
                accessor: (tenant) => (
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {tenant.tenant_type === 'company' ? tenant.company_name : `${tenant.first_name} ${tenant.last_name}`}
                    </div>
                    {tenant.tenant_type !== 'company' && (
                      <div className="text-sm text-gray-500">
                        ID: {tenant.national_id || 'N/A'}
                      </div>
                    )}
                  </div>
                ),
                mobileLabel: 'Tenant',
                mobilePriority: 'high',
              },
              {
                header: 'Type',
                accessor: (tenant) => (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.tenant_type === 'company' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {tenant.tenant_type === 'company' ? 'Company' : 'Individual'}
                  </span>
                ),
                mobileLabel: 'Type',
                mobilePriority: 'high',
                className: 'w-32',
              },
              {
                header: 'Contact',
                accessor: (tenant) => (
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {tenant.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {tenant.phone}
                    </div>
                  </div>
                ),
                mobileLabel: 'Contact',
                mobilePriority: 'high',
              },
              {
                header: 'Rental Units',
                accessor: (tenant) => (
                  tenant.rental_units && tenant.rental_units.length > 0 ? (
                    <div className="space-y-1">
                      {tenant.rental_units.map((unit) => (
                        <div key={unit.id} className="flex items-center text-sm">
                          <Building className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-gray-600">
                            {unit.property.name} - Unit {unit.unit_number}
                          </span>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 mt-1">
                        {tenant.rental_units.length} unit{tenant.rental_units.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No units</span>
                  )
                ),
                mobileLabel: 'Rental Units',
                mobilePriority: 'high',
              },
              {
                header: 'Total Rent',
                accessor: (tenant) => (
                  tenant.rental_units && tenant.rental_units.length > 0 ? (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(calculateTotalRent(tenant.rental_units), tenant.rental_units[0]?.currency)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )
                ),
                mobileLabel: 'Total Rent',
                mobilePriority: 'high',
              },
              {
                header: 'Lease Period',
                accessor: (tenant) => (
                  tenant.lease_start_date || tenant.lease_end_date ? (
                    <div className="text-sm text-gray-600">
                      {tenant.lease_start_date && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-1">From:</span>
                          <span>{new Date(tenant.lease_start_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {tenant.lease_end_date && (
                        <div className="flex items-center">
                          <span className="text-xs text-gray-500 mr-1">To:</span>
                          <span>{new Date(tenant.lease_end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">Not set</span>
                  )
                ),
                mobileLabel: 'Lease Period',
                mobilePriority: 'medium',
              },
              {
                header: 'Status',
                accessor: (tenant) => (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    tenant.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : tenant.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tenant.status}
                  </span>
                ),
                mobileLabel: 'Status',
                mobilePriority: 'high',
                className: 'w-24',
              },
            ]}
            actions={(tenant) => (
              <>
                <Link 
                  href={`/tenants/${tenant.id}`}
                  prefetch={true}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="View Details"
                >
                  <Eye className="h-4 w-4" />
                </Link>
                <Link 
                  href={`/tenants/${tenant.id}/edit`}
                  prefetch={true}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Edit Tenant"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleDeleteTenant(tenant.id)}
                  className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Delete Tenant"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first tenant.'}
            emptyIcon={<Users className="mx-auto h-12 w-12 text-gray-400" />}
          />
        )}
      </div>
    </SidebarLayout>
  );
}
