'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/UI/Card';
import { Button } from '../../../../components/UI/Button';
import { Input } from '../../../../components/UI/Input';
import { Textarea } from '../../../../components/UI/Textarea';
import { Select } from '../../../../components/UI/Select';
import { ArrowLeft, Save, X, Home, Upload, Bell, Mail, MessageSquare } from 'lucide-react';
import { tenantsAPI, rentalUnitsAPI, tenantNotificationPreferencesAPI, TenantNotificationPreference } from '../../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../../components/UI/FileUpload';
import { useAuth } from '../../../../contexts/AuthContext';

interface RentalUnit {
  id: number;
  unit_number: string;
  floor_number: number;
  property: {
    id: number;
    name: string;
  };
  number_of_rooms?: number;
  number_of_toilets?: number;
  square_feet?: number;
  rent_amount?: number;
  currency?: string;
  status: string;
}

export default function EditTenantPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const resolvedParams = use(params);
  const tenantId = resolvedParams.id;
  
  const [loading, setLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<RentalUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocuments, setExistingDocuments] = useState<Array<{
    name: string;
    path: string;
    size: number;
    type: string;
    uploaded_at: string;
  }>>([]);
  const [notificationPreferences, setNotificationPreferences] = useState<TenantNotificationPreference>({
    tenant_id: parseInt(tenantId),
    email_enabled: true,
    sms_enabled: true,
  });
  const [formData, setFormData] = useState({
    // Tenant type selection
    tenant_type: 'individual' as 'individual' | 'company',
    // New separate columns
    first_name: '',
    last_name: '',
    date_of_birth: '',
    national_id: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    employment_company: '',
    employment_position: '',
    employment_salary: '',
    employment_phone: '',
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    status: 'active',
    notes: '',
    lease_start_date: '',
    lease_end_date: '',
    rental_unit_ids: [] as string[],
    // Company-specific fields
    company_name: '',
    company_address: '',
    company_registration_number: '',
    company_gst_tin: '',
    company_telephone: '',
    company_email: '',
    // Additional fields
    nationality: ''
  });

  const fetchAvailableUnits = useCallback(async (assignedUnitIds: number[] = []) => {
    try {
      setUnitsLoading(true);
      const response = await rentalUnitsAPI.getAll();
      const allUnits = response.data.rentalUnits || [];
      
      // Filter out units that are already assigned to this tenant
      const availableUnits = allUnits.filter((unit: { id: number; status: string }) => 
        !assignedUnitIds.includes(unit.id) || 
        unit.status === 'occupied' // Include occupied units so they can be re-assigned
      );
      
      setAvailableUnits(availableUnits);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      toast.error('Failed to fetch rental units');
    } finally {
      setUnitsLoading(false);
    }
  }, []);

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching tenant with ID:', tenantId);
      console.log('Token exists:', !!localStorage.getItem('token'));
      const response = await tenantsAPI.getById(parseInt(tenantId));
      console.log('API Response received:', response);
      const tenant = response.data.tenant;
      
      // Helper function to format date for HTML date input
      const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        try {
          return new Date(dateString).toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const formDataToSet = {
        // Tenant type
        tenant_type: tenant.tenant_type || 'individual',
        // New separate columns
        first_name: tenant.first_name || '',
        last_name: tenant.last_name || '',
        date_of_birth: formatDateForInput(tenant.date_of_birth),
        national_id: tenant.national_id || '',
        nationality: tenant.nationality || '',
        gender: tenant.gender || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        address: tenant.address || '',
        city: tenant.city || '',
        postal_code: tenant.postal_code || '',
        emergency_contact_name: tenant.emergency_contact_name || '',
        emergency_contact_phone: tenant.emergency_contact_phone || '',
        emergency_contact_relationship: tenant.emergency_contact_relationship || '',
        employment_company: tenant.employment_company || '',
        employment_position: tenant.employment_position || '',
        employment_salary: tenant.employment_salary?.toString() || '',
        employment_phone: tenant.employment_phone || '',
        bank_name: tenant.bank_name || '',
        account_number: tenant.account_number || '',
        account_holder_name: tenant.account_holder_name || '',
        status: tenant.status || 'active',
        notes: tenant.notes || '',
        lease_start_date: formatDateForInput(tenant.lease_start_date),
        lease_end_date: formatDateForInput(tenant.lease_end_date),
        rental_unit_ids: tenant.rental_units ? tenant.rental_units.map((unit: { id: number }) => unit.id.toString()) : [],
        // Company-specific fields
        company_name: tenant.company_name || '',
        company_address: tenant.company_address || '',
        company_registration_number: tenant.company_registration_number || '',
        company_gst_tin: tenant.company_gst_tin || '',
        company_telephone: tenant.company_telephone || '',
        company_email: tenant.company_email || ''
      };
      
      console.log('Form data to set:', formDataToSet);
      console.log('Current form data before setting:', formData);
      setFormData(formDataToSet);
      console.log('Form data set completed');

      // Set existing documents - handle both string and array formats
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
      setExistingDocuments(documents);

      // Fetch notification preferences
      try {
        const prefResponse = await tenantNotificationPreferencesAPI.get(parseInt(tenantId));
        if (prefResponse.data?.success && prefResponse.data.data) {
          setNotificationPreferences(prefResponse.data.data);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        // If preferences don't exist, they'll be created with defaults
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTenant();
  }, [tenantId, fetchTenant]);

  useEffect(() => {
    // Fetch available units after tenant data is loaded
    if (formData.rental_unit_ids.length >= 0) {
      const assignedUnitIds = formData.rental_unit_ids.map(id => parseInt(id));
      fetchAvailableUnits(assignedUnitIds);
    }
  }, [formData.rental_unit_ids, fetchAvailableUnits]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission started');
    console.log('Form data:', formData);
    console.log('Files:', files);

        // Validate required fields based on tenant type
        if (formData.tenant_type === 'individual') {
          if (!formData.first_name || !formData.last_name) {
            toast.error('Please fill in first name and last name for individual tenant');
            return;
          }
        } else if (formData.tenant_type === 'company') {
          if (!formData.company_name || !formData.company_address || !formData.company_registration_number) {
            toast.error('Please fill in required fields for company tenant');
            return;
          }
          // For company tenants, personal information is optional
          // No additional validation needed - personal info can be partial or empty
        }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        lease_start_date: formData.lease_start_date || undefined,
        lease_end_date: formData.lease_end_date || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        employment_salary: formData.employment_salary ? parseFloat(formData.employment_salary) : undefined,
        rental_unit_ids: Array.isArray(formData.rental_unit_ids) ? formData.rental_unit_ids.map(id => parseInt(id)) : []
      };

           // For company tenants, only map company fields if they are being updated
           // Don't override personal information fields with company data during updates
           if (formData.tenant_type === 'company') {
             // Only update company-specific fields, preserve personal information
             if (formData.company_name) submitData.company_name = formData.company_name;
             if (formData.company_address) submitData.company_address = formData.company_address;
             if (formData.company_registration_number) submitData.company_registration_number = formData.company_registration_number;
             if (formData.company_gst_tin) submitData.company_gst_tin = formData.company_gst_tin;
             if (formData.company_telephone) submitData.company_telephone = formData.company_telephone;
             if (formData.company_email) submitData.company_email = formData.company_email;
           }

      // Remove empty strings and convert to undefined
      Object.keys(submitData).forEach(key => {
        if (submitData[key as keyof typeof submitData] === '') {
          (submitData as Record<string, unknown>)[key] = undefined;
        }
      });

      console.log('Submitting tenant data:', submitData);
      console.log('Tenant ID:', tenantId);
      console.log('Form data keys:', Object.keys(submitData));
      console.log('Rental unit IDs:', submitData.rental_unit_ids);
      console.log('Files to upload:', files);
      
      await tenantsAPI.update(parseInt(tenantId), submitData, files);
      
      // Update notification preferences
      try {
        await tenantNotificationPreferencesAPI.update(parseInt(tenantId), {
          email_enabled: notificationPreferences.email_enabled,
          sms_enabled: notificationPreferences.sms_enabled,
        });
      } catch (error) {
        console.error('Error updating notification preferences:', error);
        // Don't fail the whole update if preferences fail
      }
      
      // Refresh the available units after successful update
      const assignedUnitIds = formData.rental_unit_ids.map(id => parseInt(id));
      await fetchAvailableUnits(assignedUnitIds);
      
      toast.success('Tenant updated successfully');
      router.push('/tenants');
        } catch (error: unknown) {
          console.error('Error updating tenant:', error);
          
          // Show detailed error message if available
          const errorMessage = error instanceof Error && 'response' in error 
            ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || error.message || 'Failed to update tenant'
            : error instanceof Error 
            ? error.message 
            : 'Failed to update tenant';
          toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error instanceof Error && 'response' in error && (error as { response?: { data?: { details?: unknown } } }).response?.data?.details) {
        console.error('Detailed error:', (error as { response: { data: { details: unknown } } }).response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/tenants');
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading tenant details...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Tenant</h1>
              <p className="text-gray-600">
                Update tenant information and lease details
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Type</CardTitle>
              <CardDescription>Select whether this is an individual or company tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="tenant_type"
                    value="individual"
                    checked={formData.tenant_type === 'individual'}
                    onChange={(e) => handleInputChange('tenant_type', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Individual</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="tenant_type"
                    value="company"
                    checked={formData.tenant_type === 'company'}
                    onChange={(e) => handleInputChange('tenant_type', e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Company</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details of the tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <Input
                    placeholder="Enter first name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <Input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <Select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number
                  </label>
                  <Input
                    placeholder="Enter ID number"
                    value={formData.national_id}
                    onChange={(e) => handleInputChange('national_id', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <Input
                  placeholder="Enter nationality"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Information - Only show for company tenants */}
          {formData.tenant_type === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Company details and registration information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <Input
                    placeholder="Enter company name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Address *
                  </label>
                  <Textarea
                    placeholder="Enter company address"
                    value={formData.company_address}
                    onChange={(e) => handleInputChange('company_address', e.target.value)}
                    rows={3}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Registration Number *
                    </label>
                    <Input
                      placeholder="Enter registration number"
                      value={formData.company_registration_number}
                      onChange={(e) => handleInputChange('company_registration_number', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST TIN
                    </label>
                    <Input
                      placeholder="Enter GST TIN"
                      value={formData.company_gst_tin}
                      onChange={(e) => handleInputChange('company_gst_tin', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Contact details and address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.tenant_type === 'individual' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone *
                      </label>
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <Textarea
                      placeholder="Enter full address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Personal Contact */}
                  <div className="border-b pb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Personal Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Personal Email
                        </label>
                        <Input
                          type="email"
                          placeholder="Enter personal email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Personal Phone
                        </label>
                        <Input
                          type="tel"
                          placeholder="Enter personal phone"
                          value={formData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Personal Address
                      </label>
                      <Textarea
                        placeholder="Enter personal address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  {/* Company Contact */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Company Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Telephone *
                        </label>
                        <Input
                          placeholder="Enter company telephone"
                          value={formData.company_telephone}
                          onChange={(e) => handleInputChange('company_telephone', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Email *
                        </label>
                        <Input
                          type="email"
                          placeholder="Enter company email"
                          value={formData.company_email}
                          onChange={(e) => handleInputChange('company_email', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
              <CardDescription>Configure how the tenant wants to receive reminders and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.email_enabled}
                        onChange={(e) => setNotificationPreferences(prev => ({
                          ...prev,
                          email_enabled: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Email Notifications</span>
                        <p className="text-xs text-gray-500">Receive reminders via email</p>
                      </div>
                    </label>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPreferences.sms_enabled}
                        onChange={(e) => setNotificationPreferences(prev => ({
                          ...prev,
                          sms_enabled: e.target.checked
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">SMS Notifications</span>
                        <p className="text-xs text-gray-500">Receive reminders via SMS</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              {!notificationPreferences.email_enabled && !notificationPreferences.sms_enabled && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Both notifications are disabled. The tenant will not receive any reminders.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lease Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lease Information</CardTitle>
              <CardDescription>Lease start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.lease_start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, lease_start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agreement End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.lease_end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, lease_end_date: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Emergency Contact</CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Name
                  </label>
                  <Input
                    placeholder="Enter emergency contact name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    placeholder="Enter emergency contact phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <Input
                    placeholder="e.g., Spouse, Parent, Sibling"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rental Unit Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Rental Unit Assignment
              </CardTitle>
              <CardDescription>Assign the tenant to available rental units. You can link/unlink entire properties or individual units. Currently assigned units are shown for reference.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Rental Units
                </label>
                {unitsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading available units...</span>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {(() => {
                      // Group units by property
                      const groupedByProperty = availableUnits.reduce((acc: {[key: string]: RentalUnit[]}, unit) => {
                        const propertyId = unit.property.id.toString();
                        if (!acc[propertyId]) {
                          acc[propertyId] = [];
                        }
                        acc[propertyId].push(unit);
                        return acc;
                      }, {});

                      return Object.entries(groupedByProperty).map(([propertyId, units]) => {
                        const property = units[0].property;
                        const selectedUnitsInProperty = units.filter(unit => 
                          formData.rental_unit_ids.includes(unit.id.toString())
                        );
                        const allUnitsInPropertySelected = selectedUnitsInProperty.length === units.length;
                        const someUnitsInPropertySelected = selectedUnitsInProperty.length > 0;

                        return (
                          <div key={propertyId} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                            {/* Property Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={allUnitsInPropertySelected}
                                  ref={(input) => {
                                    if (input) {
                                      input.indeterminate = someUnitsInPropertySelected && !allUnitsInPropertySelected;
                                    }
                                  }}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Select all units in this property
                                      const unitIdsToAdd = units
                                        .filter(unit => !formData.rental_unit_ids.includes(unit.id.toString()))
                                        .map(unit => unit.id.toString());
                                      setFormData(prev => ({
                                        ...prev,
                                        rental_unit_ids: [...prev.rental_unit_ids, ...unitIdsToAdd]
                                      }));
                                    } else {
                                      // Unselect all units in this property
                                      const unitIdsToRemove = units.map(unit => unit.id.toString());
                                      setFormData(prev => ({
                                        ...prev,
                                        rental_unit_ids: prev.rental_unit_ids.filter(id => !unitIdsToRemove.includes(id))
                                      }));
                                    }
                                  }}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900">{property.name}</h4>
                                  <p className="text-xs text-gray-500">
                                    {units.length} unit{units.length !== 1 ? 's' : ''} • 
                                    {selectedUnitsInProperty.length} selected
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (someUnitsInPropertySelected) {
                                    // Unlink entire property
                                    const unitIdsToRemove = units.map(unit => unit.id.toString());
                                    setFormData(prev => ({
                                      ...prev,
                                      rental_unit_ids: prev.rental_unit_ids.filter(id => !unitIdsToRemove.includes(id))
                                    }));
                                  } else {
                                    // Link entire property
                                    const unitIdsToAdd = units
                                      .filter(unit => !formData.rental_unit_ids.includes(unit.id.toString()))
                                      .map(unit => unit.id.toString());
                                    setFormData(prev => ({
                                      ...prev,
                                      rental_unit_ids: [...prev.rental_unit_ids, ...unitIdsToAdd]
                                    }));
                                  }
                                }}
                                className={`text-xs px-2 py-1 rounded ${
                                  someUnitsInPropertySelected
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {someUnitsInPropertySelected ? 'Unlink Property' : 'Link Property'}
                              </button>
                            </div>

                            {/* Individual Units */}
                            <div className="ml-7 space-y-2">
                              {units.map((unit) => (
                                <label key={unit.id} className="flex items-start space-x-3 cursor-pointer hover:bg-white p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={formData.rental_unit_ids.includes(unit.id.toString())}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFormData(prev => ({
                                          ...prev,
                                          rental_unit_ids: [...prev.rental_unit_ids, unit.id.toString()]
                                        }));
                                      } else {
                                        setFormData(prev => ({
                                          ...prev,
                                          rental_unit_ids: prev.rental_unit_ids.filter(id => id !== unit.id.toString())
                                        }));
                                      }
                                    }}
                                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      Unit {unit.unit_number} (Floor {unit.floor_number})
                                      {unit.status === 'occupied' && formData.rental_unit_ids.includes(unit.id.toString()) && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                          Currently Assigned
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {unit.number_of_rooms && unit.number_of_toilets && 
                                        `${unit.number_of_rooms} bed, ${unit.number_of_toilets} bath`
                                      }
                                      {unit.rent_amount && 
                                        ` • ${unit.currency || '$'}${unit.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`
                                      }
                                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
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
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
              
              {/* Selected Units Summary */}
              {formData.rental_unit_ids.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Selected Units ({formData.rental_unit_ids.length})
                  </h4>
                  <div className="space-y-1">
                    {formData.rental_unit_ids.map((unitId) => {
                      const unit = availableUnits.find(u => u.id.toString() === unitId);
                      return unit ? (
                        <div key={unitId} className="text-xs text-blue-700">
                          • {unit.property.name} - Unit {unit.unit_number} (Floor {unit.floor_number})
                          {unit.rent_amount && 
                            ` - ${unit.currency || '$'}${unit.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`
                          }
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {availableUnits.length === 0 && !unitsLoading && (
                <div className="text-center py-4 text-gray-500">
                  <Home className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm font-medium">No available rental units found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    All rental units are currently occupied or under maintenance
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Documents & Agreements
              </CardTitle>
              <CardDescription>Upload tenant agreements, contracts, and other important documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Existing Documents */}
              {Array.isArray(existingDocuments) && existingDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Documents</h4>
                  <div className="space-y-2">
                    {Array.isArray(existingDocuments) && existingDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {doc.type.includes('pdf') ? (
                              <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-red-600">PDF</span>
                              </div>
                            ) : doc.type.includes('image') ? (
                              <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-blue-600">IMG</span>
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">DOC</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                            <p className="text-xs text-gray-500">
                              {(doc.size / 1024 / 1024).toFixed(2)} MB • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <a
                            href={`http://localhost:8000/storage/${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </a>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `http://localhost:8000/storage/${doc.path}`;
                              link.download = doc.name;
                              link.click();
                            }}
                            className="text-green-600 hover:text-green-800 text-sm font-medium"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* New File Upload */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {Array.isArray(existingDocuments) && existingDocuments.length > 0 ? 'Add More Documents' : 'Upload Documents'}
                </h4>
                <FileUpload
                  files={files}
                  onFilesChange={setFiles}
                  maxFiles={10}
                  acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                  maxSize={10}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status and Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Status and Notes</CardTitle>
              <CardDescription>Tenant status and additional notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <Textarea
                  placeholder="Enter any additional notes about the tenant"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Updating...' : 'Update Tenant'}
            </Button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
