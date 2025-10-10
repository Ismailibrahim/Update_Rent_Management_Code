'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Textarea } from '../../../components/UI/Textarea';
import { Select } from '../../../components/UI/Select';
import { ArrowLeft, Save, X, Home, Upload } from 'lucide-react';
import { tenantsAPI, rentalUnitsAPI, type Tenant } from '../../../services/api';
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

  useEffect(() => {
    fetchAvailableUnits();
  }, []);

  const fetchAvailableUnits = async () => {
    try {
      setUnitsLoading(true);
      const response = await rentalUnitsAPI.getAll({ available: true });
      setAvailableUnits(response.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching available rental units:', error);
      toast.error('Failed to fetch available rental units');
    } finally {
      setUnitsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
        // Validate required fields based on tenant type
        if (formData.tenant_type === 'individual') {
          if (!formData.first_name || !formData.last_name) {
            toast.error('Please fill in first name and last name for individual tenant');
            return;
          }
        } else if (formData.tenant_type === 'company') {
          if (!formData.company_name || !formData.company_address || !formData.company_registration_number || !formData.company_telephone || !formData.company_email) {
            toast.error('Please fill in all required fields for company tenant');
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
      // Create tenant first with files (without rental_unit_ids)
      const { rental_unit_ids: selectedUnitIds, ...tenantData } = formData;
      
      // Convert string fields to numbers where needed and handle company fields
      const processedTenantData: Partial<Tenant> = {
        ...tenantData,
        tenant_type: tenantData.tenant_type as 'individual' | 'company',
        employment_salary: tenantData.employment_salary ? parseFloat(tenantData.employment_salary) : undefined,
        // Keep personal and company information separate - don't map company fields to personal fields
      };
      
      // Remove empty strings and convert to null
      Object.keys(processedTenantData).forEach(key => {
        if (processedTenantData[key as keyof typeof processedTenantData] === '') {
          (processedTenantData as Record<string, unknown>)[key] = null;
        }
      });
      
           console.log('Creating tenant with data:', processedTenantData);
           console.log('Contact fields being sent:', {
             email: processedTenantData.email,
             phone: processedTenantData.phone,
             address: processedTenantData.address,
             company_email: processedTenantData.company_email,
             company_telephone: processedTenantData.company_telephone,
             tenant_type: processedTenantData.tenant_type
           });
           console.log('Files:', files);
      
      const tenantResponse = await tenantsAPI.create(processedTenantData, files);
      const tenant = tenantResponse.data.tenant;
      
      // Assign the tenant to all selected rental units
      const assignmentResults = [];
      for (const unitId of selectedUnitIds) {
        try {
          await rentalUnitsAPI.update(parseInt(unitId), {
            tenant_id: tenant.id,
            status: 'occupied',
            move_in_date: formData.lease_start_date || new Date().toISOString().split('T')[0],
            lease_end_date: formData.lease_end_date
          });
          assignmentResults.push({ unitId, success: true });
        } catch (unitError: unknown) {
          console.error(`Error assigning tenant to rental unit ${unitId}:`, unitError);
          const errorMessage = unitError && typeof unitError === 'object' && 'message' in unitError 
            ? (unitError as { message: string }).message 
            : 'Unknown error';
          assignmentResults.push({ unitId, success: false, error: errorMessage });
        }
      }
      
      const successfulAssignments = assignmentResults.filter(r => r.success).length;
      const failedAssignments = assignmentResults.filter(r => !r.success).length;
      
      if (successfulAssignments === selectedUnitIds.length) {
        toast.success(`Tenant created and assigned to ${successfulAssignments} rental unit(s) successfully`);
      } else if (successfulAssignments > 0) {
        toast.success(`Tenant created and assigned to ${successfulAssignments} of ${selectedUnitIds.length} rental units. ${failedAssignments} assignments failed.`);
      } else {
        toast.error('Tenant created but failed to assign to any rental units. Please manually assign the tenant.');
      }
      
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

  const handleBack = () => {
    router.push('/tenants');
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleBack} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Tenant</h1>
            <p className="mt-2 text-gray-600">
              Create a new tenant profile with complete information
            </p>
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
                  <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {availableUnits.map((unit) => (
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
                    ))}
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
