'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Textarea } from '../../../components/UI/Textarea';
import { Select } from '../../../components/UI/Select';
import { ArrowLeft, Save, X, Home, Upload, Search, Briefcase, Wallet } from 'lucide-react';
import { tenantsAPI, rentalUnitsAPI, nationalitiesAPI, type Tenant, type Nationality } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useRouter } from 'next/navigation';
import FileUpload from '../../../components/UI/FileUpload';

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

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<RentalUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [nationalities, setNationalities] = useState<Nationality[]>([]);
  const [nationalitiesLoading, setNationalitiesLoading] = useState(true);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    // Tenant type selection
    tenant_type: 'individual', // 'individual' or 'company'
    // New separate columns
    first_name: '',
    last_name: '',
    date_of_birth: '',
    national_id: '',
    nationality: '',
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
    company_email: ''
  });

  // Optimize: Parallel API calls for better performance
  useEffect(() => {
    const fetchData = async () => {
      try {
        setUnitsLoading(true);
        setNationalitiesLoading(true);
        
        // Fetch both APIs in parallel
        const [unitsResponse, nationalitiesResponse] = await Promise.all([
          rentalUnitsAPI.getAll({ available: true }).catch(err => {
            console.error('Error fetching available rental units:', err);
            toast.error('Failed to fetch available rental units');
            return { data: { rentalUnits: [] } };
          }),
          nationalitiesAPI.getAll().catch(err => {
            console.error('Error fetching nationalities:', err);
            toast.error('Failed to fetch nationalities');
            return { data: { data: [] } };
          })
        ]);
        
        setAvailableUnits(unitsResponse.data.rentalUnits || []);
        setNationalities(nationalitiesResponse.data.data || []);
      } finally {
        setUnitsLoading(false);
        setNationalitiesLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Memoized handlers for better performance
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Memoized filtered rental units based on search query
  const filteredUnits = useMemo(() => {
    if (!unitSearchQuery.trim()) {
      return availableUnits;
    }
    
    const query = unitSearchQuery.toLowerCase();
    return availableUnits.filter(unit => {
      const propertyName = unit.property.name.toLowerCase();
      const unitNumber = unit.unit_number.toLowerCase();
      const searchText = `${propertyName} ${unitNumber} ${unit.floor_number}`.toLowerCase();
      return searchText.includes(query);
    });
  }, [availableUnits, unitSearchQuery]);

  // Memoized selected units summary
  const selectedUnitsSummary = useMemo(() => {
    return formData.rental_unit_ids
      .map(unitId => availableUnits.find(u => u.id.toString() === unitId))
      .filter((unit): unit is RentalUnit => unit !== undefined);
  }, [formData.rental_unit_ids, availableUnits]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
        // Validate required fields based on tenant type
        if (formData.tenant_type === 'individual') {
          if (!formData.first_name || !formData.last_name) {
            toast.error('Please fill in first name and last name for individual tenant');
            return;
          }
          if (!formData.email || !formData.phone) {
            toast.error('Please fill in email and phone for individual tenant');
            return;
          }
        } else if (formData.tenant_type === 'company') {
          if (!formData.company_name || !formData.company_address || !formData.company_registration_number || !formData.company_telephone || !formData.company_email) {
            toast.error('Please fill in all required company fields (name, address, registration number, telephone, and email)');
            return;
          }
          // For company tenants, personal information is optional
          // No additional validation needed - personal info can be partial or empty
        }
    
    if (!formData.rental_unit_ids || formData.rental_unit_ids.length === 0) {
      toast.error('Please select at least one rental unit');
      return;
    }
    
    setLoading(true);

    try {
      // Convert rental_unit_ids to numbers for the API
      const rentalUnitIds = formData.rental_unit_ids.map(id => parseInt(id));
      
      // Convert string fields to numbers where needed and handle company fields
      const processedTenantData: Partial<Tenant> = {
        ...formData,
        tenant_type: formData.tenant_type as 'individual' | 'company',
        employment_salary: formData.employment_salary ? parseFloat(formData.employment_salary) : undefined,
        rental_unit_ids: rentalUnitIds, // Include rental_unit_ids so backend handles assignment efficiently
        // Keep personal and company information separate - don't map company fields to personal fields
      };
      
      // Remove empty strings and convert to null
      Object.keys(processedTenantData).forEach(key => {
        if (processedTenantData[key as keyof typeof processedTenantData] === '') {
          (processedTenantData as Record<string, unknown>)[key] = null;
        }
      });
      
           // Debug logs (remove in production)
           if (process.env.NODE_ENV === 'development') {
             console.log('Creating tenant with data:', processedTenantData);
             console.log('Files:', files);
           }
      
      // Backend will handle rental unit assignment efficiently in a single query
      const tenantResponse = await tenantsAPI.create(processedTenantData, files);
      const tenant = tenantResponse.data.tenant;
      
      // Success - backend already assigned the tenant to all rental units
      const unitCount = rentalUnitIds.length;
      toast.success(`Tenant created and assigned to ${unitCount} rental unit(s) successfully`);
      
      router.push('/tenants');
        } catch (error: unknown) {
          console.error('Error creating tenant:', error);
          
          // Show detailed error message if available
          const errorMessage = error instanceof Error && 'response' in error 
            ? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error || (error as { response?: { data?: { message?: string } } }).response?.data?.message || error.message || 'Failed to create tenant'
            : error instanceof Error 
            ? error.message 
            : 'Failed to create tenant';
          toast.error(errorMessage);
      
      // Log detailed error for debugging
      if (error instanceof Error && 'response' in error && (error as { response?: { data?: { details?: unknown } } }).response?.data?.details) {
        console.error('Detailed error:', (error as { response: { data: { details: unknown } } }).response.data.details);
      }
      
      // Log validation errors if available
      if (error instanceof Error && 'response' in error && (error as { response?: { data?: { errors?: unknown } } }).response?.data?.errors) {
        console.error('Validation errors:', (error as { response: { data: { errors: unknown } } }).response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    router.push('/tenants');
  }, [router]);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={handleBack} 
            className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Tenant</h1>
            <p className="mt-2 text-gray-600">
              Create a new tenant profile with complete information
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" suppressHydrationWarning>
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
                <Select
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  disabled={nationalitiesLoading}
                >
                  <option value="">Select nationality</option>
                  {nationalities.map((nationality) => (
                    <option key={nationality.id} value={nationality.nationality}>
                      {nationality.nationality}
                    </option>
                  ))}
                </Select>
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
              <CardDescription>
                {formData.tenant_type === 'individual' 
                  ? 'How to reach the tenant' 
                  : 'Personal and company contact details'
                }
              </CardDescription>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <Input
                        placeholder="Enter city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <Input
                        placeholder="Enter postal code"
                        value={formData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      />
                    </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <Input
                          placeholder="Enter city"
                          value={formData.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code
                        </label>
                        <Input
                          placeholder="Enter postal code"
                          value={formData.postal_code}
                          onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        />
                      </div>
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

          {/* Employment Information */}
          {formData.tenant_type === 'individual' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Employment Information
                </CardTitle>
                <CardDescription>Employment details for the tenant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <Input
                      placeholder="Enter employer company name"
                      value={formData.employment_company}
                      onChange={(e) => handleInputChange('employment_company', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <Input
                      placeholder="Enter job position"
                      value={formData.employment_position}
                      onChange={(e) => handleInputChange('employment_position', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Salary
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter monthly salary"
                      value={formData.employment_salary}
                      onChange={(e) => handleInputChange('employment_salary', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Work Phone
                    </label>
                    <Input
                      placeholder="Enter work phone number"
                      value={formData.employment_phone}
                      onChange={(e) => handleInputChange('employment_phone', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bank Account Information */}
          {formData.tenant_type === 'individual' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Bank Account Information
                </CardTitle>
                <CardDescription>Banking details for payment processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <Input
                      placeholder="Enter bank name"
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number
                    </label>
                    <Input
                      placeholder="Enter account number"
                      value={formData.account_number}
                      onChange={(e) => handleInputChange('account_number', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Holder Name
                  </label>
                  <Input
                    placeholder="Enter account holder name"
                    value={formData.account_holder_name}
                    onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rental Unit Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Rental Unit Assignment
              </CardTitle>
              <CardDescription>Assign the tenant to available rental units (select one or more)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Available Rental Units *
                </label>
                {unitsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading available units...</span>
                  </div>
                ) : (
                  <>
                    {/* Search/Filter for Rental Units */}
                    {availableUnits.length > 5 && (
                      <div className="mb-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="text"
                            placeholder="Search by property name, unit number, or floor..."
                            value={unitSearchQuery}
                            onChange={(e) => setUnitSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        {unitSearchQuery && (
                          <p className="text-xs text-gray-500 mt-1">
                            Showing {filteredUnits.length} of {availableUnits.length} units
                          </p>
                        )}
                      </div>
                    )}
                    <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {filteredUnits.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          <p className="text-sm">No units found matching your search.</p>
                        </div>
                      ) : (
                        filteredUnits.map((unit) => (
                      <label key={unit.id} className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
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
                            {unit.property.name} - Unit {unit.unit_number} (Floor {unit.floor_number})
                          </div>
                          <div className="text-xs text-gray-500">
                            {unit.number_of_rooms && unit.number_of_toilets && 
                              `${unit.number_of_rooms} bed, ${unit.number_of_toilets} bath`
                            }
                            {unit.rent_amount && 
                              ` • ${unit.currency || '$'}${unit.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`
                            }
                          </div>
                        </div>
                      </label>
                      ))
                      )}
                    </div>
                  </>
                )}
              </div>
              
              {/* Selected Units Summary */}
              {selectedUnitsSummary.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    Selected Units ({selectedUnitsSummary.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedUnitsSummary.map((unit) => (
                      <div key={unit.id} className="text-xs text-blue-700">
                        • {unit.property.name} - Unit {unit.unit_number} (Floor {unit.floor_number})
                        {unit.rent_amount && 
                          ` - ${unit.currency || '$'}${unit.rent_amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month`
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {availableUnits.length === 0 && !unitsLoading && (
                <div className="text-center py-4 text-red-500">
                  <Home className="mx-auto h-8 w-8 text-red-400 mb-2" />
                  <p className="text-sm font-medium">No available rental units found</p>
                  <p className="text-xs text-red-400 mt-1">
                    Cannot create tenant without selecting at least one rental unit
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
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
            <CardContent>
              <FileUpload
                files={files}
                onFilesChange={setFiles}
                maxFiles={10}
                acceptedTypes={['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']}
                maxSize={10}
              />
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
                    Lease End Date
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
            <Button type="submit" disabled={loading || availableUnits.length === 0 || formData.rental_unit_ids.length === 0}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Creating...' : 'Create Tenant'}
            </Button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
