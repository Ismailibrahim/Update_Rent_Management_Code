'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Textarea } from '../../../components/UI/Textarea';
import { Select } from '../../../components/UI/Select';
import { ArrowLeft, Save, X, Home, Upload } from 'lucide-react';
import { tenantsAPI, rentalUnitsAPI } from '../../../services/api';
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
  unit_details: {
    numberOfRooms?: number;
    numberOfToilets?: number;
    square_feet?: number;
  };
  financial: {
    rentAmount?: number;
    currency?: string;
  };
  status: string;
}

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<RentalUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    personal_info: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '',
      nationality: '',
      idNumber: ''
    },
    contact_info: {
      email: '',
      phone: '',
      address: ''
    },
    emergency_contact: {
      name: '',
      phone: '',
      relationship: ''
    },
    status: 'active',
    notes: '',
    lease_start_date: '',
    lease_end_date: '',
    rental_unit_ids: [] as string[]
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

  const handleInputChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section as keyof typeof prev] as Record<string, unknown> || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.rental_unit_ids || formData.rental_unit_ids.length === 0) {
      toast.error('Please select at least one rental unit');
      return;
    }
    
    setLoading(true);

    try {
      // Create tenant first with files (without rental_unit_ids)
      const { rental_unit_ids, ...tenantData } = formData;
      
      
      const tenantResponse = await tenantsAPI.create(tenantData, files);
      const tenant = tenantResponse.data.tenant;
      
      // Assign the tenant to all selected rental units
      const assignmentResults = [];
      for (const unitId of formData.rental_unit_ids) {
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
      
      if (successfulAssignments === formData.rental_unit_ids.length) {
        toast.success(`Tenant created and assigned to ${successfulAssignments} rental unit(s) successfully`);
      } else if (successfulAssignments > 0) {
        toast.success(`Tenant created and assigned to ${successfulAssignments} of ${formData.rental_unit_ids.length} rental units. ${failedAssignments} assignments failed.`);
      } else {
        toast.error('Tenant created but failed to assign to any rental units. Please manually assign the tenant.');
      }
      
      router.push('/tenants');
    } catch (error: unknown) {
      console.error('Error creating tenant:', error);
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          const errorMessage = errorResponse.response?.data?.message || 'Unknown error';
          toast.error('Failed to create tenant: ' + errorMessage);
        }
      } else {
        toast.error('Failed to create tenant');
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
                    value={formData.personal_info.firstName}
                    onChange={(e) => handleInputChange('personal_info', 'firstName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.personal_info.lastName}
                    onChange={(e) => handleInputChange('personal_info', 'lastName', e.target.value)}
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
                    value={formData.personal_info.dateOfBirth}
                    onChange={(e) => handleInputChange('personal_info', 'dateOfBirth', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <Select
                    value={formData.personal_info.gender}
                    onChange={(e) => handleInputChange('personal_info', 'gender', e.target.value)}
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
                    value={formData.personal_info.idNumber}
                    onChange={(e) => handleInputChange('personal_info', 'idNumber', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nationality
                </label>
                <Input
                  placeholder="Enter nationality"
                  value={formData.personal_info.nationality}
                  onChange={(e) => handleInputChange('personal_info', 'nationality', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>How to reach the tenant</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.contact_info.email}
                    onChange={(e) => handleInputChange('contact_info', 'email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input
                    placeholder="Enter phone number"
                    value={formData.contact_info.phone}
                    onChange={(e) => handleInputChange('contact_info', 'phone', e.target.value)}
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
                  value={formData.contact_info.address}
                  onChange={(e) => handleInputChange('contact_info', 'address', e.target.value)}
                  rows={3}
                />
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
                    value={formData.emergency_contact.name}
                    onChange={(e) => handleInputChange('emergency_contact', 'name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <Input
                    placeholder="Enter emergency contact phone"
                    value={formData.emergency_contact.phone}
                    onChange={(e) => handleInputChange('emergency_contact', 'phone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relationship
                  </label>
                  <Input
                    placeholder="e.g., Spouse, Parent, Sibling"
                    value={formData.emergency_contact.relationship}
                    onChange={(e) => handleInputChange('emergency_contact', 'relationship', e.target.value)}
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
                            {unit.unit_details.numberOfRooms && unit.unit_details.numberOfToilets && 
                              `${unit.unit_details.numberOfRooms} bed, ${unit.unit_details.numberOfToilets} bath`
                            }
                            {unit.financial.rentAmount && 
                              ` • ${unit.financial.currency || '$'}${unit.financial.rentAmount.toLocaleString()}/month`
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
                          {unit.financial.rentAmount && 
                            ` - ${unit.financial.currency || '$'}${unit.financial.rentAmount.toLocaleString()}/month`
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
