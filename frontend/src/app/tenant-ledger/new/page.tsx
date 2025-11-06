'use client';

import React, { useState, useEffect } from 'react';
import { tenantLedgerAPI, tenantsAPI, paymentTypesAPI, paymentModesAPI, rentInvoicesAPI, maintenanceCostsAPI, maintenanceInvoicesAPI, rentalUnitsAPI, Tenant, PaymentType, PaymentMode, RentInvoice, MaintenanceCost, MaintenanceInvoice, RentalUnit } from '@/services/api';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { SearchableSelect } from '@/components/UI/SearchableSelect';
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
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [rentalUnits, setRentalUnits] = useState<RentalUnit[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<RentInvoice[]>([]);
  const [unpaidMaintenanceCosts, setUnpaidMaintenanceCosts] = useState<MaintenanceCost[]>([]);
  const [unpaidMaintenanceInvoices, setUnpaidMaintenanceInvoices] = useState<MaintenanceInvoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [selectedMaintenanceCosts, setSelectedMaintenanceCosts] = useState<number[]>([]);
  const [selectedMaintenanceInvoices, setSelectedMaintenanceInvoices] = useState<number[]>([]);
  const [currentInvoiceTypes, setCurrentInvoiceTypes] = useState<('rent' | 'maintenance')[]>([]);
  const [selectedInvoiceTypes, setSelectedInvoiceTypes] = useState<('rent' | 'maintenance')[]>([]);
  const [paymentTypeLocked, setPaymentTypeLocked] = useState(false);
  const [showInvoiceTypeModal, setShowInvoiceTypeModal] = useState(false);
  const [pendingTenantId, setPendingTenantId] = useState<number | null>(null);
  const [selectedRentalUnitId, setSelectedRentalUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [useBulkPayment, setUseBulkPayment] = useState(true); // Default to bulk payment for multiple invoices
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
      console.log('Loading tenants, payment types, and payment modes...');
      const [tenantsRes, paymentTypesRes, paymentModesRes] = await Promise.all([
        tenantsAPI.getAll(),
        paymentTypesAPI.getAll(),
        paymentModesAPI.getAll(),
      ]);

      console.log('Tenants response:', tenantsRes.data);
      console.log('Payment types response:', paymentTypesRes.data);
      console.log('Payment modes response:', paymentModesRes.data);

      const tenantsData = tenantsRes.data?.tenants || [];
      const paymentTypesData = paymentTypesRes.data?.payment_types || [];
      const paymentModesData = paymentModesRes.data?.payment_modes || [];

      console.log('Tenants data:', tenantsData);
      console.log('Payment types data:', paymentTypesData);
      console.log('Payment modes data:', paymentModesData);

      setTenants(tenantsData);
      setPaymentTypes(paymentTypesData);
      setPaymentModes(paymentModesData);
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

  const fetchUnpaidInvoices = async (tenantId: number, invoiceTypes: ('rent' | 'maintenance')[], rentalUnitId?: number) => {
    try {
      console.log('Fetching unpaid invoices for tenant:', tenantId, 'types:', invoiceTypes);
      
        const params: Record<string, unknown> = { 
          tenant_id: tenantId, 
          status: 'pending,overdue' 
        };
        
        // Add rental unit filter if provided
        if (rentalUnitId) {
          params.rental_unit_id = rentalUnitId;
        }
        
      // Fetch invoices in parallel for all selected types
      const fetchPromises: Promise<void>[] = [];
        
      if (invoiceTypes.includes('rent')) {
        fetchPromises.push(
          rentInvoicesAPI.getAll(params).then(rentResponse => {
        console.log('Rent invoices response:', rentResponse.data);
        const rentInvoices = rentResponse.data.invoices || [];
        console.log('Rent invoices found:', rentInvoices.length);
        setUnpaidInvoices(rentInvoices);
          })
        );
      } else {
        setUnpaidInvoices([]);
      }
      
      if (invoiceTypes.includes('maintenance')) {
        fetchPromises.push(
          maintenanceInvoicesAPI.getAll(params).then(maintenanceResponse => {
        console.log('Maintenance invoices response:', maintenanceResponse.data);
        const maintenanceInvoices = maintenanceResponse.data.maintenance_invoices || [];
        console.log('Maintenance invoices found:', maintenanceInvoices.length);
        setUnpaidMaintenanceInvoices(maintenanceInvoices);
          })
        );
      } else {
        setUnpaidMaintenanceInvoices([]);
      }
      
      await Promise.all(fetchPromises);
      
      setCurrentInvoiceTypes(invoiceTypes);
      setUnpaidMaintenanceCosts([]); // Clear maintenance costs
      
      setSelectedInvoices([]); // Reset selected invoices
      setSelectedMaintenanceCosts([]); // Reset selected maintenance costs
      setSelectedMaintenanceInvoices([]); // Reset selected maintenance invoices
      // Don't unlock payment type here - it should remain locked when selected from popup
    } catch (error: unknown) {
      console.error('Error fetching unpaid invoices:', error);
      const axiosError = error as { response?: { data?: unknown } };
      console.error('Error details:', axiosError.response?.data);
      toast.error('Failed to load unpaid invoices');
      setUnpaidInvoices([]);
      setUnpaidMaintenanceCosts([]);
      setUnpaidMaintenanceInvoices([]);
    }
  };

  // Helper function to format tenant display with property and unit info
  const getTenantDisplayText = (tenant: Tenant, unit?: { property?: { name?: string }; unit_number?: string }): string => {
    const tenantName = tenant.full_name || `${tenant.first_name} ${tenant.last_name}`;
    if (unit && unit.property?.name && unit.unit_number) {
      return `${tenantName} - ${unit.property.name} - Unit ${unit.unit_number}`;
    }
    return tenantName;
  };

  // Get selected tenant details for display
  const selectedTenant = tenants.find(t => t.id === formData.tenant_id);
  const selectedTenantUnits = selectedTenant?.rental_units || [];

  const handleTenantChange = (tenantId: number) => {
    console.log('Tenant changed to:', tenantId);
    setFormData(prev => ({ ...prev, tenant_id: tenantId }));
    if (tenantId > 0) {
      console.log('Setting pendingTenantId to:', tenantId);
      setPendingTenantId(tenantId);
      setSelectedRentalUnitId(null);
      console.log('Fetching rental units for tenant:', tenantId);
      fetchRentalUnits(tenantId);
      
      // Show payment types dropdown when tenant is selected
      console.log('Payment types available:', paymentTypes.length);
      console.log('Payment types should now be visible');

      // NEW: Immediately show the payment type selection modal after tenant selection
      // This allows choosing payment type upfront (without waiting for rental unit selection)
      setShowInvoiceTypeModal(true);
    } else {
      console.log('Clearing invoices and unlocking payment type');
      setRentalUnits([]);
      setUnpaidInvoices([]);
      setUnpaidMaintenanceCosts([]);
      setUnpaidMaintenanceInvoices([]);
      setSelectedInvoices([]);
      setSelectedMaintenanceCosts([]);
      setSelectedMaintenanceInvoices([]);
      setCurrentInvoiceTypes([]);
      setPaymentTypeLocked(false); // Only unlock when tenant is cleared
      setPendingTenantId(null);
      // Clear payment type when tenant is cleared
      setFormData(prev => ({ ...prev, payment_type_id: 0 }));
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

  const handlePaymentTypeChange = (paymentTypeId: number) => {
    console.log('Payment type changed to:', paymentTypeId);
    setFormData(prev => ({ ...prev, payment_type_id: paymentTypeId }));
    
    if (paymentTypeId > 0 && formData.tenant_id > 0) {
      const selectedPaymentType = paymentTypes.find(type => type.id === paymentTypeId);
      console.log('Selected payment type:', selectedPaymentType);
      
      if (selectedPaymentType) {
        setPaymentTypeLocked(true);
        console.log('Payment type locked:', true, 'Payment type ID:', paymentTypeId);
        
        // Determine invoice type based on payment type name
        const paymentTypeName = selectedPaymentType.name.toLowerCase();
        let invoiceType: 'rent' | 'maintenance' | null = null;
        
        // Check if it's an advance rent payment
        if (paymentTypeName.includes('advance') && paymentTypeName.includes('rent')) {
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
          // Fetch invoices for ALL rental units of the selected tenant (no specific rental unit filter)
          fetchUnpaidInvoices(formData.tenant_id, [invoiceType], undefined);
        } else {
          // Clear any existing invoices for advance payments
          setUnpaidInvoices([]);
          setUnpaidMaintenanceCosts([]);
          setUnpaidMaintenanceInvoices([]);
          setSelectedInvoices([]);
          setSelectedMaintenanceCosts([]);
          setSelectedMaintenanceInvoices([]);
          setCurrentInvoiceTypes([]);
        }
      }
    } else {
      // Clear everything when payment type is cleared
      setUnpaidInvoices([]);
      setUnpaidMaintenanceCosts([]);
      setUnpaidMaintenanceInvoices([]);
      setSelectedInvoices([]);
      setSelectedMaintenanceCosts([]);
      setSelectedMaintenanceInvoices([]);
      setCurrentInvoiceTypes([]);
      setPaymentTypeLocked(false);
    }
  };

  const handleInvoiceTypeToggle = (invoiceType: 'rent' | 'maintenance', checked: boolean) => {
    setSelectedInvoiceTypes(prev => {
      if (checked) {
        // Add invoice type if not already in array
        if (!prev.includes(invoiceType)) {
          return [...prev, invoiceType];
        }
        return prev;
      } else {
        // Remove invoice type from array
        return prev.filter(type => type !== invoiceType);
      }
    });
  };

  const handleConfirmInvoiceTypeSelection = () => {
    if (pendingTenantId && selectedInvoiceTypes.length > 0) {
      // Fetch invoices for all selected types
      fetchUnpaidInvoices(pendingTenantId, selectedInvoiceTypes, undefined);
      
      // Set a default payment type if none is set (use first available)
      if (formData.payment_type_id === 0) {
        // Try to find a rent payment type first, then maintenance
        const rentPaymentType = paymentTypes.find(type => 
          type.name.toLowerCase() === 'rent'
        );
        const maintenancePaymentType = paymentTypes.find(type => 
          type.name.toLowerCase().includes('maintenance')
        );
        
        if (selectedInvoiceTypes.includes('rent') && rentPaymentType) {
          setFormData(prev => ({ ...prev, payment_type_id: rentPaymentType.id }));
        } else if (selectedInvoiceTypes.includes('maintenance') && maintenancePaymentType) {
          setFormData(prev => ({ ...prev, payment_type_id: maintenancePaymentType.id }));
        }
      }
      
      setPaymentTypeLocked(true);
    } else if (pendingTenantId && selectedInvoiceTypes.length === 0) {
      // Clear invoices if no types selected
        setUnpaidInvoices([]);
        setUnpaidMaintenanceCosts([]);
        setUnpaidMaintenanceInvoices([]);
        setSelectedInvoices([]);
        setSelectedMaintenanceCosts([]);
        setSelectedMaintenanceInvoices([]);
      setCurrentInvoiceTypes([]);
      }
    
    setShowInvoiceTypeModal(false);
    setPendingTenantId(null);
    setSelectedInvoiceTypes([]); // Reset for next time
  };

  const handleCloseModal = () => {
    console.log('Modal closed without selection');
    setShowInvoiceTypeModal(false);
    setPendingTenantId(null);
    setSelectedInvoiceTypes([]);
    // Reset tenant selection if no type was chosen
    setFormData(prev => ({ ...prev, tenant_id: 0 }));
  };

  const handleInvoiceSelect = (invoiceId: number, checked: boolean, invoiceType: 'rent' | 'maintenance') => {
    console.log('handleInvoiceSelect called:', { 
      invoiceId, 
      checked, 
      invoiceType,
      currentSelection: invoiceType === 'rent' ? selectedInvoices : selectedMaintenanceInvoices,
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
      setSelectedMaintenanceInvoices(prev => {
        console.log('Previous maintenance selection:', prev);
        
        if (checked) {
          if (prev.includes(invoiceId)) {
            console.log('Maintenance invoice already selected, not adding:', invoiceId);
            return prev;
          }
          const newSelection = [...prev, invoiceId];
          console.log('Adding maintenance invoice to selection:', { invoiceId, newSelection });
          return newSelection;
        } else {
          const newSelection = prev.filter(id => id !== invoiceId);
          console.log('Removing maintenance invoice from selection:', { invoiceId, newSelection });
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
        setPaymentTypeLocked(true);
      } else if (invoiceType === 'maintenance' && maintenancePaymentType) {
        setFormData(prev => ({ ...prev, payment_type_id: maintenancePaymentType.id }));
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
        // Don't reset currentInvoiceTypes - they should remain as selected from popup
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
          setPaymentTypeLocked(true);
        }
    } else {
      setSelectedInvoices([]);
        console.log('Deselected all rent invoices');
        
        // Don't reset currentInvoiceTypes - they should remain as selected from popup
        // Keep payment type locked when set from popup
        // Don't reset payment type - it should remain as originally selected
      }
    } else {
      if (checked) {
        const allMaintenanceIds = unpaidMaintenanceInvoices.map(invoice => invoice.id);
        setSelectedMaintenanceInvoices(allMaintenanceIds);
        console.log('Selected all maintenance invoices:', allMaintenanceIds);
        
        // Auto-select maintenance payment type
        const maintenancePaymentType = paymentTypes.find(type => type.name.toLowerCase().includes('maintenance'));
        if (maintenancePaymentType) {
          setFormData(prev => ({ ...prev, payment_type_id: maintenancePaymentType.id }));
          setPaymentTypeLocked(true);
        }
      } else {
        setSelectedMaintenanceInvoices([]);
        console.log('Deselected all maintenance invoices');
        
        // Don't reset currentInvoiceTypes - they should remain as selected from popup
        // Keep payment type locked when set from popup
        // Don't reset payment type - it should remain as originally selected
      }
    }
  };

  const isAllRentSelected = unpaidInvoices.length > 0 && selectedInvoices.length === unpaidInvoices.length;
  const isPartiallyRentSelected = selectedInvoices.length > 0 && selectedInvoices.length < unpaidInvoices.length;

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
    
    const maintenanceTotal = selectedMaintenanceInvoices.reduce((total, invoiceId) => {
      const invoice = unpaidMaintenanceInvoices.find(inv => inv.id === invoiceId);
      return total + Number(invoice?.total_amount || 0);
    }, 0);
    
    return rentTotal + maintenanceTotal;
  };

  const updateFormFromSelectedInvoices = () => {
    const totalAmount = calculateTotalAmount();
    const selectedInvoiceNumbers = selectedInvoices.map(id => {
      const invoice = unpaidInvoices.find(inv => inv.id === id);
      return invoice?.invoice_number;
    }).filter(Boolean).join(', ');
    
    const selectedMaintenanceNumbers = selectedMaintenanceInvoices.map(id => {
      const invoice = unpaidMaintenanceInvoices.find(inv => inv.id === id);
      return invoice?.invoice_number;
    }).filter(Boolean).join(', ');

    console.log('Updating form with selected invoices:', selectedInvoices);
    console.log('Updating form with selected maintenance invoices:', selectedMaintenanceInvoices);
    console.log('Total amount calculated:', totalAmount);
    console.log('Selected invoice numbers:', selectedInvoiceNumbers);
    console.log('Selected maintenance numbers:', selectedMaintenanceNumbers);

    const allSelectedNumbers = [selectedInvoiceNumbers, selectedMaintenanceNumbers].filter(Boolean).join(', ');

    setFormData(prev => ({
      ...prev,
      credit_amount: totalAmount,
      debit_amount: (selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) ? 0 : prev.debit_amount,
      description: (selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) 
        ? `Payment for: ${allSelectedNumbers}`
        : prev.description,
      reference_no: (selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) 
        ? allSelectedNumbers
        : prev.reference_no,
    }));
  };

  // Update form when selected invoices change
  useEffect(() => {
    console.log('useEffect triggered - selectedInvoices changed:', selectedInvoices);
    console.log('useEffect triggered - selectedMaintenanceInvoices changed:', selectedMaintenanceInvoices);
    updateFormFromSelectedInvoices();
  }, [selectedInvoices, selectedMaintenanceInvoices]); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (selectedInvoices.length === 0 && selectedMaintenanceInvoices.length === 0) {
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

      // If invoices are selected, create either bulk payment or separate entries
      const hasRentInvoices = selectedInvoices.length > 0;
      const hasMaintenanceInvoices = selectedMaintenanceInvoices.length > 0;
      const hasMixedInvoiceTypes = hasRentInvoices && hasMaintenanceInvoices;
      
      if (hasRentInvoices || hasMaintenanceInvoices) {
        // Get appropriate payment types
        const rentPaymentType = paymentTypes.find(type => type.name.toLowerCase() === 'rent');
        const maintenancePaymentType = paymentTypes.find(type => type.name.toLowerCase().includes('maintenance'));
        
        let totalEntriesCreated = 0;
        
        // Handle rent invoices
        if (hasRentInvoices) {
          const selectedRentInvoiceData = unpaidInvoices.filter(invoice => selectedInvoices.includes(invoice.id));
          
          if (useBulkPayment && selectedRentInvoiceData.length > 1 && !hasMixedInvoiceTypes) {
            // Create a single bulk payment entry for rent invoices only (when not mixed)
            console.log('Creating bulk payment for rent invoices:', selectedRentInvoiceData);
          
          const bulkPaymentData = {
            tenant_id: formData.tenant_id,
              payment_type_id: rentPaymentType?.id || formData.payment_type_id,
            transaction_date: formData.transaction_date,
              invoice_ids: selectedRentInvoiceData.map(inv => inv.id),
            ...(formData.payment_method && { payment_method: formData.payment_method }),
            ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
            ...(formData.remarks && { remarks: formData.remarks }),
            ...(formData.created_by && { created_by: formData.created_by }),
            ...(selectedRentalUnitId && selectedRentalUnitId > 0 && { rental_unit_id: selectedRentalUnitId }),
          };

            console.log('Submitting bulk payment data for rent:', bulkPaymentData);
          await tenantLedgerAPI.bulkPayment(bulkPaymentData);
            totalEntriesCreated += 1;
        } else {
            // Create separate ledger entry for each rent invoice
            console.log('Creating separate entries for rent invoices:', selectedRentInvoiceData);
            
            for (const invoice of selectedRentInvoiceData) {
              const submitData = {
                tenant_id: formData.tenant_id,
                payment_type_id: rentPaymentType?.id || formData.payment_type_id,
                transaction_date: formData.transaction_date,
                description: `Payment for Invoice ${invoice.invoice_number}`,
                reference_no: invoice.invoice_number,
                ...(formData.payment_method && { payment_method: formData.payment_method }),
                ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
                ...(formData.remarks && { remarks: formData.remarks }),
                ...(formData.created_by && { created_by: formData.created_by }),
                credit_amount: invoice.total_amount,
                ...(selectedRentalUnitId && selectedRentalUnitId > 0 && { rental_unit_id: selectedRentalUnitId }),
              };

              console.log('Submitting data for rent invoice:', invoice.invoice_number, submitData);
              await tenantLedgerAPI.create(submitData);
              totalEntriesCreated += 1;
            }
          }
        }
        
        // Handle maintenance invoices separately with maintenance payment type
        if (hasMaintenanceInvoices) {
          const selectedMaintenanceInvoiceData = unpaidMaintenanceInvoices.filter(invoice => selectedMaintenanceInvoices.includes(invoice.id));
          
          if (useBulkPayment && selectedMaintenanceInvoiceData.length > 1 && !hasMixedInvoiceTypes) {
            // Create a single bulk payment entry for maintenance invoices only (when not mixed)
            console.log('Creating bulk payment for maintenance invoices:', selectedMaintenanceInvoiceData);
            
            const bulkPaymentData = {
              tenant_id: formData.tenant_id,
              payment_type_id: maintenancePaymentType?.id || formData.payment_type_id,
              transaction_date: formData.transaction_date,
              invoice_ids: selectedMaintenanceInvoiceData.map(inv => inv.id),
              ...(formData.payment_method && { payment_method: formData.payment_method }),
              ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
              ...(formData.remarks && { remarks: formData.remarks }),
              ...(formData.created_by && { created_by: formData.created_by }),
              ...(selectedRentalUnitId && selectedRentalUnitId > 0 && { rental_unit_id: selectedRentalUnitId }),
            };

            console.log('Submitting bulk payment data for maintenance:', bulkPaymentData);
            await tenantLedgerAPI.bulkPayment(bulkPaymentData);
            totalEntriesCreated += 1;
          } else {
            // Create separate ledger entry for each maintenance invoice
            console.log('Creating separate entries for maintenance invoices:', selectedMaintenanceInvoiceData);
            
            for (const invoice of selectedMaintenanceInvoiceData) {
            const submitData = {
              tenant_id: formData.tenant_id,
                payment_type_id: maintenancePaymentType?.id || formData.payment_type_id,
              transaction_date: formData.transaction_date,
              description: `Payment for Invoice ${invoice.invoice_number}`,
              reference_no: invoice.invoice_number,
              ...(formData.payment_method && { payment_method: formData.payment_method }),
              ...(formData.transfer_reference_no && { transfer_reference_no: formData.transfer_reference_no }),
              ...(formData.remarks && { remarks: formData.remarks }),
              ...(formData.created_by && { created_by: formData.created_by }),
              credit_amount: invoice.total_amount,
              ...(selectedRentalUnitId && selectedRentalUnitId > 0 && { rental_unit_id: selectedRentalUnitId }),
            };

              console.log('Submitting data for maintenance invoice:', invoice.invoice_number, submitData);
            await tenantLedgerAPI.create(submitData);
              totalEntriesCreated += 1;
            }
          }
        }
        
        // Show success message
        if (hasMixedInvoiceTypes) {
          toast.success(`Successfully created payment entries: ${selectedInvoices.length} rent + ${selectedMaintenanceInvoices.length} maintenance invoices`);
        } else {
          toast.success(`Successfully created ${totalEntriesCreated} payment ${totalEntriesCreated === 1 ? 'entry' : 'entries'}`);
        }
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
          // Include rental unit ID for proper unit association (only if it exists)
          ...(selectedRentalUnitId && selectedRentalUnitId > 0 && { rental_unit_id: selectedRentalUnitId }),
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
      } else if (axiosError.response?.status === 500) {
        // Handle server errors
        console.error('Server error details:', axiosError.response?.data);
        toast.error(axiosError.response?.data?.message || 'Server error occurred. Please check the logs for more details.');
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
                    <SearchableSelect
                      options={tenants.flatMap(tenant => {
                        // If tenant has rental units, show each unit as a separate option
                        if (tenant.rental_units && tenant.rental_units.length > 0) {
                          return tenant.rental_units.map((unit) => ({
                            value: tenant.id,
                            label: getTenantDisplayText(tenant, unit),
                          }));
                        }
                        // If no rental units, just show tenant name
                        return [{
                          value: tenant.id,
                          label: tenant.full_name || `${tenant.first_name} ${tenant.last_name}`,
                        }];
                      })}
                      value={formData.tenant_id}
                      onChange={(val) => handleTenantChange(Number(val))}
                      placeholder={`Select Tenant (${tenants.length} available)`}
                      searchPlaceholder="Search tenants by name or unit..."
                      required
                    />
                    {/* Display selected tenant details */}
                    {selectedTenant && selectedTenantUnits.length > 0 && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-sm font-medium text-blue-900 mb-1">
                          Selected Tenant Details:
                        </div>
                        <div className="space-y-1">
                          {selectedTenantUnits.map((unit) => (
                            <div key={unit.id} className="text-sm text-blue-700">
                              <span className="font-medium">{selectedTenant.full_name || `${selectedTenant.first_name} ${selectedTenant.last_name}`}</span>
                              {unit.property?.name && (
                                <> - <span className="font-medium">{unit.property.name}</span></>
                              )}
                              {unit.unit_number && (
                                <> - <span className="font-medium">Unit {unit.unit_number}</span></>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedTenant && (!selectedTenantUnits || selectedTenantUnits.length === 0) && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-sm font-medium text-gray-900">
                          {selectedTenant.full_name || `${selectedTenant.first_name} ${selectedTenant.last_name}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          No rental units assigned
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rental Unit selection is now hidden - invoices are fetched for all units of the tenant */}
                  {false && formData.tenant_id > 0 && rentalUnits.length > 0 && (
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

                  {formData.tenant_id > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Type *
                        {paymentTypeLocked && (
                          <span className="text-blue-600 text-xs ml-2">(Locked - Auto-selected)</span>
                        )}
                      </label>
                      <Select
                        value={formData.payment_type_id}
                        onChange={(e) => handlePaymentTypeChange(Number(e.target.value))}
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
                  )}

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
                      {(selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) && (
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
                        if ((selectedInvoices.length === 0 && selectedMaintenanceInvoices.length === 0) || isAdvanceRentPayment()) {
                          const numericValue = parseFloat(e.target.value) || 0;
                          setFormData(prev => ({ 
                            ...prev, 
                            credit_amount: numericValue,
                            debit_amount: numericValue > 0 ? 0 : prev.debit_amount
                          }));
                        }
                      }}
                      placeholder="0.00"
                      readOnly={(selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) && !isAdvanceRentPayment()}
                      className={(selectedInvoices.length > 0 || selectedMaintenanceInvoices.length > 0) && !isAdvanceRentPayment() ? 'bg-blue-50 border-blue-200' : ''}
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
                        {paymentModes.map(mode => (
                          <option key={mode.id} value={mode.name}>
                            {mode.name}
                          </option>
                        ))}
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
            {formData.tenant_id > 0 && currentInvoiceTypes.length > 0 && (
              <Card className="p-6">
                <FormSection title={`Unpaid ${currentInvoiceTypes.length === 2 ? 'Rent & Maintenance Invoices' : currentInvoiceTypes.includes('rent') ? 'Rent Invoices' : 'Maintenance Invoices'}`}>
                  <div className="space-y-4">
                    {/* Debug status removed */}
                    
                    {currentInvoiceTypes.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-600 mb-4">
                          Select invoices to create payment entries. 
                          {currentInvoiceTypes.length === 2 
                            ? 'You can select both rent and maintenance invoices. Each invoice type will be processed with its appropriate payment type automatically.' 
                            : `Select ${currentInvoiceTypes.includes('rent') ? 'rent invoices' : 'maintenance invoices'} to create payment entries.`}
                          {currentInvoiceTypes.length === 2 && (
                            <span className="block mt-2 text-blue-600 font-medium">
                              Note: When both invoice types are selected, separate payment entries will be created for each type with the correct payment type.
                            </span>
                          )}
                        </div>
                        
                        {/* Rent Invoices Section */}
                        {currentInvoiceTypes.includes('rent') && (
                          <div className="space-y-3">
                            {unpaidInvoices.length > 0 ? (
                              <div>
                                {/* Bulk Payment Toggle - Show only when multiple invoices are selected */}
                                {selectedInvoices.length > 1 && (
                                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <input
                                        type="checkbox"
                                        checked={useBulkPayment}
                                        onChange={(e) => setUseBulkPayment(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">
                                          Combine into Single Payment
                                        </div>
                                        <div className="text-sm text-gray-600">
                                          {useBulkPayment 
                                            ? `Create one payment entry for all ${selectedInvoices.length} invoices (Recommended)`
                                            : `Create separate payment entry for each of the ${selectedInvoices.length} invoices`}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
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
                                Selected Total: {unpaidInvoices.length > 0 ? unpaidInvoices[0].currency : 'MVR'} {selectedInvoices.reduce((sum, id) => {
                                  const inv = unpaidInvoices.find(inv => inv.id === id);
                                  return sum + Number(inv?.total_amount || 0);
                                }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                      {selectedInvoices.includes(invoice.id) && (
                                        <div className="text-xs text-blue-600">Included in total</div>
                                      )}
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
                        
                        {/* Separator when both types are shown */}
                        {currentInvoiceTypes.includes('rent') && currentInvoiceTypes.includes('maintenance') && (
                          <div className="my-6 border-t border-gray-300"></div>
                        )}
                        
                        {/* Maintenance Invoices Section */}
                        {currentInvoiceTypes.includes('maintenance') && (
                          <div className="space-y-3">
                            {unpaidMaintenanceInvoices.length > 0 ? (
                              <div>
                                {/* Select All Maintenance Invoices */}
                                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                  <div className="flex items-center space-x-3">
                                    <input
                                      type="checkbox"
                                      checked={unpaidMaintenanceInvoices.length > 0 && selectedMaintenanceInvoices.length === unpaidMaintenanceInvoices.length}
                                      ref={(input) => {
                                        if (input) input.indeterminate = selectedMaintenanceInvoices.length > 0 && selectedMaintenanceInvoices.length < unpaidMaintenanceInvoices.length;
                                      }}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedMaintenanceInvoices(unpaidMaintenanceInvoices.map(invoice => invoice.id));
                                        } else {
                                          setSelectedMaintenanceInvoices([]);
                                        }
                                      }}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                    />
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        Select All Maintenance Invoices ({unpaidMaintenanceInvoices.length})
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {selectedMaintenanceInvoices.length === unpaidMaintenanceInvoices.length ? 'All maintenance invoices selected' : 
                                         selectedMaintenanceInvoices.length > 0 ? `${selectedMaintenanceInvoices.length} of ${unpaidMaintenanceInvoices.length} selected` :
                                         'Click to select all maintenance invoices'}
                                      </div>
                                    </div>
                                    <div className="ml-auto text-right">
                                      <div className="font-medium text-gray-900">
                                        Selected Total: {unpaidMaintenanceInvoices.length > 0 ? unpaidMaintenanceInvoices[0].currency : 'MVR'} {selectedMaintenanceInvoices.reduce((sum, id) => {
                                          const invoice = unpaidMaintenanceInvoices.find(inv => inv.id === id);
                                          return sum + Number(invoice?.total_amount || 0);
                                        }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {selectedMaintenanceInvoices.length > 0 ? `Selected: ${selectedMaintenanceInvoices.length} invoices` : 'No invoices selected'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                  {unpaidMaintenanceInvoices.map((invoice) => (
                                    <div
                                      key={invoice.id}
                                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                        selectedMaintenanceInvoices.includes(invoice.id)
                                          ? 'border-green-500 bg-green-50'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                      onClick={() => handleInvoiceSelect(invoice.id, !selectedMaintenanceInvoices.includes(invoice.id), 'maintenance')}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          <input
                                            type="checkbox"
                                            key={`checkbox-maintenance-${invoice.id}-${selectedMaintenanceInvoices.includes(invoice.id)}`}
                                            checked={selectedMaintenanceInvoices.includes(invoice.id)}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              console.log('Maintenance checkbox onChange triggered:', { invoiceId: invoice.id, checked: e.target.checked });
                                              handleInvoiceSelect(invoice.id, e.target.checked, 'maintenance');
                                            }}
                                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
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
                                          {selectedMaintenanceInvoices.includes(invoice.id) && (
                                            <div className="text-xs text-green-600">Included in total</div>
                                          )}
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
                                <p className="text-lg font-medium">No unpaid maintenance invoices</p>
                                <p className="text-sm">This tenant has no pending maintenance invoices.</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Removed duplicate summary (selected count/total/payment type) to avoid redundancy */}
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


        {/* Invoice Type Selection Modal */}
        {showInvoiceTypeModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Select Invoice Types
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose which invoice types to view for this tenant. You can select multiple types.
                </p>
                
                <div className="space-y-3 mb-6">
                  {/* Rent Invoices Option */}
                  <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-blue-50 border-blue-200 hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={selectedInvoiceTypes.includes('rent')}
                      onChange={(e) => handleInvoiceTypeToggle('rent', e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Rent Invoices</div>
                      <div className="text-sm text-gray-500 mt-1">
                        View and select unpaid rent invoices for this tenant
                      </div>
                    </div>
                  </label>
                  
                  {/* Maintenance Invoices Option */}
                  <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-green-50 border-green-200 hover:border-green-300">
                    <input
                      type="checkbox"
                      checked={selectedInvoiceTypes.includes('maintenance')}
                      onChange={(e) => handleInvoiceTypeToggle('maintenance', e.target.checked)}
                      className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">Maintenance Invoices</div>
                      <div className="text-sm text-gray-500 mt-1">
                        View and select unpaid maintenance invoices for this tenant
                      </div>
                    </div>
                  </label>
                </div>
                
                {selectedInvoiceTypes.length === 0 && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please select at least one invoice type to continue.
                    </p>
                          </div>
                        )}
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={handleCloseModal}
                    className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmInvoiceTypeSelection}
                    disabled={selectedInvoiceTypes.length === 0}
                    className="text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Continue
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
