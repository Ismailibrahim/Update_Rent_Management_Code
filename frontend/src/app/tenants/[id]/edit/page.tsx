'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/UI/Card';
import { Button } from '../../../../components/UI/Button';
import { Input } from '../../../../components/UI/Input';
import { Textarea } from '../../../../components/UI/Textarea';
import { Select } from '../../../../components/UI/Select';
import { ArrowLeft, Save, X, Home, Upload } from 'lucide-react';
import { tenantsAPI, rentalUnitsAPI } from '../../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../../components/Layout/SidebarLayout';
import { useRouter, useParams } from 'next/navigation';
import FileUpload from '../../../../components/UI/FileUpload';

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

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  
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
    fetchTenant();
  }, [tenantId]);

  useEffect(() => {
    // Refresh available units whenever rental_unit_ids change
    // This ensures we see updated unit statuses after linking/unlinking
    fetchAvailableUnits();
  }, [formData.rental_unit_ids]);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      const response = await tenantsAPI.getById(parseInt(tenantId));
      const tenant = response.data.tenant;
      
      setFormData({
        personal_info: {
          firstName: tenant.personal_info?.firstName || '',
          lastName: tenant.personal_info?.lastName || '',
          dateOfBirth: tenant.personal_info?.dateOfBirth || '',
          gender: tenant.personal_info?.gender || '',
          nationality: tenant.personal_info?.nationality || '',
          idNumber: tenant.personal_info?.idNumber || ''
        },
        contact_info: {
          email: tenant.contact_info?.email || '',
          phone: tenant.contact_info?.phone || '',
          address: tenant.contact_info?.address || ''
        },
        emergency_contact: {
          name: tenant.emergency_contact?.name || '',
          phone: tenant.emergency_contact?.phone || '',
          relationship: tenant.emergency_contact?.relationship || ''
        },
        status: tenant.status || 'active',
        notes: tenant.notes || '',
        lease_start_date: tenant.lease_start_date || '',
        lease_end_date: tenant.lease_end_date || '',
        rental_unit_ids: tenant.rental_units?.map((unit: RentalUnit) => unit.id.toString()) || []
      });
      
      // Set existing documents
      setExistingDocuments(tenant.documents || []);
      
      // Fetch available units after setting the form data
      fetchAvailableUnits();
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Failed to fetch tenant details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUnits = async () => {
    try {
      setUnitsLoading(true);
      const response = await rentalUnitsAPI.getAll();
      const allUnits = response.data.rentalUnits || [];
      
      // Filter to show all units that can be assigned to tenants
      // This includes: available units, currently assigned units, and any occupied units
      const availableUnits = allUnits.filter((unit: RentalUnit) => 
        unit.status === 'available' || 
        formData.rental_unit_ids.includes(unit.id.toString()) ||
        unit.status === 'occupied' // Show occupied units so they can be reassigned
      );
      
      setAvailableUnits(availableUnits);
    } catch (error) {
      console.error('Error fetching rental units:', error);
      toast.error('Failed to fetch rental units');
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

    if (!formData.personal_info.firstName || !formData.personal_info.lastName) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        ...formData,
        personal_info: formData.personal_info,
        contact_info: formData.contact_info,
        emergency_contact: formData.emergency_contact,
        lease_start_date: formData.lease_start_date || null,
        lease_end_date: formData.lease_end_date || null
      };

      console.log('Submitting tenant data:', submitData);
      await tenantsAPI.update(parseInt(tenantId), submitData);
      
      // Refresh the available units after successful update
      await fetchAvailableUnits();
      
      toast.success('Tenant updated successfully');
      router.push('/tenants');
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('Failed to update tenant');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/tenants');
  };

  if (loading) {
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
              <CardDescription>Contact details and address</CardDescription>
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
                    type="tel"
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
                                      {unit.unit_details.numberOfRooms && unit.unit_details.numberOfToilets && 
                                        `${unit.unit_details.numberOfRooms} bed, ${unit.unit_details.numberOfToilets} bath`
                                      }
                                      {unit.financial.rentAmount && 
                                        ` • ${unit.financial.currency || '$'}${unit.financial.rentAmount.toLocaleString()}/month`
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
              {existingDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Existing Documents</h4>
                  <div className="space-y-2">
                    {existingDocuments.map((doc, index) => (
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
                            href={`/storage/${doc.path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </a>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `/storage/${doc.path}`;
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
                  {existingDocuments.length > 0 ? 'Add More Documents' : 'Upload Documents'}
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
