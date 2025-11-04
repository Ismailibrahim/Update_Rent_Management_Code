'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { FileText, Search, Trash2, Eye, User, Building, CheckCircle, Clock, AlertCircle, Plus, Upload, FileImage, Receipt, RefreshCw, X } from 'lucide-react';
import { rentInvoicesAPI, paymentTypesAPI, paymentModesAPI, RentInvoice } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface PaymentDetails {
  payment_type?: string;
  payment_mode?: string;
  reference_number?: string;
  notes?: string;
}

// RentInvoice interface is now imported from @/services/api

export default function RentInvoicesPage() {
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // Multi-selection state
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dueDateOffset, setDueDateOffset] = useState(7);
  const [skippedTenants, setSkippedTenants] = useState<Array<{
    tenant_name: string;
    unit_number: string;
    reason: string;
    lease_start_date?: string;
    lease_end_date?: string;
  }>>([]);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentSlipModal, setShowPaymentSlipModal] = useState(false);
  const [showViewInvoiceModal, setShowViewInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<RentInvoice | null>(null);
  const [paymentType, setPaymentType] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentSlips, setPaymentSlips] = useState<File[]>([]);
  const [paymentSlipPreviews, setPaymentSlipPreviews] = useState<string[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<Record<string, unknown>[]>([]);
  const [paymentModes, setPaymentModes] = useState<Record<string, unknown>[]>([]);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (monthFilter) params.month = parseInt(monthFilter);
      if (yearFilter) params.year = parseInt(yearFilter);
      
      const response = await rentInvoicesAPI.getAll(params);
      setInvoices(response.data?.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, monthFilter, yearFilter]);

  useEffect(() => {
    fetchInvoices();
    fetchPaymentTypesAndModes();
  }, [fetchInvoices]);

  // Auto-refresh invoices every 60 seconds to catch status updates (reduced from 30 to improve performance)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInvoices();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchInvoices]);

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
    const tenantName = invoice.tenant?.full_name ? 
      invoice.tenant.full_name.toLowerCase() : 
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
    setTotalAmount(invoice.total_amount?.toString() || '');
    setPaymentSlips([]);
    setPaymentSlipPreviews([]);
    setShowPaymentModal(true);
  };

  // Multi-selection handlers
  const handleSelectInvoice = (invoiceId: number) => {
    setSelectedInvoices(prev => {
      const newSelection = prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allIds = invoices.map(invoice => invoice.id);
    setSelectedInvoices(allIds);
    setShowBulkActions(true);
  };

  const handleDeselectAll = () => {
    setSelectedInvoices([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedInvoices.length} invoices?`)) return;

    try {
      await Promise.all(selectedInvoices.map(id => rentInvoicesAPI.delete(id)));
      toast.success(`${selectedInvoices.length} invoices deleted successfully`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      fetchInvoices();
    } catch (error: unknown) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete some invoices');
    }
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedInvoices.length === 0) return;
    
    const selectedInvoiceData = invoices.filter(invoice => 
      selectedInvoices.includes(invoice.id)
    );
    
    if (!confirm(`Mark ${selectedInvoices.length} invoices as paid?`)) return;

    try {
      await Promise.all(selectedInvoiceData.map(invoice => 
        rentInvoicesAPI.markAsPaid(invoice.id, {
          payment_type: '1',
          payment_mode: '1',
          reference_number: `BULK-${Date.now()}`,
          notes: 'Bulk payment processing'
        })
      ));
      toast.success(`${selectedInvoices.length} invoices marked as paid`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      fetchInvoices();
    } catch (error: unknown) {
      console.error('Error marking invoices as paid:', error);
      toast.error('Failed to mark some invoices as paid');
    }
  };

  const handleBulkExport = () => {
    if (selectedInvoices.length === 0) return;
    
    const selectedData = invoices.filter(invoice => 
      selectedInvoices.includes(invoice.id)
    );
    
    // Create CSV content
    const headers = ['ID', 'Invoice Number', 'Tenant', 'Property', 'Unit', 'Amount', 'Status', 'Due Date'];
    const csvContent = [
      headers.join(','),
      ...selectedData.map(invoice => [
        invoice.id,
        invoice.invoice_number,
        invoice.tenant?.full_name || 'N/A',
        invoice.property?.name || 'N/A',
        invoice.rental_unit?.unit_number || 'N/A',
        invoice.total_amount,
        invoice.status,
        new Date(invoice.due_date).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rent-invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${selectedInvoices.length} invoices to CSV`);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];

    files.forEach(file => {
      // Check file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`File ${file.name} is not supported. Please upload only images or PDF files.`);
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Maximum size is 5MB.`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          setPaymentSlipPreviews(prev => [...prev, preview]);
        };
        reader.readAsDataURL(file);
      }
    });

    if (validFiles.length > 0) {
      setPaymentSlips(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} file(s) added successfully`);
      console.log('Files added to paymentSlips:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    }

    // Reset the input
    event.target.value = '';
  };

  const removePaymentSlip = (index: number) => {
    setPaymentSlips(prev => prev.filter((_, i) => i !== index));
    setPaymentSlipPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmPayment = async () => {
    if (!selectedInvoice) return;
    
    if (!paymentType || !paymentMode || !totalAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('payment_type', paymentType);
      formData.append('payment_mode', paymentMode);
      formData.append('reference_number', referenceNumber);
      formData.append('notes', paymentNotes);
      formData.append('total_amount', totalAmount);
      formData.append('payment_date', new Date().toISOString().split('T')[0]);
      
      // Append all payment slip files
      paymentSlips.forEach((file, index) => {
        formData.append(`payment_slip_${index}`, file);
      });

      await rentInvoicesAPI.markAsPaid(selectedInvoice.id, formData);
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

      // Store skipped tenants information
      if (response.data.skipped_tenants) {
        setSkippedTenants(response.data.skipped_tenants);
      }

      if (response.data.generated_count > 0) {
        let message = `Successfully generated ${response.data.generated_count} invoices`;
        
        // Add information about skipped tenants if any
        if (response.data.skipped_count > 0) {
          message += ` (${response.data.skipped_count} tenants skipped due to lease period)`;
        }
        
        toast.success(message);
        setShowGenerateModal(false);
        fetchInvoices(); // Refresh the invoices list
      } else {
        let message = 'No Invoice Pending - All invoices for the selected period have already been generated';
        
        // Add information about skipped tenants if any
        if (response.data.skipped_count > 0) {
          message += ` (${response.data.skipped_count} tenants skipped due to lease period)`;
        }
        
        toast(message, {
          icon: 'ℹ️',
          duration: 4000,
        });
        setShowGenerateModal(false);
      }

    } catch (error: unknown) {
      console.error('Error generating invoices:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : 'Failed to generate invoices';
      toast.error(errorMessage || 'Failed to generate invoices');
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

  const formatCurrency = (amount: number | undefined | null, currency: string = 'MVR') => {
    // Handle undefined, null, or NaN values
    if (amount === undefined || amount === null || isNaN(amount)) {
      return currency === 'MVR' ? 'MVR 0' : '$0';
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MVR' ? 'USD' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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
      <div className="space-y-8 w-full -mx-6 px-6">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rent Invoices</h1>
            <p className="mt-2 text-gray-600">
              Manage rent invoices and payment status
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchInvoices}
              variant="outline"
              className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="h-4 w-4" />
              Generate Monthly Rent Invoices
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="h-full">
            <CardContent className="p-4 h-full flex items-center">
              <div className="flex items-center w-full">
                <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardContent className="p-4 h-full flex items-center">
              <div className="flex items-center w-full">
                <Clock className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'pending').length}
                  </p>
                  <p className="text-xs text-yellow-600 font-medium">
                    {formatCurrency(
                      invoices
                        .filter(inv => inv.status === 'pending')
                        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0),
                      'MVR'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardContent className="p-4 h-full flex items-center">
              <div className="flex items-center w-full">
                <CheckCircle className="h-8 w-8 text-green-500 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'paid').length}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    {formatCurrency(
                      invoices
                        .filter(inv => inv.status === 'paid')
                        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0),
                      'MVR'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardContent className="p-4 h-full flex items-center">
              <div className="flex items-center w-full">
                <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {invoices.filter(inv => inv.status === 'overdue' || isOverdue(inv.due_date, inv.status)).length}
                  </p>
                  <p className="text-xs text-red-600 font-medium">
                    {formatCurrency(
                      invoices
                        .filter(inv => inv.status === 'overdue' || isOverdue(inv.due_date, inv.status))
                        .reduce((sum, inv) => sum + (parseFloat(inv.total_amount?.toString() || '0') || 0), 0),
                      'MVR'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="w-full">
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
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
              
              <Button 
                variant="outline" 
                onClick={fetchInvoices}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <RefreshCw className="h-4 w-4" />
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
          <Card className="w-full bg-white border border-gray-200">
            <CardContent className="p-0">
              {/* Bulk Actions */}
              {showBulkActions && (
                <div className="p-4 bg-blue-50 border-b border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-800">
                        {selectedInvoices.length} invoice{selectedInvoices.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeselectAll}
                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkExport}
                        className="text-green-600 border-green-300 hover:bg-green-100"
                      >
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkMarkAsPaid}
                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                      >
                        Mark as Paid
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDelete}
                        className="text-red-600 border-red-300 hover:bg-red-100"
                      >
                        Delete Selected
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <table className="w-full table-auto">
                  <colgroup>
                    <col style={{ width: '15%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '15%' }} />
                  </colgroup>
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                          onChange={selectedInvoices.length === invoices.length ? handleDeselectAll : handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-2 py-2 align-top">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => handleSelectInvoice(invoice.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(invoice.invoice_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top truncate">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900 whitespace-nowrap truncate">
                              {invoice.tenant?.full_name || 'No Tenant'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top truncate">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-600 whitespace-nowrap truncate">
                              {invoice.property?.name || 'Unknown'} - Unit {invoice.rental_unit?.unit_number || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(invoice.total_amount, invoice.currency)}
                          </div>
                          {invoice.late_fee && invoice.late_fee > 0 && (
                            <div className="text-xs text-red-500">
                              +{formatCurrency(invoice.late_fee, invoice.currency)} late fee
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="text-sm text-gray-600">
                            {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-top text-center">
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1">{invoice.status}</span>
                          </span>
                        </td>
                        <td className="px-2 py-2 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {invoice.status === 'pending' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleMarkAsPaid(invoice)}
                                className="h-9 w-9 p-0 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title="Mark as Paid"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {invoice.status === 'paid' && invoice.payment_slip_files && invoice.payment_slip_files.split(',').length > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => {
                                  if (invoice.payment_slip_files && invoice.payment_slip_files.split(',').length === 1) {
                                    window.open(`/api/rent-invoices/${invoice.id}/payment-slip`, '_blank');
                                  } else {
                                    // Show modal with multiple files
                                    setSelectedInvoice(invoice);
                                    setShowPaymentSlipModal(true);
                                  }
                                }}
                                className="h-9 w-9 p-0 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                                title={`View Payment Slip${invoice.payment_slip_files && invoice.payment_slip_files.split(',').length > 1 ? 's' : ''} (${invoice.payment_slip_files?.split(',').length || 0})`}
                              >
                                <FileImage className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowViewInvoiceModal(true);
                              }}
                              className="h-9 w-9 p-0 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
                              title="View Invoice"
                            >
                              <Receipt className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="h-9 w-9 p-0 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
              {searchTerm || statusFilter || monthFilter ? 'Try adjusting your search filters.' : 'Get started by generating monthly invoices.'}
            </p>
          </div>
        )}

        {/* Generation Modal */}
        {showGenerateModal && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => {
              setShowGenerateModal(false);
              setSkippedTenants([]);
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
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
                
                {/* Skipped Tenants Information */}
                {skippedTenants.length > 0 && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="text-sm font-medium text-yellow-800">
                        Skipped Tenants ({skippedTenants.length})
                      </h4>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {skippedTenants.map((tenant, index) => (
                        <div key={index} className="text-sm text-yellow-700">
                          <div className="font-medium">
                            {tenant.tenant_name} - Unit {tenant.unit_number}
                          </div>
                          <div className="text-yellow-600">
                            {tenant.reason}
                            {tenant.lease_start_date && (
                              <span> (Lease starts: {tenant.lease_start_date})</span>
                            )}
                            {tenant.lease_end_date && (
                              <span> (Lease ends: {tenant.lease_end_date})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGenerateModal(false);
                    setSkippedTenants([]);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateInvoices}
                  disabled={generating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate Rent Invoices
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
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowPaymentModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4"
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
                  Invoice: {selectedInvoice.invoice_number} - {selectedInvoice.tenant?.full_name || 'No Tenant'}
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
                      Total Amount *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter total amount paid"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                    />
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
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Slips (Optional)
                    </label>
                    {(() => {
                      // Check if selected payment mode is bank transfer
                      const selectedMode = paymentModes.find(mode => String(mode.id) === paymentMode);
                      const isBankTransfer = selectedMode && 
                        (String(selectedMode.name).toLowerCase().includes('bank') || 
                         String(selectedMode.name).toLowerCase().includes('transfer') ||
                         String(selectedMode.name).toLowerCase().includes('wire'));
                      
                      if (!isBankTransfer) {
                        return (
                          <div className="text-sm text-gray-500 italic">
                            Payment slips are only available for bank transfer payments
                          </div>
                        );
                      }
                      
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center w-full">
                            <label htmlFor="payment-slip-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> payment slips
                                </p>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB each) - Multiple files allowed</p>
                              </div>
                              <input 
                                id="payment-slip-upload" 
                                type="file" 
                                className="hidden" 
                                accept="image/*,.pdf"
                                multiple
                                onChange={handleFileUpload}
                              />
                            </label>
                          </div>
                          
                          {paymentSlips.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">
                                Uploaded Files ({paymentSlips.length}):
                              </p>
                              {paymentSlips.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <FileImage className="h-5 w-5 text-blue-500" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                      <p className="text-xs text-gray-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removePaymentSlip(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {paymentSlipPreviews.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-gray-700 mb-2">Previews:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {paymentSlipPreviews.map((preview, index) => (
                                  <Image 
                                    key={index}
                                    src={preview} 
                                    alt={`Payment slip preview ${index + 1}`} 
                                    width={200}
                                    height={128}
                                    className="max-w-full h-32 object-contain border rounded-lg"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                >
                  <CheckCircle className="h-4 w-4" />
                  Mark as Paid
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Slip Modal */}
        {showPaymentSlipModal && selectedInvoice && (
          <div 
            className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowPaymentSlipModal(false)}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileImage className="h-6 w-6 text-purple-600 mr-3" />
                    <h3 className="text-lg font-medium text-gray-900">
                      Payment Slips - {selectedInvoice.invoice_number}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowPaymentSlipModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedInvoice.tenant?.full_name || 'No Tenant'} - {selectedInvoice.payment_slip_files?.split(',').length || 0} file(s)
                </p>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedInvoice.payment_slip_files?.split(',').map((_, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          Payment Slip {index + 1}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/rent-invoices/${selectedInvoice.id}/payment-slip/${index}`, '_blank')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500">
                        Click &quot;View&quot; to open in new tab
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentSlipModal(false)}
                  className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* View Invoice Modal */}
        {showViewInvoiceModal && selectedInvoice && (
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
                      Invoice Details - {selectedInvoice.invoice_number}
                    </h3>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowViewInvoiceModal(false)}
                    className="h-9 w-9 p-0 rounded-lg border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Close"
                  >
                    <X className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                  </Button>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Invoice Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Invoice Number:</span>
                        <span className="text-sm text-gray-900">{selectedInvoice.invoice_number}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Invoice Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Due Date:</span>
                        <span className="text-sm text-gray-900">
                          {new Date(selectedInvoice.due_date).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          selectedInvoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                        </span>
                      </div>
                      
                      {selectedInvoice.paid_date && (
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-gray-600">Paid Date:</span>
                          <span className="text-sm text-gray-900">
                            {new Date(selectedInvoice.paid_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Financial Details</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Rent Amount:</span>
                        <span className="text-sm text-gray-900">
                          {selectedInvoice.currency} {selectedInvoice.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Late Fee:</span>
                        <span className="text-sm text-gray-900">
                          {selectedInvoice.currency} {selectedInvoice.late_fee?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-bold text-gray-900">Total Amount:</span>
                        <span className="text-sm font-bold text-gray-900">
                          {selectedInvoice.currency} {selectedInvoice.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tenant Information */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Tenant Information</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Tenant Name:</span>
                        <span className="text-sm text-gray-900">
                          {selectedInvoice.tenant?.full_name || 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Property:</span>
                        <span className="text-sm text-gray-900">{selectedInvoice.property?.name || 'N/A'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">Unit Number:</span>
                        <span className="text-sm text-gray-900">{selectedInvoice.rental_unit?.unit_number || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  {selectedInvoice.status === 'paid' && selectedInvoice.payment_details && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Payment Information</h4>
                      
                      <div className="space-y-3">
                        {(() => {
                          const paymentDetails = selectedInvoice.payment_details as PaymentDetails;
                          return (
                            <>
                              {paymentDetails.payment_type && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium text-gray-600">Payment Type:</span>
                                  <span className="text-sm text-gray-900">{paymentDetails.payment_type}</span>
                                </div>
                              )}
                              
                              {paymentDetails.payment_mode && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium text-gray-600">Payment Mode:</span>
                                  <span className="text-sm text-gray-900">{paymentDetails.payment_mode}</span>
                                </div>
                              )}
                              
                              {paymentDetails.reference_number && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium text-gray-600">Reference Number:</span>
                                  <span className="text-sm text-gray-900">{paymentDetails.reference_number}</span>
                                </div>
                              )}
                              
                              {paymentDetails.notes && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium text-gray-600">Notes:</span>
                                  <span className="text-sm text-gray-900">{paymentDetails.notes}</span>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="md:col-span-2 space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                        {selectedInvoice.notes}
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
