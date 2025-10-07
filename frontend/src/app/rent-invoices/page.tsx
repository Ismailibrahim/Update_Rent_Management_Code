'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { FileText, Search, Edit, Trash2, Eye, DollarSign, Calendar, User, Building, CheckCircle, Clock, AlertCircle, Plus } from 'lucide-react';
import { rentInvoicesAPI, paymentTypesAPI, paymentModesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface RentInvoice {
  id: number;
  invoice_number: string;
  tenant_id: number;
  property_id: number;
  rental_unit_id: number;
  invoice_date: string;
  due_date: string;
  rent_amount: number;
  late_fee: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  notes?: string;
  payment_details?: Record<string, unknown>;
  tenant: {
    personal_info: {
      firstName: string;
      lastName: string;
    };
  };
  property: {
    name: string;
  };
  rental_unit: {
    unit_number: string;
  };
  created_at: string;
  updated_at: string;
}

export default function RentInvoicesPage() {
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // Generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dueDateOffset, setDueDateOffset] = useState(7);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RentInvoice | null>(null);
  const [paymentType, setPaymentType] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentTypes, setPaymentTypes] = useState<Record<string, unknown>[]>([]);
  const [paymentModes, setPaymentModes] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    fetchInvoices();
    fetchPaymentTypesAndModes();
  }, [statusFilter, monthFilter, yearFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = parseInt(monthFilter);
      if (yearFilter) params.year = parseInt(yearFilter);
      
      const response = await rentInvoicesAPI.getAll(params);
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch rent invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentTypesAndModes = async () => {
    try {
      const [typesResponse, modesResponse] = await Promise.all([
        paymentTypesAPI.getAll(),
        paymentModesAPI.getAll()
      ]);
      setPaymentTypes(typesResponse.data.payment_types || []);
      setPaymentModes(modesResponse.data.payment_modes || []);
    } catch (error) {
      console.error('Error fetching payment types and modes:', error);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    // Handle cases where tenant might be null
    const tenantName = invoice.tenant?.personal_info ? 
      `${invoice.tenant.personal_info.firstName} ${invoice.tenant.personal_info.lastName}`.toLowerCase() : 
      'no tenant';
    const propertyName = invoice.property?.name?.toLowerCase() || 'no property';
    const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';
    
    return tenantName.includes(searchTerm.toLowerCase()) ||
           propertyName.includes(searchTerm.toLowerCase()) ||
           invoiceNumber.includes(searchTerm.toLowerCase());
  });

  const handleDeleteInvoice = async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    
    try {
      await rentInvoicesAPI.delete(id);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleMarkAsPaid = async (invoice: RentInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentType('');
    setPaymentMode('');
    setReferenceNumber('');
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    
    if (!paymentType || !paymentMode) {
      toast.error('Please select both payment type and payment mode');
      return;
    }

    try {
      const paymentDetails = {
        payment_type: paymentType,
        payment_mode: paymentMode,
        reference_number: referenceNumber,
        notes: paymentNotes,
        payment_date: new Date().toISOString().split('T')[0]
      };

      await rentInvoicesAPI.markAsPaid(selectedInvoice.id, paymentDetails);
      toast.success('Invoice marked as paid successfully');
      setShowPaymentModal(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    }
  };

  const handleGenerateInvoices = async () => {
    try {
      setGenerating(true);
      
      const response = await rentInvoicesAPI.generateMonthly({
        month: selectedMonth,
        year: selectedYear,
        due_date_offset: dueDateOffset
      });

      if (response.data.generated_count > 0) {
        toast.success(`Successfully generated ${response.data.generated_count} rent invoices`);
        setShowGenerateModal(false);
        fetchInvoices(); // Refresh the invoices list
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} invoices could not be generated`);
      }

    } catch (error: unknown) {
      console.error('Error generating invoices:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'Failed to generate rent invoices';
      toast.error(errorMessage || 'Failed to generate rent invoices');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MVR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MVR' ? 'USD' : currency,
      minimumFractionDigits: 0,
    }).format(amount).replace('$', currency === 'MVR' ? 'MVR ' : '$');
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const isOverdue = (dueDate: string, status: string) => {
    return status === 'pending' && new Date(dueDate) < new Date();
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rent Invoices</h1>
            <p className="mt-2 text-gray-600">
              Manage rent invoices and payment status
            </p>
          </div>
          <Button 
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Generate Monthly Invoices
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'pending').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'paid').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'overdue' || isOverdue(inv.due_date, inv.status)).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              
              <Select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              >
                <option value="">All Months</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </Select>
              
              <Input
                type="number"
                placeholder="Year"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                min="2020"
                max="2030"
              />
              
              <Button variant="outline" onClick={fetchInvoices}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-sm text-gray-500">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {invoice.tenant?.personal_info ? 
                                `${invoice.tenant.personal_info.firstName} ${invoice.tenant.personal_info.lastName}` : 
                                'No Tenant'
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {invoice.property.name} - Unit {invoice.rental_unit.unit_number}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(invoice.total_amount, invoice.currency)}
                            </span>
                          </div>
                          {invoice.late_fee > 0 && (
                            <div className="text-xs text-red-500">
                              +{formatCurrency(invoice.late_fee, invoice.currency)} late fee
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <span className={`text-sm ${
                              isOverdue(invoice.due_date, invoice.status) ? 'text-red-600 font-medium' : 'text-gray-600'
                            }`}>
                              {new Date(invoice.due_date).toLocaleDateString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1">{invoice.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" title="View Details">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {invoice.status === 'pending' && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="text-green-600 hover:text-green-700"
                                title="Mark as Paid"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="outline" size="sm" title="Edit Invoice">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete Invoice"
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
        )}

        {!loading && filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || monthFilter ? 'Try adjusting your search filters.' : 'Get started by generating monthly rent invoices.'}
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowGenerateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Monthly Invoices
              </Button>
            </div>
          </div>
        )}

        {/* Generation Modal */}
        {showGenerateModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowGenerateModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <FileText className="h-6 w-6 text-blue-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Generate Monthly Rent Invoices
                  </h3>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <Select
                      value={selectedMonth.toString()}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {getMonthName(i + 1)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year
                    </label>
                    <Input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      min="2020"
                      max="2030"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date (days after invoice date)
                    </label>
                    <Input
                      type="number"
                      value={dueDateOffset}
                      onChange={(e) => setDueDateOffset(parseInt(e.target.value))}
                      min="1"
                      max="31"
                    />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateInvoices}
                  disabled={generating}
                >
                  {generating ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Invoices
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedInvoice && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowPaymentModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Mark Invoice as Paid
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Invoice: {selectedInvoice.invoice_number} - {selectedInvoice.tenant?.personal_info ? 
                    `${selectedInvoice.tenant.personal_info.firstName} ${selectedInvoice.tenant.personal_info.lastName}` : 
                    'No Tenant'
                  }
                </p>
              </div>
              
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type *
                    </label>
                    <Select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                    >
                      <option value="">Select payment type</option>
                      {paymentTypes.map((type, index) => (
                        <option key={index} value={String(type.id)}>
                          {String(type.name)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Mode *
                    </label>
                    <Select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="">Select payment mode</option>
                      {paymentModes.map((mode, index) => (
                        <option key={index} value={String(mode.id)}>
                          {String(mode.name)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Number
                    </label>
                    <Input
                      placeholder="Enter reference number (optional)"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Notes
                    </label>
                    <Input
                      placeholder="Enter payment notes (optional)"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
