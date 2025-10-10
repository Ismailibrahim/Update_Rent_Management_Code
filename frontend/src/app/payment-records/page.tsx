'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Receipt, Search, Eye, FileText, Trash2 } from 'lucide-react';
import { paymentRecordsAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface PaymentRecord {
  id: number;
  tenant_id: number;
  property_id: number;
  payment_type_id: number;
  payment_mode_id: number;
  amount: number;
  currency?: { code: string; symbol: string } | null;
  reference_number?: string;
  payment_date: string;
  status: string;
  notes?: string;
  tenant?: {
    name: string;
  };
  property?: {
    name: string;
  };
  rental_unit?: {
    unit_number: string;
    status: string;
    unit_type?: string | null;
  } | null;
  paymentType?: {
    name: string;
  };
  paymentMode?: {
    name: string;
  };
  rent_invoice?: {
    id: number;
    invoice_number: string;
    total_amount: number;
    currency: string;
    invoice_date: string;
    due_date: string;
    status: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export default function PaymentRecordsPage() {
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [showViewInvoiceModal, setShowViewInvoiceModal] = useState(false);
  const [selectedPaymentRecord, setSelectedPaymentRecord] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    fetchPaymentRecords();
  }, []);

  const fetchPaymentRecords = async () => {
    try {
      setLoading(true);
      const response = await paymentRecordsAPI.getAll();
      setPaymentRecords(response.data.payment_records || []);
    } catch (error) {
      console.error('Error fetching payment records:', error);
      toast.error('Failed to fetch payment records');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentRecord = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) {
      return;
    }

    try {
      await paymentRecordsAPI.delete(id);
      toast.success('Payment record deleted successfully');
      fetchPaymentRecords(); // Refresh the list
    } catch (error) {
      console.error('Error deleting payment record:', error);
      toast.error('Failed to delete payment record');
    }
  };

  const filteredPaymentRecords = paymentRecords.filter(record => {
    const matchesSearch = record.tenant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.property?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.paymentType?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.paymentMode?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reference_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMonth = !monthFilter || record.payment_date.startsWith(monthFilter);
    
    const matchesProperty = !propertyFilter || record.property?.name === propertyFilter;
    
    const matchesTenant = !tenantFilter || record.tenant?.name === tenantFilter;
    
    return matchesSearch && matchesMonth && matchesProperty && matchesTenant;
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Records</h1>
            <p className="mt-2 text-gray-600">
              Detailed payment transaction records
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search payment records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Month
              </label>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                placeholder="Select month"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Property
              </label>
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Properties</option>
                {Array.from(new Set(paymentRecords.map(record => record.property?.name).filter(Boolean))).map(propertyName => (
                  <option key={propertyName} value={propertyName}>{propertyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Tenant
              </label>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Tenants</option>
                {Array.from(new Set(paymentRecords.map(record => record.tenant?.name).filter(Boolean))).map(tenantName => (
                  <option key={tenantName} value={tenantName}>{tenantName}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setMonthFilter('');
                  setPropertyFilter('');
                  setTenantFilter('');
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Payment Records Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Payment Records List ({filteredPaymentRecords.length} of {paymentRecords.length})
            </CardTitle>
            <CardDescription className="text-gray-600">
              View and filter payment transaction records
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tenant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Property</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Unit</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Mode</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPaymentRecords.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{record.tenant?.name || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{record.property?.name || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        {record.rental_unit ? (
                          <div className="text-sm text-gray-900 font-medium">Unit {record.rental_unit.unit_number}</div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {(record.currency?.code || 'MVR')} {record.amount ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(record.amount) : '0'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{record.paymentType?.name || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600">{record.paymentMode?.name || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-500">
                          {new Date(record.payment_date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPaymentRecord(record);
                              setShowViewInvoiceModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePaymentRecord(record.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Payment Record"
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

            {filteredPaymentRecords.length === 0 && (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No payment records found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Payment records will appear here when invoices are marked as paid.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Invoice Modal */}
        {showViewInvoiceModal && selectedPaymentRecord && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowViewInvoiceModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-blue-600 mr-3" />
                    <h3 className="text-lg font-medium text-gray-900">
                      {selectedPaymentRecord.rent_invoice ? 
                        `Invoice Details - ${selectedPaymentRecord.rent_invoice.invoice_number}` : 
                        'Payment Record Details'
                      }
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowViewInvoiceModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Information - Only show if rent_invoice exists */}
                  {selectedPaymentRecord.rent_invoice && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Invoice Information</h4>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Invoice Number:</span>
                          <span className="text-sm text-gray-900">{selectedPaymentRecord.rent_invoice.invoice_number}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Invoice Date:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(selectedPaymentRecord.rent_invoice.invoice_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Due Date:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(selectedPaymentRecord.rent_invoice.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Status:</span>
                          <span className={`text-sm px-2 py-1 rounded-full ${
                            selectedPaymentRecord.rent_invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            selectedPaymentRecord.rent_invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            selectedPaymentRecord.rent_invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedPaymentRecord.rent_invoice.status.charAt(0).toUpperCase() + selectedPaymentRecord.rent_invoice.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Financial Details</h4>
                    
                    <div className="space-y-3">
                      {selectedPaymentRecord.rent_invoice && (
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-sm font-bold text-gray-900">Invoice Total Amount:</span>
                          <span className="text-sm font-bold text-gray-900">
                            {selectedPaymentRecord.rent_invoice.currency} {selectedPaymentRecord.rent_invoice.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Payment Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Payment Amount:</span>
                        <span className="text-sm text-gray-900">
                          {(selectedPaymentRecord.currency?.code || 'MVR')} {selectedPaymentRecord.amount?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Payment Type:</span>
                        <span className="text-sm text-gray-900">{selectedPaymentRecord.paymentType?.name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Payment Mode:</span>
                        <span className="text-sm text-gray-900">{selectedPaymentRecord.paymentMode?.name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Payment Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedPaymentRecord.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {selectedPaymentRecord.reference_number && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Reference Number:</span>
                          <span className="text-sm text-gray-900">{selectedPaymentRecord.reference_number}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tenant Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Tenant Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Tenant Name:</span>
                        <span className="text-sm text-gray-900">{selectedPaymentRecord.tenant?.name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Property:</span>
                        <span className="text-sm text-gray-900">{selectedPaymentRecord.property?.name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Unit Number:</span>
                        <span className="text-sm text-gray-900">{selectedPaymentRecord.rental_unit?.unit_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPaymentRecord.notes && (
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {selectedPaymentRecord.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowViewInvoiceModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}