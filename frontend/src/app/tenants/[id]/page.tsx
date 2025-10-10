'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { ArrowLeft, Edit, Building, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { tenantsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';

interface RentalUnit {
  id: number;
  unit_number: string;
  floor_number: number;
  rent_amount: number | string;
  currency: string;
  property: {
    id: number;
    name: string;
    type: string;
    street: string;
    city: string;
    island: string;
  };
  status: string;
  move_in_date?: string;
  lease_end_date?: string;
}

interface Tenant {
  id: number;
  tenant_type?: 'individual' | 'company';
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
  status: string;
  notes?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  company_name?: string;
  company_address?: string;
  company_registration_number?: string;
  company_gst_tin?: string;
  company_telephone?: string;
  company_email?: string;
  documents?: string[] | string;
  rental_units?: RentalUnit[];
  created_at: string;
  updated_at: string;
  full_name?: string;
}

export default function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedParams = use(params);

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      const response = await tenantsAPI.getById(parseInt(resolvedParams.id));
      console.log('Tenant API Response:', response.data.tenant);
      console.log('Contact fields:', {
        email: response.data.tenant.email,
        phone: response.data.tenant.phone,
        address: response.data.tenant.address,
        company_email: response.data.tenant.company_email,
        company_telephone: response.data.tenant.company_telephone,
        tenant_type: response.data.tenant.tenant_type
      });
      console.log('Documents field:', {
        documents: response.data.tenant.documents,
        type: typeof response.data.tenant.documents,
        isArray: Array.isArray(response.data.tenant.documents)
      });
      setTenant(response.data.tenant);
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Failed to fetch tenant details');
      router.push('/tenants');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, router]);

  useEffect(() => {
    fetchTenant();
  }, [resolvedParams.id, fetchTenant]);

  const formatCurrency = (amount: number | string | undefined | null, currency: string = 'MVR') => {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return currency === 'MVR' ? 'MVR 0' : '$0';
    }
    
    const safeCurrency = currency || 'MVR';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (safeCurrency === 'MVR') {
      const formattedAmount = Math.round(numAmount).toLocaleString('en-US');
      return `MVR ${formattedAmount}`;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const calculateTotalRent = (rentalUnits: RentalUnit[] = []) => {
    return rentalUnits.reduce((total, unit) => {
      const rentAmount = typeof unit.rent_amount === 'string' 
        ? parseFloat(unit.rent_amount) 
        : unit.rent_amount;
      
      if (rentAmount === undefined || rentAmount === null || isNaN(rentAmount)) {
        return total;
      }
      return total + rentAmount;
    }, 0);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading tenant details...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!tenant) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Tenant not found</div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/tenants')} className="flex items-center">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {tenant.tenant_type === 'company' ? tenant.company_name : `${tenant.first_name} ${tenant.last_name}`}
                </h1>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  tenant.tenant_type === 'company' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {tenant.tenant_type === 'company' ? 'Company' : 'Individual'}
                </span>
              </div>
              <p className="mt-2 text-gray-600">
                {tenant.tenant_type === 'company' ? 'Company Tenant Details' : 'Individual Tenant Details'}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => router.push(`/tenants/${tenant.id}/edit`)}
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Tenant
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal/Company Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Information - Show for company tenants */}
            {tenant.tenant_type === 'company' && (
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>Company details and registration information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <p className="text-sm text-gray-900">{tenant.company_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                      <p className="text-sm text-gray-900">{tenant.company_registration_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                    <p className="text-sm text-gray-900">{tenant.company_address || 'N/A'}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST TIN</label>
                      <p className="text-sm text-gray-900">{tenant.company_gst_tin || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Telephone</label>
                      <p className="text-sm text-gray-900">{tenant.company_telephone || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                    <p className="text-sm text-gray-900">{tenant.company_email || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Personal Information - Show for all tenants */}
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  {tenant.tenant_type === 'company' 
                    ? 'Contact person details' 
                    : 'Basic personal details of the tenant'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <p className="text-sm text-gray-900">{tenant.first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <p className="text-sm text-gray-900">{tenant.last_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-sm text-gray-900">{formatDate(tenant.date_of_birth)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-sm text-gray-900">{tenant.gender || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <p className="text-sm text-gray-900">{tenant.nationality || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID Number</label>
                  <p className="text-sm text-gray-900">{tenant.national_id || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  {tenant.tenant_type === 'company' ? 'Personal and company contact details' : 'How to reach the tenant'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant.tenant_type === 'company' ? (
                  <>
                    {/* Personal Contact */}
                    <div className="border-b pb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Personal Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Personal Email</label>
                            <p className="text-sm text-gray-900">{tenant.email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Personal Phone</label>
                            <p className="text-sm text-gray-900">{tenant.phone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      {tenant.address && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Personal Address</label>
                          <p className="text-sm text-gray-900">{tenant.address}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Company Contact */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Company Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Company Email</label>
                            <p className="text-sm text-gray-900">{tenant.company_email || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Company Phone</label>
                            <p className="text-sm text-gray-900">{tenant.company_telephone || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <p className="text-sm text-gray-900">{tenant.email || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone</label>
                          <p className="text-sm text-gray-900">{tenant.phone || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    {tenant.address && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <p className="text-sm text-gray-900">{tenant.address}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact - Show for all tenants when available */}
            {(tenant.emergency_contact_name || tenant.emergency_contact_phone) && (
              <Card>
                <CardHeader>
                  <CardTitle>Emergency Contact</CardTitle>
                  <CardDescription>Emergency contact information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <p className="text-sm text-gray-900">{tenant.emergency_contact_name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900">{tenant.emergency_contact_phone || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    <p className="text-sm text-gray-900">{tenant.emergency_contact_relationship || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documents */}
            {(() => {
              // Parse documents from JSON string or array
              let documents = [];
              if (tenant.documents) {
                if (typeof tenant.documents === 'string') {
                  try {
                    documents = JSON.parse(tenant.documents);
                  } catch (e) {
                    console.error('Error parsing documents:', e);
                    documents = [];
                  }
                } else if (Array.isArray(tenant.documents)) {
                  documents = tenant.documents;
                }
              }
              
              return documents.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Documents & Agreements</CardTitle>
                    <CardDescription>Attached documents and agreements</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.map((document: unknown, index: number) => {
                        // Parse document if it's a JSON string
                        let docData;
                        try {
                          docData = typeof document === 'string' ? JSON.parse(document) : document;
                        } catch {
                          docData = { name: document, path: document };
                        }
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{docData.name || 'Document'}</p>
                                <p className="text-xs text-gray-500">
                                  {docData.size ? `${Math.round(docData.size / 1024)} KB` : 'Unknown size'}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(`http://localhost:8000/storage/${docData.path}`, '_blank')}
                            >
                              View
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Notes */}
            {tenant.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-900">{tenant.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  tenant.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : tenant.status === 'inactive'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tenant.status.charAt(0).toUpperCase() + tenant.status.slice(1)}
                </span>
              </CardContent>
            </Card>

            {/* Lease Information */}
            <Card>
              <CardHeader>
                <CardTitle>Lease Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <p className="text-sm text-gray-900">{formatDate(tenant.lease_start_date)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <p className="text-sm text-gray-900">{formatDate(tenant.lease_end_date)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rental Units */}
            <Card>
              <CardHeader>
                <CardTitle>Rental Units</CardTitle>
                <CardDescription>{tenant.rental_units?.length || 0} unit(s) assigned</CardDescription>
              </CardHeader>
              <CardContent>
                {tenant.rental_units && tenant.rental_units.length > 0 ? (
                  <div className="space-y-3">
                    {tenant.rental_units.map((unit) => (
                      <div key={unit.id} className="border rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {unit.property?.name || 'Unknown Property'} - Unit {unit.unit_number}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Floor: {unit.floor_number}</div>
                          <div>Rent: {formatCurrency(unit.rent_amount, unit.currency)}</div>
                          <div>Status: {unit.status}</div>
                          {unit.move_in_date && (
                            <div>Move-in: {formatDate(unit.move_in_date)}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Total Monthly Rent:</span>
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(calculateTotalRent(tenant.rental_units), tenant.rental_units?.[0]?.currency || 'MVR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No rental units assigned</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
