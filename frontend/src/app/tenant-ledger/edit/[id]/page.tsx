'use client';

import React, { useState, useEffect } from 'react';
import { tenantLedgerAPI, tenantsAPI, paymentTypesAPI, paymentModesAPI, Tenant, PaymentType, PaymentMode } from '@/services/api';
import { safeToISODate } from '@/utils/date';
import { Button } from '@/components/UI/Button';
import { Card } from '@/components/UI/Card';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { FormSection } from '@/components/UI/FormSection';
import { Textarea } from '@/components/UI/Textarea';
import { ArrowLeft, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter, useParams } from 'next/navigation';
import SidebarLayout from '../../../../components/Layout/SidebarLayout';

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

export default function EditTenantLedgerPage() {
  const router = useRouter();
  const params = useParams();
  const ledgerId = params.id as string;
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullAmountChecked, setFullAmountChecked] = useState(false);
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
  }, [ledgerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    if (!ledgerId) {
      toast.error('Invalid ledger entry ID');
      router.push('/tenant-ledger');
      return;
    }

    setLoading(true);
    try {
      const [tenantsRes, paymentTypesRes, paymentModesRes, ledgerRes] = await Promise.all([
        tenantsAPI.getAll(),
        paymentTypesAPI.getAll(),
        paymentModesAPI.getAll(),
        tenantLedgerAPI.getById(Number(ledgerId)),
      ]);

      const tenantsData = tenantsRes.data?.tenants || [];
      const paymentTypesData = paymentTypesRes.data?.payment_types || [];
      const paymentModesData = paymentModesRes.data?.payment_modes || [];
      
      setTenants(tenantsData);
      setPaymentTypes(paymentTypesData);
      setPaymentModes(paymentModesData);
      
      // Populate form with existing data
      // Backend returns { success: true, data: {...} }, so we need to access ledgerRes.data.data
      const ledger = ledgerRes.data?.data || ledgerRes.data;
      
      if (!ledger || !ledger.ledger_id) {
        console.error('Invalid ledger data received:', ledgerRes);
        toast.error('Failed to load ledger entry data');
        router.push('/tenant-ledger');
        return;
      }
      
      // Safe date handling using utility function
      const transactionDate = safeToISODate(ledger.transaction_date);
      
      setFormData({
        tenant_id: ledger.tenant_id || 0,
        payment_type_id: ledger.payment_type_id || 0,
        transaction_date: transactionDate || new Date().toISOString().slice(0, 10),
        description: ledger.description || '',
        reference_no: ledger.reference_no || '',
        debit_amount: ledger.debit_amount ?? 0,
        credit_amount: ledger.credit_amount ?? 0,
        payment_method: ledger.payment_method || '',
        transfer_reference_no: ledger.transfer_reference_no || '',
        remarks: ledger.remarks || '',
        created_by: ledger.created_by || 'Admin',
      });
    } catch (error) {
      console.error('Error loading data:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      toast.error(axiosError.response?.data?.message || 'Failed to load ledger entry');
      router.push('/tenant-ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Validation
      if (!formData.tenant_id || formData.tenant_id === 0 || !formData.payment_type_id || formData.payment_type_id === 0 || !formData.description) {
        toast.error('Please fill in all required fields');
        setSaving(false);
        return;
      }

      if (formData.debit_amount === 0 && formData.credit_amount === 0) {
        toast.error('Either debit or credit amount must be greater than 0');
        setSaving(false);
        return;
      }

      if (formData.debit_amount > 0 && formData.credit_amount > 0) {
        toast.error('Cannot have both debit and credit amounts in the same transaction');
        setSaving(false);
        return;
      }

      // Ensure transaction_date is in YYYY-MM-DD format (date only, no time)
      const transactionDate = safeToISODate(formData.transaction_date);

      const submitData = {
        tenant_id: formData.tenant_id,
        payment_type_id: formData.payment_type_id,
        transaction_date: transactionDate,
        description: formData.description,
        reference_no: formData.reference_no || null,
        debit_amount: formData.debit_amount || 0,
        credit_amount: formData.credit_amount || 0,
        payment_method: formData.payment_method || null,
        transfer_reference_no: formData.transfer_reference_no || null,
        remarks: formData.remarks || null,
        created_by: formData.created_by || null,
      };

      console.log('Submitting update with data:', submitData);

      await tenantLedgerAPI.update(Number(ledgerId), submitData);
      toast.success('Ledger entry updated successfully');
      router.push('/tenant-ledger');
    } catch (error: unknown) {
      console.error('Error updating ledger entry:', error);
      const axiosError = error as { 
        response?: { 
          status?: number;
          data?: { 
            message?: string;
            error?: string;
            errors?: Record<string, string[]>;
          } 
        } 
      };
      
      if (axiosError.response) {
        console.error('Error response status:', axiosError.response.status);
        console.error('Error response data:', axiosError.response.data);
        
        // Handle validation errors
        if (axiosError.response.status === 422 && axiosError.response.data?.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat();
          toast.error(errorMessages.join(', ') || 'Validation failed');
        } else {
          // Handle other errors
          const errorMessage = axiosError.response.data?.error || 
                              axiosError.response.data?.message || 
                              'Failed to update ledger entry';
          toast.error(errorMessage);
        }
      } else {
        toast.error('Failed to update ledger entry. Please check your connection.');
      }
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Edit Ledger Entry</h1>
              <p className="mt-2 text-gray-600">
                Update financial transaction record
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Transaction Details Section */}
            <Card className="p-6">
              <FormSection title="Transaction Details">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tenant *
                    </label>
                    <Select
                      value={formData.tenant_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, tenant_id: Number(e.target.value) }))}
                      required
                    >
                      <option value={0}>Select Tenant</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.full_name || `${tenant.first_name} ${tenant.last_name}`}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Type *
                    </label>
                    <Select
                      value={formData.payment_type_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_type_id: Number(e.target.value) }))}
                      required
                    >
                      <option value={0}>Select Payment Type</option>
                      {paymentTypes.map(type => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transaction Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.transaction_date || ''}
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
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="e.g., Monthly Rent, Security Deposit, Maintenance Fee"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference No.
                    </label>
                    <Input
                      type="text"
                      value={formData.reference_no || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_no: e.target.value }))}
                      placeholder="Invoice number, receipt number, or transaction ID"
                    />
                  </div>
                </div>
              </FormSection>
            </Card>

            {/* Financial Details Section */}
            <Card className="p-6">
              <FormSection title="Financial Details">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Amount (Amount Owed)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.debit_amount ?? 0}
                      onChange={(e) => {
                        const newDebitAmount = Number(e.target.value) || 0;
                        setFormData(prev => ({ 
                          ...prev, 
                          debit_amount: newDebitAmount,
                          credit_amount: newDebitAmount > 0 ? 0 : prev.credit_amount
                        }));
                        // Uncheck "Full Amount" if user changes debit amount
                        if (fullAmountChecked) {
                          setFullAmountChecked(false);
                        }
                      }}
                      placeholder="0.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Amount charged to tenant (rent, fees, penalties, etc.)
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Credit Amount (Payment Received)
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fullAmountChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFullAmountChecked(checked);
                            if (checked) {
                              // Copy debit amount to credit amount
                              setFormData(prev => ({
                                ...prev,
                                credit_amount: prev.debit_amount || 0,
                                debit_amount: 0 // Clear debit when credit is set
                              }));
                            } else {
                              // Clear credit amount
                              setFormData(prev => ({
                                ...prev,
                                credit_amount: 0
                              }));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">Full Amount</span>
                      </label>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.credit_amount ?? 0}
                      onChange={(e) => {
                        const newCreditAmount = Number(e.target.value) || 0;
                        setFormData(prev => ({ 
                          ...prev, 
                          credit_amount: newCreditAmount,
                          debit_amount: newCreditAmount > 0 ? 0 : prev.debit_amount
                        }));
                        // Uncheck "Full Amount" if user manually changes the value
                        if (fullAmountChecked) {
                          setFullAmountChecked(false);
                        }
                      }}
                      placeholder="0.00"
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
                        value={formData.payment_method || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      >
                        <option value="">Select Payment Method</option>
                        {paymentModes.filter(mode => mode.is_active).map(mode => (
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
                      value={formData.transfer_reference_no || ''}
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
                      value={formData.created_by || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, created_by: e.target.value }))}
                      placeholder="User who created this entry"
                    />
                  </div>
                </div>
              </FormSection>
            </Card>
          </div>

          {/* Additional Information Section */}
          <Card className="p-6">
            <FormSection title="Additional Information">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remarks
                </label>
                <Textarea
                  value={formData.remarks || ''}
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
              type="submit"
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Updating...' : 'Update Entry'}
            </Button>
          </div>
        </form>
      </div>
    </SidebarLayout>
  );
}
