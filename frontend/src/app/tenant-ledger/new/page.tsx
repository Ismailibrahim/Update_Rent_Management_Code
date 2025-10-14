'use client';

import React, { useState, useEffect } from 'react';
import { tenantLedgerAPI, tenantsAPI, paymentTypesAPI, rentInvoicesAPI, maintenanceCostsAPI, rentalUnitsAPI, Tenant, PaymentType, RentInvoice, MaintenanceCost, RentalUnit } from '@/services/api';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { FormSection } from '@/components/UI/FormSection';
import { Textarea } from '@/components/UI/Textarea';
import { ArrowLeft, Save, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import SidebarLayout from '../../../components/Layout/SidebarLayout';

// MaintenanceCost interface is now imported from @/services/api

// RentInvoice interface is now imported from @/services/api

interface TenantLedgerFormData {
  tenant_id: number;
  payment_type_id: number;
  transaction_date: string;
  description: string;
  reference_no?: string;
  debit_amount: number;
  credit_amount: number;
  payment_method?: string;
  transfer_reference_no?: string;
  remarks?: string;
  created_by?: string;
}

export default function NewTenantLedgerPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<RentInvoice[]>([]);
  const [unpaidMaintenanceCosts, setUnpaidMaintenanceCosts] = useState<MaintenanceCost[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [selectedMaintenanceCosts, setSelectedMaintenanceCosts] = useState<number[]>([]);
  const [currentInvoiceType, setCurrentInvoiceType] = useState<'rent' | 'maintenance' | null>(null);
  const [paymentTypeLocked, setPaymentTypeLocked] = useState(false);
  const [showInvoiceTypeModal, setShowInvoiceTypeModal] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<number | null>(null);
  const [selectedRentalUnitId, setSelectedRentalUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TenantLedgerFormData>({
    tenant_id: 0,
    payment_type_id: 0,
    transaction_date: new Date().toISOString().slice(0, 10), // Changed to date only
    description: '',
    reference_no: '',
    debit_amount: 0,
    credit_amount: 0,
    payment_method: '',
    transfer_reference_no: '',
    remarks: '',
    created_by: 'Admin',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('Loading tenants and payment types...');
      const [tenantsRes, paymentTypesRes] = await Promise.all([
        tenantsAPI.getAll(),
        paymentTypesAPI.getAll(),
      ]);

      console.log('Tenants response:', tenantsRes.data);
      console.log('Payment types response:', paymentTypesRes.data);

      const tenantsData = tenantsRes.data?.tenants || [];
      const paymentTypesData = paymentTypesRes.data?.payment_types || [];

      console.log('Tenants data:', tenantsData);
      console.log('Payment types data:', paymentTypesData);

      setTenants(tenantsData);
      setPaymentTypes(paymentTypesData);
    } catch (error: unknown) {
      console.error('Error loading data:', error);
      const axiosError = error as { response?: { data?: unknown } };
      console.error('Error details:', axiosError.response?.data);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRentalUnits = async (tenantId: number) => {
    try {
      console.log('Fetching rental units for tenant:', tenantId);
      const response = await rentalUnitsAPI.getAll({ 
        tenant_id: tenantId, 
        status: 'occupied' 
      });
      console.log('Rental units response:', response.data);
      const units = response.data?.rentalUnits || response.data || [];
      console.log('Extracted units:', units);
      setRentalUnits(units);
      
      // If tenant has only one unit, auto-select it and show modal
      if (units.length === 1) {
        console.log('Auto-selecting single unit:', units[0].id);
        setSelectedRentalUnitId(units[0].id);
        console.log('Setting showInvoiceTypeModal to true');
        setShowInvoiceTypeModal(true);
        console.log('Modal should now be visible');
      } else if (units.length > 1) {
        console.log('Multiple units found, waiting for user selection');
      } else {
        console.log('No units found for tenant');
      }
    } catch (error) {
      console.error('Error fetching rental units:', error);
      setRentalUnits([]);
    }
  };

  const fetchUnpaidInvoices = async (tenantId: number, invoiceType: 'rent' | 'maintenance', rentalUnitId?: number) => {
    try {
      console.log('Fetching unpaid invoices for tenant:', tenantId, 'type:', invoiceType);
      
      if (invoiceType === 'rent') {
        // Fetch only rent invoices
        const params: Record<string, unknown> = { 
          tenant_id: tenantId, 
          status: 'pending,overdue' 
        };
        
        // Add rental unit filter if provided
        if (rentalUnitId) {
          params.rental_unit_id = rentalUnitId;
        }
        
        const rentResponse = await rentInvoicesAPI.getAll(params);
        
        console.log('Rent invoices response:', rentResponse.data);
        const rentInvoices = rentResponse.data.invoices || [];
        console.log('Rent invoices found:', rentInvoices.length);
        
        setUnpaidInvoices(rentInvoices);
        setUnpaidMaintenanceCosts([]); // Clear maintenance costs
        setCurrentInvoiceType('rent');
      } else {
        // Fetch only maintenance costs
        const maintenanceResponse = await maintenanceCostsAPI.getAll({
          // Note: This might need to be adjusted based on your API structure
          // You might need to fetch by rental unit or property instead
        });
        
        console.log('Maintenance costs response:', maintenanceResponse.data);
        const maintenanceCosts = maintenanceResponse.data.maintenance_costs || [];
        
        // Filter maintenance costs for this tenant (you might need to adjust this logic)
        const tenantMaintenanceCosts = maintenanceCosts.filter((cost: MaintenanceCost) => {
          // This logic might need adjustment based on your data structure
          return cost.rental_unit_asset?.rental_unit?.property?.id && 
                 cost.status === 'pending' || cost.status === 'unpaid';
        });
        
        console.log('Maintenance costs found:', tenantMaintenanceCosts.length);
        
        setUnpaidMaintenanceCosts(tenantMaintenanceCosts);
        setUnpaidInvoices([]); // Clear rent invoices
        setCurrentInvoiceType('maintenance');
      }
      
      setSelectedInvoices([]); // Reset selected invoices
      setSelectedMaintenanceCosts([]); // Reset selected maintenance costs
      // Don't unlock payment type here - it should remain locked when selected from popup
    } catch (error: unknown) {
      console.error('Error fetching unpaid invoices:', error);
      const axiosError = error as { response?: { data?: unknown } };
      console.error('Error details:', axiosError.response?.data);
      toast.error('Failed to load unpaid invoices');
      setUnpaidInvoices([]);
      setUnpaidMaintenanceCosts([]);
    }
  };

  const handleTenantChange = (tenantId: number) => {
    console.log('Tenant changed to:', tenantId);
    setFormData(prev => ({ ...prev, tenant_id: tenantId }));
    if (tenantId > 0) {
      console.log('Setting pendingTenantId to:', tenantId);
      setPendingTenantId(tenantId);
      setSelectedRentalUnitId(null);
      console.log('Fetching rental units for tenant:', tenantId);
      fetchRentalUnits(tenantId);
    } else {
      console.log('Clearing invoices and unlocking payment type');
      setRentalUnits([]);
      setUnpaidInvoices([]);
      setUnpaidMaintenanceCosts([]);
      setSelectedInvoices([]);
      setSelectedMaintenanceCosts([]);
      setCurrentInvoiceType(null);
      setPaymentTypeLocked(false); // Only unlock when tenant is cleared
      setPendingTenantId(null);
    }
  };

  const handleRentalUnitChange = (rentalUnitId: number) => {
    console.log('Rental unit changed to:', rentalUnitId);
    console.log('Current pendingTenantId:', pendingTenantId);
    setSelectedRentalUnitId(rentalUnitId);
    if (rentalUnitId > 0 && pendingTenantId) {
      console.log('Showing invoice type selection modal for tenant:', pendingTenantId, 'unit:', rentalUnitId);
      setShowInvoiceTypeModal(true);
    } else {
      console.log('Cannot show modal - rentalUnitId:', rentalUnitId, 'pendingTenantId:', pendingTenantId);
    }
  };

  const handleInvoiceTypeSelection = (paymentTypeId: number) => {
    console.log('Payment type selected:', paymentTypeId);
    const selectedPaymentType = paymentTypes.find(type => type.id === paymentTypeId);
    console.log('Selected payment type:', selectedPaymentType);
    
    if (pendingTenantId && selectedPaymentType) {
      // Set the payment type first
      setFormData(prev => ({ ...prev, payment_type_id: paymentTypeId }));
      setPaymentTypeLocked(true);
      console.log('Payment type locked:', true, 'Payment type ID:', paymentTypeId);
      
      // Determine invoice type based on payment type name
      const paymentTypeName = selectedPaymentType.name.toLowerCase();
      let invoiceType: 'rent' | 'maintenance' | null = null; // default to null for advance payments
      
      // Check if it's an advance rent payment
      if (paymentTypeName.includes('advance') && paymentTypeName.includes('rent')) {
        // For advance rent payments, don't show any invoices
        invoiceType = null;
        console.log('Advance rent payment detected - no invoices will be shown');
      }
      // Only show maintenance costs for maintenance/repair related payment types
      else if (paymentTypeName.includes('maintenance') || 
          paymentTypeName.includes('repair') || 
          paymentTypeName.includes('fix') ||
          paymentTypeName.includes('service')) {
        invoiceType = 'maintenance';
      }
      // For all other payment types (rent, late fee, security deposit, utilities, etc.), show rent invoices
      else {
        invoiceType = 'rent';
      }
      
      console.log('Payment type:', paymentTypeName, '-> Invoice type:', invoiceType);
      
      // Only fetch invoices if invoiceType is not null
      if (invoiceType) {
        fetchUnpaidInvoices(pendingTenantId, invoiceType, selectedRentalUnitId || undefined);
      } else {
        // Clear any existing invoices for advance payments
        setUnpaidInvoices([]);
        setUnpaidMaintenanceCosts([]);
        setSelectedInvoices([]);
        setSelectedMaintenanceCosts([]);
        setCurrentInvoiceType(null);
      }
    }
    setShowInvoiceTypeModal(false);
    setPendingTenantId(null);
  };

  const handleCloseModal = () => {
    console.log('Modal closed without selection');
    setShowInvoiceTypeModal(false);
    setPendingTenantId(null);
    // Reset tenant selection if no type was chosen
    setFormData(prev => ({ ...prev, tenant_id: 0 }));
  };

  const handleInvoiceSelect = (invoiceId: number, checked: boolean, invoiceType: 'rent' | 'maintenance') => {
    console.log('handleInvoiceSelect called:', { 
      invoiceId, 
      checked, 
      invoiceType,
      currentSelection: invoiceType === 'rent' ? selectedInvoices : selectedMaintenanceCosts,
      paymentTypeLocked,
      currentPaymentType: formData.payment_type_id,
      paymentTypeName: paymentTypes.find(type => type.id === formData.payment_type_id)?.name,
      timestamp: new Date().toISOString()
    });
    
    if (invoiceType === 'rent') {
    setSelectedInvoices(prev => {
        console.log('Previous rent selection:', prev);
      
      if (checked) {
        // Only add if not already in the array
        if (prev.includes(invoiceId)) {
          console.log('Invoice already selected, not adding:', invoiceId);
          return prev;
        }
        const newSelection = [...prev, invoiceId];
        console.log('Adding invoice to selection:', { invoiceId, newSelection });
        return newSelection;
      } else {
        const newSelection = prev.filter(id => id !== invoiceId);
        console.log('Removing invoice from selection:', { invoiceId, newSelection });
        return newSelection;
      }
    });
    } else {
      setSelectedMaintenanceCosts(prev => {
        console.log('Previous maintenance selection:', prev);
        
        if (checked) {
          if (prev.includes(invoiceId)) {
            console.log('Maintenance cost already selected, not adding:', invoiceId);
            return prev;
          }
          const newSelection = [...prev, invoiceId];
          console.log('Adding maintenance cost to selection:', { invoiceId, newSelection });
          return newSelection;
        } else {
          const newSelection = prev.filter(id => id !== invoiceId);
          console.log('Removing maintenance cost from selection:', { invoiceId, newSelection });
          return newSelection;
        }
      });
    }

    // Auto-select payment type and lock it when any invoice is selected
    if (checked) {
      const rentPaymentType = paymentTypes.find(type => type.name.toLowerCase() === 'rent');
      const maintenancePaymentType = paymentTypes.find(type => type.name.toLowerCase().includes('maintenance'));
      
      if (invoiceType === 'rent' && rentPaymentType) {
        setFormData(prev => ({ ...prev, payment_type_id: rentPaymentType.id }));
        setCurrentInvoiceType('rent');
        setPaymentTypeLocked(true);
      } else if (invoiceType === 'maintenance' && maintenancePaymentType) {
        setFormData(prev => ({ ...prev, payment_type_id: maintenancePaymentType.id }));
        setCurrentInvoiceType('maintenance');
        setPaymentTypeLocked(true);
      }
    } else {
      // Check if any invoices are still selected
      const hasRentSelected = invoiceType === 'rent' ? 
        (invoiceType === 'rent' ? checked : selectedInvoices.length > 0) : 
        selectedInvoices.length > 0;
      const hasMaintenanceSelected = invoiceType === 'maintenance' ? 
        (invoiceType === 'maintenance' ? checked : selectedMaintenanceCosts.length > 0) : 
        selectedMaintenanceCosts.length > 0;
      
      if (!hasRentSelected && !hasMaintenanceSelected) {
        // Don't reset currentInvoiceType - it should remain as selected from popup
        // Keep payment type locked when set from popup - don't reset it
        // The payment type should remain as originally selected
      }
    }
  };

  const handleSelectAll = (checked: boolean, invoiceType: 'rent' | 'maintenance') => {
    console.log('Select all changed:', checked, 'for type:', invoiceType, {
      paymentTypeLocked,
      currentPaymentType: formData.payment_type_id,
      paymentTypeName: paymentTypes.find(type => type.id === formData.payment_type_id)?.name
    });
    
    if (invoiceType === 'rent') {
    if (checked) {
      const allInvoiceIds = unpaidInvoices.map(invoice => invoice.id);
      setSelectedInvoices(allInvoiceIds);
        console.log('Selected all rent invoices:', allInvoiceIds);
        
        // Auto-select rent payment type - find exact "Rent" type
        const rentPaymentType = paymentTypes.find(type => type.name.toLowerCase() === 'rent');
        if (rentPaymentType) {
          setFormData(prev => ({ ...prev, payment_type_id: rentPaymentType.id }));
          setCurrentInvoiceType('rent');
          setPaymentTypeLocked(true);
        }
    } else {
      setSelectedInvoices([]);
        console.log('Deselected all rent invoices');
        
        // Don't reset currentInvoiceType - it should remain as selected from popup
        // Keep payment type locked when set from popup
        // Don't reset payment type - it should remain as originally selected
      }
    } else {
      if (checked) {
        const allMaintenanceIds = unpaidMaintenanceCosts.map(cost => cost.id);
        setSelectedMaintenanceCosts(allMaintenanceIds);
        console.log('Selected all maintenance costs:', allMaintenanceIds);
        
        // Auto-select maintenance payment type
        const maintenancePaymentType = paymentTypes.find(type => type.name.toLowerCase().includes('maintenance'));
        if (maintenancePaymentType) {
          setFormData(prev => ({ ...prev, payment_type_id: maintenancePaymentType.id }));
          setCurrentInvoiceType('maintenance');
          setPaymentTypeLocked(true);
        }
      } else {
        setSelectedMaintenanceCosts([]);
        console.log('Deselected all maintenance costs');
        
        // Don't reset currentInvoiceType - it should remain as selected from popup
        // Keep payment type locked when set from popup
        // Don't reset payment type - it should remain as originally selected
      }
    }
  };

  const isAllRentSelected = unpaidInvoices.length > 0 && selectedInvoices.length === unpaidInvoices.length;
  const isPartiallyRentSelected = selectedInvoices.length > 0 && selectedInvoices.length < unpaidInvoices.length;
  const isAllMaintenanceSelected = unpaidMaintenanceCosts.length > 0 && selectedMaintenanceCosts.length === unpaidMaintenanceCosts.length;
  const isPartiallyMaintenanceSelected = selectedMaintenanceCosts.length > 0 && selectedMaintenanceCosts.length < unpaidMaintenanceCosts.length;

  // Helper function to check if current payment type is advance rent
  const isAdvanceRentPayment = () => {
    const selectedPaymentType = paymentTypes.find(type => type.id === formData.payment_type_id);
    if (!selectedPaymentType) return false;
    const paymentTypeName = selectedPaymentType.name.toLowerCase();
    return paymentTypeName.includes('advance') && paymentTypeName.includes('rent');
  };

  const calculateTotalAmount = () => {
    const rentTotal = selectedInvoices.reduce((total, invoiceId) => {
      const invoice = unpaidInvoices.find(inv => inv.id === invoiceId);
      return total + Number(invoice?.total_amount || 0);
    }, 0);
    
    const maintenanceTotal = selectedMaintenanceCosts.reduce((total, costId) => {
      const cost = unpaidMaintenanceCosts.find(c => c.id === costId);
      return total + Number(cost?.repair_cost || 0);
    }, 0);
    
    return rentTotal + maintenanceTotal;
  };

  const updateFormFromSelectedInvoices = () => {
    const totalAmount = calculateTotalAmount();
    const selectedInvoiceNumbers = selectedInvoices.map(id => {
      const invoice = unpaidInvoices.find(inv => inv.id === id);
      return invoice?.invoice_number;
    }).filter(Boolean).join(', ');
    
    const selectedMaintenanceNumbers = selectedMaintenanceCosts.map(id => {
      const cost = unpaidMaintenanceCosts.find(c => c.id === id);
      return `INV-${new Date(cost?.created_at || Date.now()).toISOString().slice(2, 8).replace(/-/g, '')}-1`;
    }).filter(Boolean).join(', ');

    console.log('Updating form with selected invoices:', selectedInvoices);
    console.log('Updating form with selected maintenance costs:', selectedMaintenanceCosts);
    console.log('Total amount calculated:', totalAmount);
    console.log('Selected invoice numbers:', selectedInvoiceNumbers);
    console.log('Selected maintenance numbers:', selectedMaintenanceNumbers);

    const allSelectedNumbers = [selectedInvoiceNumbers, selectedMaintenanceNumbers].filter(Boolean).join(', ');

    setFormData(prev => ({
      ...prev,
      credit_amount: totalAmount,
      debit_amount: (selectedInvoices.length > 0 || selectedMaintenanceCosts.length > 0) ? 0 : prev.debit_amount,
      description: (selectedInvoices.length > 0 || selectedMaintenanceCosts.length > 0) 
        ? `Payment for: ${allSelectedNumbers}`
        : prev.description,
      reference_no: (selectedInvoices.length > 0 || selectedMaintenanceCosts.length > 0) 
        ? allSelectedNumbers
        : prev.reference_no,
    }));
  };

  // Update form when selected invoices change
  useEffect(() => {
    console.log('useEffect triggered - selectedInvoices changed:', selectedInvoices);
    console.log('useEffect triggered - selectedMaintenanceCosts changed:', selectedMaintenanceCosts);
    updateFormFromSelectedInvoices();
  }, [selectedInvoices, selectedMaintenanceCosts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debug form data changes
  useEffect(() => {
    console.log('Form data updated:', formData);
  }, [formData]);

  // Debug selected invoices changes
  useEffect(() => {
    console.log('Selected invoices state changed:', {
      selectedInvoices,
      count: selectedInvoices.length,
      timestamp: new Date().toISOString()
    });
  }, [selectedInvoices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Validation
      if (!formData.tenant_id || formData.tenant_id === 0 || !formData.payment_type_id || formData.payment_type_id === 0) {
        toast.error('Please select tenant and payment type');
        return;
      }

      // If no invoices are selected, validate manual amounts
      if (selectedInvoices.length === 0) {
        if (!formData.description) {
          toast.error('Please enter a description');
          return;
        }
        
        if (formData.debit_amount === 0 && formData.credit_amount === 0) {
          toast.error('Either debit amount or credit amount must be greater than 0');
          return;
        }

        if (formData.debit_amount > 0 && formData.credit_amount > 0) {
          toast.error('Cannot have both debit and credit amounts in the same transaction');
          return;
        }

        // For advance rent payments, ensure credit amount is provided
        if (isAdvanceRentPayment() && formData.credit_amount === 0) {
          toast.error('Please enter the advance rent amount');
          return;
        }
      }

      // If invoices are selected, create separate entries for each invoice
      if (selectedInvoices.length > 0) {
        const selectedInvoiceData = unpaidInvoices.filter(invoice => selectedInvoices.includes(invoice.id));
        
        console.log('Creating separate entries for invoices:', selectedInvoiceData);
        
        // Create separate ledger entry for each selected invoice
        for (const invoice of selectedInvoiceData) {
          console.log('Creating entry for invoice:', invoice.invoice_number);
          console.log('Selected rental unit ID:', selectedRentalUnitId);
          
          const submitData = {
            tenant_id: formData.tenant_id,
            payment_type_id: formData.payment_type_id,
            transaction_date: formData.transaction_date,
            description: `Payment for Invoice ${invoice.invoice_number}`,
            reference_no: invoice.invoice_number,
            ...(formData.payment_method && { payment_method: formData.payment_method }),
            ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
            ...(formData.remarks && { remarks: formData.remarks }),
            ...(formData.created_by && { created_by: formData.created_by }),
            // Credit amount for payment
            credit_amount: invoice.total_amount,
            // Include rental unit ID for proper unit association
            ...(selectedRentalUnitId && { rental_unit_id: selectedRentalUnitId }),
          };

          console.log('Submitting data for invoice:', invoice.invoice_number, submitData);
          await tenantLedgerAPI.create(submitData);
        }
        
        toast.success(`Successfully created ${selectedInvoiceData.length} payment entries`);
      } else {
        // Single entry for manual debit/credit
        const submitData = {
          tenant_id: formData.tenant_id,
          payment_type_id: formData.payment_type_id,
          transaction_date: formData.transaction_date,
          description: formData.description,
          ...(formData.reference_no && { reference_no: formData.reference_no }),
          ...(formData.payment_method && { payment_method: formData.payment_method }),
          ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
          ...(formData.remarks && { remarks: formData.remarks }),
          ...(formData.created_by && { created_by: formData.created_by }),
          // Only include the relevant amount field
          ...(formData.debit_amount > 0 
            ? { debit_amount: formData.debit_amount }
            : { credit_amount: formData.credit_amount }
          ),
          // Include rental unit ID for proper unit association
          ...(selectedRentalUnitId && { rental_unit_id: selectedRentalUnitId }),
        };

        console.log('Submitting single entry data:', submitData);
        await tenantLedgerAPI.create(submitData);
        toast.success('Ledger entry created successfully');
      }
      
      router.push('/tenant-ledger');
    } catch (error: unknown) {
      console.error('Error saving ledger entry:', error);
      const axiosError = error as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } };
      console.error('Error response:', axiosError.response);
      console.error('Error response data:', axiosError.response?.data);
      console.error('Error response status:', axiosError.response?.status);
      
      if (axiosError.response?.status === 422) {
        // Handle validation errors
        const errors = axiosError.response?.data?.errors;
        console.error('Validation errors:', errors);
        if (errors) {
          const errorMessages = Object.values(errors).flat();
          console.error('Error messages:', errorMessages);
          toast.error(`Validation failed: ${errorMessages.join(', ')}`);
        } else {
          console.error('No specific errors found, showing general message');
          toast.error(axiosError.response?.data?.message || 'Validation failed');
        }
      } else {
        toast.error(axiosError.response?.data?.message || 'Failed to save ledger entry');
      }
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tenant_id: 0,
      payment_type_id: 0,
      transaction_date: new Date().toISOString().slice(0, 10), // Changed to date only
      description: '',
      reference_no: '',
      debit_amount: 0,
      credit_amount: 0,
      payment_method: '',
      transfer_reference_no: '',
      remarks: '',
      created_by: 'Admin',
    });
  };

  const handleCancel = () => {
    router.push('/tenant-ledger');
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Ledger
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Ledger Entry</h1>
              <p className="mt-2 text-gray-600">
                Create a new financial transaction record
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-8">
            {/* Transaction Details Section */}
            <Card className="p-6">
              <FormSection title="Transaction Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tenant *
                    </label>
                    <Select
                      value={formData.tenant_id}
                      onChange={(e) => handleTenantChange(Number(e.target.value))}
                      required
                    >
                      <option value={0}>Select Tenant ({tenants.length} available)</option>
                      {tenants.map(tenant => {
                        console.log('Rendering tenant:', tenant);
                        return (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}
                          </option>
                        );
                      })}
                    </Select>
                  </div>

                  {formData.tenant_id > 0 && rentalUnits.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rental Unit *
                        {rentalUnits.length === 1 && (
                          <span className="text-green-600 text-xs ml-2">(Auto-selected)</span>
                        )}
                      </label>
                      <Select
                        value={selectedRentalUnitId || ''}
                        onChange={(e) => handleRentalUnitChange(Number(e.target.value))}
                        required
                        disabled={rentalUnits.length === 1}
                      >
                        <option value="">Select Unit ({rentalUnits.length} available)</option>
                        {rentalUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.property?.name} - Unit {unit.unit_number}
                          </option>
                        ))}
                      </Select>
                      {rentalUnits.length > 1 && (
                        <p className="text-sm text-gray-500 mt-1">
                          Please select the specific unit for this transaction
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type *
                      {paymentTypeLocked && (
                        <span className="text-blue-600 text-xs ml-2">(Locked - Auto-selected)</span>
                      )}
                    </label>
                    <Select
                      value={formData.payment_type_id}
                      onChange={(e) => {
                        console.log('Payment type onChange triggered:', { 
                          paymentTypeLocked, 
                          newValue: e.target.value,
                          currentValue: formData.payment_type_id 
                        });
                        if (!paymentTypeLocked) {
                          setFormData(prev => ({ ...prev, payment_type_id: Number(e.target.value) }));
                        } else {
                          console.log('Payment type change blocked - field is locked');
                        }
                      }}
                      required
                      disabled={paymentTypeLocked}
                      className={paymentTypeLocked ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}
                    >
                      <option value={0}>Select Payment Type ({paymentTypes.length} available)</option>
                      {paymentTypes.map(type => {
                        console.log('Rendering payment type:', type);
                        return (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        );
                      })}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.transaction_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <Input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Monthly Rent, Security Deposit, Maintenance Fee"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference No.
                      {selectedInvoices.length > 0 && (
                        <span className="text-blue-600 text-xs ml-2">(Auto-filled with invoice numbers)</span>
                      )}
                    </label>
                    <Input
                      type="text"
                      value={formData.reference_no}
                      onChange={(e) => {
                        // Only allow manual changes if no invoices are selected
                        if (selectedInvoices.length === 0) {
                          setFormData(prev => ({ ...prev, reference_no: e.target.value }));
                        }
                      }}
                      placeholder="Invoice number, receipt number, or transaction ID"
                      readOnly={selectedInvoices.length > 0}
                      className={selectedInvoices.length > 0 ? 'bg-blue-50 border-blue-200' : ''}
                    />
                  </div>
                </div>
              </FormSection>
            </Card>

            {/* Financial Details Section */}
            <Card className="p-6">
              <FormSection title="Financial Details">
                {isAdvanceRentPayment() && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">Advance Rent Payment</span>
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      This is an advance rent payment. You can only enter a credit amount as the tenant is making a payment in advance.
                    </div>
                  </div>
                )}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Amount (Amount Owed)
                      {isAdvanceRentPayment() && (
                        <span className="text-blue-600 text-xs ml-2">(Disabled for advance rent payments)</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.debit_amount || ''}
                      onChange={(e) => {
                        if (!isAdvanceRentPayment()) {
                          const numericValue = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            debit_amount: numericValue,
                            credit_amount: numericValue > 0 ? 0 : prev.credit_amount
                          }));
                        }
                      }}
                      placeholder="0.00"
                      disabled={isAdvanceRentPayment()}
                      className={isAdvanceRentPayment() ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Amount charged to tenant (rent, fees, penalties, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Amount (Payment Received)
                      {selectedInvoices.length > 0 && (
                        <span className="text-blue-600 text-xs ml-2">(Auto-calculated from selected invoices)</span>
                      )}
                      {isAdvanceRentPayment() && (
                        <span className="text-green-600 text-xs ml-2">(Enter advance rent amount)</span>
                      )}
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.credit_amount || ''}
                      onChange={(e) => {
                        // Allow manual changes if no invoices are selected OR if it's an advance rent payment
                        if (selectedInvoices.length === 0 || isAdvanceRentPayment()) {
                          const numericValue = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            credit_amount: numericValue,
                            debit_amount: numericValue > 0 ? 0 : prev.debit_amount
                          }));
                        }
                      }}
                      placeholder="0.00"
                      readOnly={selectedInvoices.length > 0 && !isAdvanceRentPayment()}
                      className={selectedInvoices.length > 0 && !isAdvanceRentPayment() ? 'bg-blue-50 border-blue-200' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Amount received from tenant (payments, refunds, deposits)
                    </p>
                  </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <Select
                        value={formData.payment_method}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      >
                        <option value="">Select Payment Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Check">Check</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Online Payment">Online Payment</option>
                        <option value="Mobile Payment">Mobile Payment</option>
                        <option value="Money Order">Money Order</option>
                        <option value="Other">Other</option>
                      </Select>
                    </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transfer Reference No.
                    </label>
                    <Input
                      type="text"
                      value={formData.transfer_reference_no}
                      onChange={(e) => setFormData(prev => ({ ...prev, transfer_reference_no: e.target.value }))}
                      placeholder="Bank transaction ID, check number, or payment reference"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Created By
                    </label>
                    <Input
                      type="text"
                      value={formData.created_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, created_by: e.target.value }))}
                      placeholder="User who created this entry"
                    />
                  </div>
                </div>
              </FormSection>
            </Card>

            {/* Unpaid Invoices Section */}
            {formData.tenant_id > 0 && currentInvoiceType && (
              <Card className="p-6">
                <FormSection title={`Unpaid ${currentInvoiceType === 'rent' ? 'Rent Invoices' : 'Maintenance Costs'}`}>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-500 mb-2">
                      Debug: Tenant ID: {formData.tenant_id}, Payment Type: {paymentTypes.find(type => type.id === formData.payment_type_id)?.name}, Payment Type Locked: {paymentTypeLocked ? 'YES' : 'NO'}, Invoice Type: {currentInvoiceType}, 
                      {currentInvoiceType === 'rent' ? `Rent Invoices: ${unpaidInvoices.length}` : `Maintenance Costs: ${unpaidMaintenanceCosts.length}`}, 
                      Selected: {currentInvoiceType === 'rent' ? selectedInvoices.length : selectedMaintenanceCosts.length}, 
                      Credit Amount: {formData.credit_amount > 0 ? formData.credit_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}, 
                      Reference: {formData.reference_no || 'None'}, 
                      Total Selected: {calculateTotalAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    
                    {currentInvoiceType && (
                      <div>
                        <div className="text-sm text-gray-600 mb-4">
                          Select {currentInvoiceType === 'rent' ? 'rent invoices' : 'maintenance costs'} to create payment entries. 
                          The payment type will be automatically set based on your selection.
                        </div>
                        
                        {/* Invoices Section */}
                        {currentInvoiceType === 'rent' && (
                          <div className="space-y-3">
                            {unpaidInvoices.length > 0 ? (
                              <div>
                                {/* Select All Invoices */}
                        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                                      checked={isAllRentSelected}
                              ref={(input) => {
                                        if (input) input.indeterminate = isPartiallyRentSelected;
                              }}
                                      onChange={(e) => handleSelectAll(e.target.checked, 'rent')}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900">
                                        Select All Rent Invoices ({unpaidInvoices.length})
                              </div>
                              <div className="text-sm text-gray-500">
                                        {isAllRentSelected ? 'All invoices selected' : 
                                         isPartiallyRentSelected ? `${selectedInvoices.length} of ${unpaidInvoices.length} selected` :
                                         'Click to select all invoices'}
                              </div>
                            </div>
                            <div className="ml-auto text-right">
                              <div className="font-medium text-gray-900">
                                        Total: {unpaidInvoices.length > 0 ? unpaidInvoices[0].currency : 'MVR'} {unpaidInvoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-sm text-gray-500">
                                {selectedInvoices.length > 0 ? `Selected: ${selectedInvoices.length} rent invoices` : 'No rent invoices selected'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {unpaidInvoices.map((invoice) => (
                            <div
                              key={invoice.id}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                selectedInvoices.includes(invoice.id)
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                                      onClick={() => handleInvoiceSelect(invoice.id, !selectedInvoices.includes(invoice.id), 'rent')}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    key={`checkbox-${invoice.id}-${selectedInvoices.includes(invoice.id)}`}
                                    checked={selectedInvoices.includes(invoice.id)}
                                    onChange={(e) => {
                                              e.stopPropagation();
                                      console.log('Checkbox onChange triggered:', { invoiceId: invoice.id, checked: e.target.checked });
                                              handleInvoiceSelect(invoice.id, e.target.checked, 'rent');
                                    }}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {invoice.invoice_number}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {invoice.property?.name} - Unit {invoice.rental_unit?.unit_number}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-medium text-gray-900">
                                    {invoice.currency} {Number(invoice.total_amount).toLocaleString()}
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    {invoice.status === 'overdue' ? (
                                      <AlertCircle className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-yellow-500" />
                                    )}
                                    <span className={`text-xs ${
                                      invoice.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                                    }`}>
                                      {invoice.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                        <p className="text-lg font-medium">No unpaid rent invoices</p>
                        <p className="text-sm">This tenant has no pending rent invoices.</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Maintenance Costs Section */}
                        {currentInvoiceType === 'maintenance' && (
                          <div className="space-y-3">
                            {unpaidMaintenanceCosts.length > 0 ? (
                              <div>
                                {/* Select All Maintenance Costs */}
                                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={isAllMaintenanceSelected}
                                      ref={(input) => {
                                        if (input) input.indeterminate = isPartiallyMaintenanceSelected;
                                      }}
                                      onChange={(e) => handleSelectAll(e.target.checked, 'maintenance')}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        Select All Maintenance Costs ({unpaidMaintenanceCosts.length})
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {isAllMaintenanceSelected ? 'All maintenance costs selected' : 
                                         isPartiallyMaintenanceSelected ? `${selectedMaintenanceCosts.length} of ${unpaidMaintenanceCosts.length} selected` :
                                         'Click to select all maintenance costs'}
                                      </div>
                                    </div>
                                    <div className="ml-auto text-right">
                                      <div className="font-medium text-gray-900">
                                        Total: {unpaidMaintenanceCosts.length > 0 ? unpaidMaintenanceCosts[0].currency : 'MVR'} {unpaidMaintenanceCosts.reduce((sum, cost) => sum + Number(cost.repair_cost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {selectedMaintenanceCosts.length > 0 ? `Selected: ${selectedMaintenanceCosts.length} costs` : 'No costs selected'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  {unpaidMaintenanceCosts.map((cost) => (
                                    <div
                                      key={cost.id}
                                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                        selectedMaintenanceCosts.includes(cost.id)
                                          ? 'border-green-500 bg-green-50'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      onClick={() => handleInvoiceSelect(cost.id, !selectedMaintenanceCosts.includes(cost.id), 'maintenance')}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <input
                                            type="checkbox"
                                            key={`checkbox-maintenance-${cost.id}-${selectedMaintenanceCosts.includes(cost.id)}`}
                                            checked={selectedMaintenanceCosts.includes(cost.id)}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              console.log('Maintenance checkbox onChange triggered:', { costId: cost.id, checked: e.target.checked });
                                              handleInvoiceSelect(cost.id, e.target.checked, 'maintenance');
                                            }}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                          />
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              MC-{cost.id}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {cost.rental_unit_asset?.rental_unit?.property?.name} - Unit {cost.rental_unit_asset?.rental_unit?.unit_number}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {cost.description}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              Asset: {cost.rental_unit_asset?.asset?.name}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-medium text-gray-900">
                                            {cost.currency} {Number(cost.repair_cost).toLocaleString()}
                                          </div>
                                          <div className="flex items-center space-x-1">
                                            <Clock className="h-4 w-4 text-yellow-500" />
                                            <span className="text-xs text-yellow-600">
                                              {cost.status}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-400" />
                                <p className="text-lg font-medium">No unpaid maintenance costs</p>
                                <p className="text-sm">This tenant has no pending maintenance costs.</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(selectedInvoices.length > 0 || selectedMaintenanceCosts.length > 0) && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span className="font-medium text-green-800">
                                Selected {selectedInvoices.length + selectedMaintenanceCosts.length} item(s)
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-green-700">
                              Total Payment Amount: MVR {calculateTotalAmount().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {currentInvoiceType && (
                              <div className="mt-1 text-sm text-blue-700">
                                Payment Type: {paymentTypes.find(type => type.id === formData.payment_type_id)?.name} (Auto-selected)
                          </div>
                        )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </FormSection>
              </Card>
            )}
          </div>

          {/* Additional Information Section */}
          <Card className="p-6">
            <FormSection title="Additional Information">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Any additional notes, comments, or special instructions"
                  rows={4}
                />
              </div>
            </FormSection>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              className="flex items-center gap-2"
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </form>


        {/* Payment Type Selection Modal */}
        {showInvoiceTypeModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select Payment Type
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose the payment type to view relevant invoices for this tenant
                </p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {paymentTypes.map((paymentType) => {
                    const isMaintenance = paymentType.name.toLowerCase().includes('maintenance') || 
                                        paymentType.name.toLowerCase().includes('repair');
                    const isAdvanceRent = paymentType.name.toLowerCase().includes('advance') && 
                                         paymentType.name.toLowerCase().includes('rent');
                    
                    let borderColor = 'border-gray-200 hover:border-gray-300';
                    let hoverBg = 'hover:bg-gray-50';
                    
                    if (isMaintenance) {
                      borderColor = 'border-green-200 hover:border-green-300';
                      hoverBg = 'hover:bg-green-50';
                    } else if (isAdvanceRent) {
                      borderColor = 'border-blue-200 hover:border-blue-300';
                      hoverBg = 'hover:bg-blue-50';
                      // textColor = 'text-blue-900';
                    }
                    
                    return (
                      <button
                        key={paymentType.id}
                        onClick={() => handleInvoiceTypeSelection(paymentType.id)}
                        className={`w-full p-3 border rounded-lg transition-colors text-left ${borderColor} ${hoverBg}`}
                      >
                        <div className="font-medium text-gray-900">{paymentType.name}</div>
                        {isAdvanceRent && (
                          <div className="text-xs text-blue-600 mt-1">
                            No invoices will be shown - enter credit amount only
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={handleCloseModal}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
