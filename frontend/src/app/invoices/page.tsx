'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { FileText, Search, Trash2, Eye, User, Building, CheckCircle, Clock, AlertCircle, Receipt, RefreshCw, X, Printer, Download } from 'lucide-react';
import { rentInvoicesAPI, paymentTypesAPI, tenantLedgerAPI, maintenanceInvoicesAPI, invoiceTemplatesAPI, InvoiceTemplate, RentInvoice, PaymentType, TenantLedger, MaintenanceInvoice } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Unified invoice interface for displaying all invoice types
interface UnifiedInvoice {
  id: number;
  invoice_number: string;
  invoice_type: 'rent' | 'maintenance' | 'ledger';
  tenant_name: string;
  tenant_unit: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  payment_type?: string;
  created_at: string;
  updated_at: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<UnifiedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  
  // Multi-selection state
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Payment types state
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  
  // View modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<UnifiedInvoice | null>(null);
  const [selectedMaintenanceInvoice, setSelectedMaintenanceInvoice] = useState<MaintenanceInvoice | null>(null);
  const [selectedRentInvoice, setSelectedRentInvoice] = useState<RentInvoice | null>(null);
  const [invoiceTemplate, setInvoiceTemplate] = useState<InvoiceTemplate | null>(null);
  const [renderedInvoiceHtml, setRenderedInvoiceHtml] = useState<string>('');
  const invoicePrintRef = useRef<HTMLDivElement>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch rent invoices, tenant ledger entries, maintenance invoices, and payment types in parallel
      const [rentInvoicesRes, tenantLedgerRes, maintenanceInvoicesRes, paymentTypesRes] = await Promise.all([
        rentInvoicesAPI.getAll({}),
        tenantLedgerAPI.getAll({}),
        maintenanceInvoicesAPI.getAll({}),
        paymentTypesAPI.getAll({})
      ]);

      const rentInvoices: RentInvoice[] = rentInvoicesRes.data?.invoices || [];
      const tenantLedgers: TenantLedger[] = tenantLedgerRes.data?.data?.data || tenantLedgerRes.data?.data || [];
      const maintenanceInvoices: MaintenanceInvoice[] = maintenanceInvoicesRes.data?.maintenance_invoices || [];
      const fetchedPaymentTypes: PaymentType[] = paymentTypesRes.data?.data?.data || paymentTypesRes.data?.data || [];

      // Transform rent invoices to unified format
      const unifiedRentInvoices: UnifiedInvoice[] = rentInvoices.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_type: 'rent' as const,
        tenant_name: invoice.tenant?.full_name || 'No Tenant',
        tenant_unit: invoice.rental_unit ? `${invoice.property?.name || 'Unknown'} - Unit ${invoice.rental_unit.unit_number}` : 'No Unit',
        status: invoice.status,
        amount: invoice.total_amount,
        currency: invoice.currency,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        payment_type: 'Rent',
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
      }));


      // Get rent invoice numbers to avoid duplicates
      const rentInvoiceNumbers = new Set(rentInvoices.map(invoice => invoice.invoice_number));
      const maintenanceInvoiceNumbers = new Set(maintenanceInvoices.map(invoice => invoice.invoice_number));

      // Transform maintenance invoices to unified format
      const unifiedMaintenanceInvoices: UnifiedInvoice[] = maintenanceInvoices.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_type: 'maintenance' as const,
        tenant_name: invoice.tenant?.full_name || 'No Tenant',
        tenant_unit: invoice.rental_unit ? `${invoice.property?.name || 'Unknown'} - Unit ${invoice.rental_unit.unit_number}` : 'No Unit',
        status: invoice.status,
        amount: invoice.total_amount,
        currency: invoice.currency,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        payment_type: 'Maintenance Invoice',
        created_at: invoice.created_at,
        updated_at: invoice.updated_at,
      }));

      // Transform tenant ledger entries to unified format (for all payment types)
      const unifiedLedgerInvoices: UnifiedInvoice[] = tenantLedgers
        .filter(ledger => 
          ledger.debit_amount > 0 && // Only show debit entries (charges/invoices)
          !rentInvoiceNumbers.has(ledger.reference_no || '') && // Exclude rent invoices already shown
          !maintenanceInvoiceNumbers.has(ledger.reference_no || '') // Exclude maintenance invoices already shown
        )
        .map(ledger => ({
          id: ledger.ledger_id,
          invoice_number: ledger.reference_no || `LEDGER-${ledger.ledger_id}`,
          invoice_type: 'ledger' as const,
          tenant_name: ledger.tenant?.full_name || 'No Tenant',
          tenant_unit: ledger.rental_unit ? 
            `${ledger.rental_unit.property?.name || 'Unknown'} - Unit ${ledger.rental_unit.unit_number}` : 
            'No Unit',
          status: ledger.credit_amount > 0 ? 'paid' as const : 'pending' as const,
          amount: ledger.debit_amount,
          currency: 'MVR', // Default currency
          invoice_date: ledger.transaction_date?.split('T')[0] || ledger.created_at.split('T')[0],
          due_date: ledger.transaction_date?.split('T')[0] || ledger.created_at.split('T')[0],
          payment_type: ledger.payment_type?.name || 'Unknown',
          created_at: ledger.created_at,
          updated_at: ledger.updated_at,
        }));

      // Combine and sort by date (newest first)
      const allInvoices = [...unifiedRentInvoices, ...unifiedMaintenanceInvoices, ...unifiedLedgerInvoices];
      allInvoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setInvoices(allInvoices);
      setPaymentTypes(fetchedPaymentTypes);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleViewInvoice = async (invoice: UnifiedInvoice) => {
    try {
      setSelectedInvoiceForView(invoice);
      
      let detailedInvoice: RentInvoice | MaintenanceInvoice | null = null;
      
      if (invoice.invoice_type === 'maintenance') {
        const response = await maintenanceInvoicesAPI.getById(invoice.id);
        detailedInvoice = response.data.maintenance_invoice;
        setSelectedMaintenanceInvoice(detailedInvoice);
      } else if (invoice.invoice_type === 'rent') {
        const response = await rentInvoicesAPI.getById(invoice.id);
        detailedInvoice = response.data.invoice;
        setSelectedRentInvoice(detailedInvoice);
      }
      
      // Fetch default template for the invoice type
      const templateType = invoice.invoice_type === 'maintenance' ? 'maintenance' : 'rent';
      const templatesResponse = await invoiceTemplatesAPI.getAll({ type: templateType, is_active: true });
      const templates = templatesResponse.data.templates || [];
      const defaultTemplate = templates.find((t: InvoiceTemplate) => t.is_default) || templates[0] || null;
      
      setInvoiceTemplate(defaultTemplate);
      
      // Render invoice with template after both invoice and template are loaded
      if (defaultTemplate && detailedInvoice) {
        const renderedHtml = renderInvoiceWithTemplate(invoice, defaultTemplate, detailedInvoice);
        setRenderedInvoiceHtml(renderedHtml);
      }
      
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to fetch invoice details');
    }
  };

  const renderInvoiceWithTemplate = (invoice: UnifiedInvoice, template: InvoiceTemplate, detailedInvoice: RentInvoice | MaintenanceInvoice): string => {
    let html = template.html_content || '';
    
    // Get invoice data based on type
    const invoiceData = getInvoiceData(invoice, detailedInvoice);
    
    // Replace variables in template
    Object.keys(invoiceData).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, invoiceData[key]);
    });
    
    // Remove conditional blocks that don't apply
    html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
      if (invoiceData[condition] && invoiceData[condition] !== '0' && invoiceData[condition] !== '') {
        return content;
      }
      return '';
    });
    
    return html;
  };

  const getInvoiceData = (invoice: UnifiedInvoice, detailedInvoice: RentInvoice | MaintenanceInvoice): Record<string, string> => {
    const invoiceData: Record<string, string> = {};
    
    // Common invoice data
    invoiceData.invoice_number = invoice.invoice_number || '';
    invoiceData.invoice_date = new Date(invoice.invoice_date).toLocaleDateString();
    invoiceData.due_date = new Date(invoice.due_date).toLocaleDateString();
    invoiceData.status = invoice.status || 'pending';
    invoiceData.currency = invoice.currency || 'MVR';
    invoiceData.total_amount = invoice.amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
    invoiceData.tenant_name = invoice.tenant_name || '';
    
    // Extract property and unit from tenant_unit string
    const unitMatch = invoice.tenant_unit.match(/(.+?)\s*-\s*Unit\s*(.+)/);
    if (unitMatch) {
      invoiceData.property_name = unitMatch[1] || '';
      invoiceData.unit_number = unitMatch[2] || '';
    } else {
      invoiceData.property_name = invoice.tenant_unit || '';
      invoiceData.unit_number = '';
    }
    
    // Get detailed invoice data
    if (invoice.invoice_type === 'rent' && 'total_amount' in detailedInvoice) {
      const rentInvoice = detailedInvoice as RentInvoice;
      invoiceData.rent_amount = rentInvoice.total_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
      invoiceData.late_fee = rentInvoice.late_fee?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
      invoiceData.company_name = rentInvoice.property?.name || 'Company Name';
      invoiceData.company_address = rentInvoice.property?.address || '';
      invoiceData.company_email = '';
      invoiceData.company_phone = '';
      invoiceData.due_days = '30';
    } else if (invoice.invoice_type === 'maintenance' && 'maintenance_amount' in detailedInvoice) {
      const maintenanceInvoice = detailedInvoice as MaintenanceInvoice;
      invoiceData.maintenance_amount = maintenanceInvoice.maintenance_amount?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
      invoiceData.company_name = maintenanceInvoice.property?.name || 'Company Name';
      invoiceData.company_address = maintenanceInvoice.property?.address || '';
      invoiceData.company_email = '';
      invoiceData.company_phone = '';
      invoiceData.due_days = '30';
    }
    
    return invoiceData;
  };

  const handlePrint = () => {
    let contentToPrint = '';
    
    if (invoicePrintRef.current) {
      contentToPrint = invoicePrintRef.current.innerHTML;
    } else if (renderedInvoiceHtml) {
      contentToPrint = renderedInvoiceHtml;
    } else {
      toast.error('Invoice content not available. Please wait for the invoice to load.');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${selectedInvoiceForView?.invoice_number || 'Invoice'}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            @media print {
              @page { margin: 0.5cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${contentToPrint}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    let tempElement: HTMLElement | null = null;
    
    try {
      toast.loading('Generating PDF...', { id: 'pdf-export' });
      
      // Wait a bit for the DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let elementToCapture: HTMLElement | null = null;
      
      // Try to use the ref first
      if (invoicePrintRef.current) {
        elementToCapture = invoicePrintRef.current;
      } else if (renderedInvoiceHtml) {
        // If ref is not available but we have HTML, create a temporary element
        tempElement = document.createElement('div');
        tempElement.innerHTML = renderedInvoiceHtml;
        tempElement.style.position = 'absolute';
        tempElement.style.left = '-9999px';
        tempElement.style.top = '0';
        tempElement.style.width = '800px';
        tempElement.style.backgroundColor = '#ffffff';
        tempElement.style.padding = '20px';
        document.body.appendChild(tempElement);
        elementToCapture = tempElement;
        
        // Wait for the element to be rendered
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        toast.error('Invoice content not available. Please wait for the invoice to load.', { id: 'pdf-export' });
        return;
      }
      
      if (!elementToCapture) {
        toast.error('Could not find invoice content to generate PDF.', { id: 'pdf-export' });
        return;
      }
      
      // Ensure element is visible for html2canvas
      const originalDisplay = elementToCapture.style.display;
      const originalVisibility = elementToCapture.style.visibility;
      const originalPosition = elementToCapture.style.position;
      const originalLeft = elementToCapture.style.left;
      const originalTop = elementToCapture.style.top;
      const originalZIndex = elementToCapture.style.zIndex;
      
      // Make element visible for capture
      elementToCapture.style.display = 'block';
      elementToCapture.style.visibility = 'visible';
      if (tempElement) {
        elementToCapture.style.position = 'absolute';
        elementToCapture.style.left = '0';
        elementToCapture.style.top = '0';
        elementToCapture.style.zIndex = '9999';
      }
      
      // Wait a bit more for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Capturing element for PDF:', {
        width: elementToCapture.offsetWidth || elementToCapture.scrollWidth,
        height: elementToCapture.offsetHeight || elementToCapture.scrollHeight,
        scrollWidth: elementToCapture.scrollWidth,
        scrollHeight: elementToCapture.scrollHeight,
        clientWidth: elementToCapture.clientWidth,
        clientHeight: elementToCapture.clientHeight
      });
      
      // Check if element has valid dimensions
      const elementWidth = elementToCapture.offsetWidth || elementToCapture.scrollWidth || elementToCapture.clientWidth;
      const elementHeight = elementToCapture.offsetHeight || elementToCapture.scrollHeight || elementToCapture.clientHeight;
      
      if (!elementWidth || !elementHeight || elementWidth === 0 || elementHeight === 0) {
        // Restore styles
        elementToCapture.style.display = originalDisplay;
        elementToCapture.style.visibility = originalVisibility;
        elementToCapture.style.position = originalPosition;
        elementToCapture.style.left = originalLeft;
        elementToCapture.style.top = originalTop;
        elementToCapture.style.zIndex = originalZIndex;
        
        toast.error('Invoice content has no dimensions. Please ensure the invoice is fully loaded.', { id: 'pdf-export' });
        return;
      }
      
      const canvas = await html2canvas(elementToCapture, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: false,
        removeContainer: false,
        windowWidth: elementWidth,
        windowHeight: elementHeight,
      });
      
      // Restore original styles
      elementToCapture.style.display = originalDisplay;
      elementToCapture.style.visibility = originalVisibility;
      elementToCapture.style.position = originalPosition;
      elementToCapture.style.left = originalLeft;
      elementToCapture.style.top = originalTop;
      elementToCapture.style.zIndex = originalZIndex;
      
      console.log('Canvas created:', {
        width: canvas.width,
        height: canvas.height
      });
      
      // Clean up temporary element if we created one
      if (tempElement && tempElement.parentNode) {
        document.body.removeChild(tempElement);
        tempElement = null;
      }
      
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        toast.error('Failed to capture invoice content. The invoice might be empty.', { id: 'pdf-export' });
        return;
      }
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      if (!imgData || imgData === 'data:,') {
        toast.error('Failed to convert invoice to image.', { id: 'pdf-export' });
        return;
      }
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Invoice-${selectedInvoiceForView?.invoice_number || 'Invoice'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully', { id: 'pdf-export' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      
      // Clean up temporary element if it exists
      if (tempElement && tempElement.parentNode) {
        try {
          document.body.removeChild(tempElement);
        } catch (e) {
          console.error('Error removing temp element:', e);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate PDF: ${errorMessage}`, { id: 'pdf-export', duration: 5000 });
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Auto-refresh invoices every 60 seconds (reduced from 30 to improve performance)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInvoices();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fetchInvoices]);

  // Re-render invoice when template or invoice data changes
  useEffect(() => {
    if (invoiceTemplate && selectedInvoiceForView && (selectedRentInvoice || selectedMaintenanceInvoice)) {
      const detailedInvoice = selectedRentInvoice || selectedMaintenanceInvoice;
      if (detailedInvoice) {
        const renderedHtml = renderInvoiceWithTemplate(selectedInvoiceForView, invoiceTemplate, detailedInvoice);
        setRenderedInvoiceHtml(renderedHtml);
      }
    }
  }, [invoiceTemplate, selectedInvoiceForView, selectedRentInvoice, selectedMaintenanceInvoice]);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = !searchTerm || 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant_unit.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    const matchesType = !typeFilter || invoice.invoice_type === typeFilter;
    const matchesPaymentType = !paymentTypeFilter || invoice.payment_type === paymentTypeFilter;
    
    const invoiceDate = new Date(invoice.invoice_date);
    const matchesMonth = !monthFilter || invoiceDate.getMonth() + 1 === parseInt(monthFilter);
    const matchesYear = !yearFilter || invoiceDate.getFullYear() === parseInt(yearFilter);

    return matchesSearch && matchesStatus && matchesType && matchesPaymentType && matchesMonth && matchesYear;
  });

  const handleSelectInvoice = (id: number) => {
    setSelectedInvoices(prev => {
      const newSelection = prev.includes(id) 
        ? prev.filter(invoiceId => invoiceId !== id)
        : [...prev, id];
      
      setShowBulkActions(newSelection.length > 0);
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    const allIds = filteredInvoices.map(invoice => invoice.id);
    setSelectedInvoices(allIds);
    setShowBulkActions(true);
  };

  const handleDeselectAll = () => {
    setSelectedInvoices([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedInvoices.length} invoice(s)? This action cannot be undone.`)) return;

    try {
      // Group selected invoices by type for deletion
      const selectedInvoicesData = selectedInvoices.map(id => {
        return invoices.find(invoice => invoice.id === id);
      }).filter(Boolean);

      const rentInvoicesToDelete = selectedInvoicesData.filter(invoice => invoice?.invoice_type === 'rent');
      const ledgerEntriesToDelete = selectedInvoicesData.filter(invoice => invoice?.invoice_type === 'ledger');

      // Delete rent invoices
      if (rentInvoicesToDelete.length > 0) {
        await Promise.all(rentInvoicesToDelete.map(invoice => 
          rentInvoicesAPI.delete(invoice!.id)
        ));
      }

      // Delete ledger entries
      if (ledgerEntriesToDelete.length > 0) {
        await Promise.all(ledgerEntriesToDelete.map(invoice => 
          tenantLedgerAPI.delete(invoice!.id)
        ));
      }

      toast.success(`${selectedInvoices.length} invoice(s) deleted successfully`);
      setSelectedInvoices([]);
      setShowBulkActions(false);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoices:', error);
      toast.error('Failed to delete some invoices');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
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

  const formatCurrency = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const stats = {
    total: invoices.length,
    pending: invoices.filter(inv => inv.status === 'pending').length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    overdue: invoices.filter(inv => inv.status === 'overdue').length,
    rent: invoices.filter(inv => inv.invoice_type === 'rent').length,
    maintenance: invoices.filter(inv => inv.invoice_type === 'maintenance').length,
  };

  return (
    <SidebarLayout>
      <div className="flex flex-col h-full w-full -mx-6 px-6 space-y-2 overflow-hidden">
        {/* Page Header */}
        <div className="mb-2 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="mt-1 text-gray-600 text-sm">
              View all invoices (Rent & Maintenance) in the system
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
              Refresh
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-shrink-0">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Total Invoices</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Pending</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Paid</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-gray-600">Overdue</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.overdue}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="flex-shrink-0">
          <CardContent className="p-2">
            <div className="flex gap-3 items-center">
              <div className="flex-1 min-w-48">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-32"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </Select>
              
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-32"
              >
                <option value="">All Types</option>
                <option value="rent">Rent</option>
                <option value="maintenance">Maintenance</option>
                <option value="ledger">Other Charges</option>
              </Select>
              
              <Select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
                className="w-36"
              >
                <option value="">All Payment Types</option>
                {paymentTypes.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.name}
                  </option>
                ))}
              </Select>
              
              <Select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="w-28"
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
                className="w-16"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {showBulkActions && (
          <Card className="flex-shrink-0">
            <CardContent className="p-3">
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
                    onClick={handleBulkDelete}
                    className="text-red-600 border-red-300 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-400 border-gray-300 cursor-not-allowed"
                    title="Bulk actions not available for unified invoices"
                  >
                    Export CSV (Disabled)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices Table */}
        <Card className="flex-1 overflow-hidden bg-white border border-gray-200">
          <CardContent className="p-0 h-full overflow-hidden">
            <div className="overflow-auto" style={{ height: 'calc(100vh - 320px)', maxHeight: 'calc(100vh - 320px)' }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.length === filteredInvoices.length && filteredInvoices.length > 0}
                        onChange={selectedInvoices.length === filteredInvoices.length ? handleDeselectAll : handleSelectAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant Rental Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="ml-2 text-gray-600">Loading invoices...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <div className="text-center">
                          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
                          <p className="text-gray-600">
                            {searchTerm || statusFilter || typeFilter || monthFilter || yearFilter !== new Date().getFullYear().toString()
                              ? 'Try adjusting your filters to see more results.'
                              : 'No invoices have been created yet.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <tr key={`${invoice.invoice_type}-${invoice.id}`} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.includes(invoice.id)}
                            onChange={() => handleSelectInvoice(invoice.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(invoice.invoice_date)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.invoice_type === 'rent' 
                              ? 'bg-blue-100 text-blue-800' 
                              : invoice.invoice_type === 'maintenance'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {invoice.payment_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-900">
                              {invoice.tenant_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Building className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-600">
                              {invoice.tenant_unit}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(invoice.amount, invoice.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {formatDate(invoice.due_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1 capitalize">{invoice.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewInvoice(invoice)}
                              className="text-blue-600 hover:text-blue-700"
                              title="View invoice details"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoiceForView && (
        <div 
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => {
            setShowViewModal(false);
            setInvoiceTemplate(null);
            setRenderedInvoiceHtml('');
            setSelectedRentInvoice(null);
            setSelectedMaintenanceInvoice(null);
          }}
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
                    Invoice Details - {selectedInvoiceForView.invoice_number}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className="flex items-center gap-2"
                    title="Print Invoice"
                  >
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2"
                    title="Download PDF"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowViewModal(false);
                      setInvoiceTemplate(null);
                      setRenderedInvoiceHtml('');
                      setSelectedRentInvoice(null);
                      setSelectedMaintenanceInvoice(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4">
              <div ref={invoicePrintRef} className="bg-white">
                {invoiceTemplate && renderedInvoiceHtml ? (
                  <div 
                    className="bg-white"
                    dangerouslySetInnerHTML={{ __html: renderedInvoiceHtml }}
                  />
                ) : selectedInvoiceForView.invoice_type === 'maintenance' && selectedMaintenanceInvoice ? (
                <div className="space-y-6">
                  {/* Invoice Header */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Invoice Information</h4>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Invoice Number</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.invoice_number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Invoice Date</dt>
                          <dd className="text-sm text-gray-600">{new Date(selectedMaintenanceInvoice.invoice_date).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Due Date</dt>
                          <dd className="text-sm text-gray-600">{new Date(selectedMaintenanceInvoice.due_date).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Status</dt>
                          <dd className="text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              selectedMaintenanceInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              selectedMaintenanceInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              selectedMaintenanceInvoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedMaintenanceInvoice.status}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tenant Information</h4>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Tenant Name</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.tenant?.full_name || 'No Tenant'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Property</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.property?.name || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Unit</dt>
                          <dd className="text-sm text-gray-600">Unit {selectedMaintenanceInvoice.rental_unit?.unit_number || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Asset</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.rental_unit_asset?.asset?.name || 'Unknown'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Maintenance Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Maintenance Details</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Description</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.description || 'No description'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Repair Provider</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.repair_provider || 'Not specified'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Repair Date</dt>
                          <dd className="text-sm text-gray-600">
                            {selectedMaintenanceInvoice.repair_date ? new Date(selectedMaintenanceInvoice.repair_date).toLocaleDateString() : 'Not specified'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Notes</dt>
                          <dd className="text-sm text-gray-600">{selectedMaintenanceInvoice.notes || 'No notes'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Amount Details</h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Maintenance Amount</dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {selectedMaintenanceInvoice.currency} {selectedMaintenanceInvoice.maintenance_amount?.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Total Amount</dt>
                          <dd className="text-lg font-semibold text-blue-600">
                            {selectedMaintenanceInvoice.currency} {selectedMaintenanceInvoice.total_amount?.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ) : selectedInvoiceForView.invoice_type === 'rent' && selectedRentInvoice ? (
                <div className="space-y-6">
                  {/* Rent Invoice Details */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Invoice Information</h4>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Invoice Number</dt>
                          <dd className="text-sm text-gray-600">{selectedRentInvoice.invoice_number}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Invoice Date</dt>
                          <dd className="text-sm text-gray-600">{new Date(selectedRentInvoice.invoice_date).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Due Date</dt>
                          <dd className="text-sm text-gray-600">{new Date(selectedRentInvoice.due_date).toLocaleDateString()}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Status</dt>
                          <dd className="text-sm">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              selectedRentInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                              selectedRentInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              selectedRentInvoice.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedRentInvoice.status}
                            </span>
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Tenant Information</h4>
                      <dl className="mt-2 space-y-1">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Tenant Name</dt>
                          <dd className="text-sm text-gray-600">{selectedRentInvoice.tenant?.full_name || 'No Tenant'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Property</dt>
                          <dd className="text-sm text-gray-600">{selectedRentInvoice.property?.name || 'Unknown'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Unit</dt>
                          <dd className="text-sm text-gray-600">Unit {selectedRentInvoice.rental_unit?.unit_number || 'Unknown'}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Amount Details</h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Rent Amount</dt>
                          <dd className="text-lg font-semibold text-gray-900">
                            {selectedRentInvoice.currency} {selectedRentInvoice.total_amount?.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Total Amount</dt>
                          <dd className="text-lg font-semibold text-blue-600">
                            {selectedRentInvoice.currency} {selectedRentInvoice.total_amount?.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Invoice details not available for this type.</p>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
