'use client';

import React, { useState, useEffect } from 'react';
import { tenantLedgerAPI, tenantsAPI, paymentTypesAPI, Tenant, PaymentType } from '@/services/api';
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
  }, [ledgerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, paymentTypesRes, ledgerRes] = await Promise.all([
        tenantsAPI.getAll(),
        paymentTypesAPI.getAll(),
        tenantLedgerAPI.getById(Number(ledgerId)),
      ]);

      const tenantsData = tenantsRes.data?.tenants || [];
      const paymentTypesData = paymentTypesRes.data?.payment_types || [];
      
      setTenants(tenantsData);
      setPaymentTypes(paymentTypesData);
      
      // Populate form with existing data
      const ledger = ledgerRes.data;
      setFormData({
        tenant_id: ledger.tenant_id,
        payment_type_id: ledger.payment_type_id,
        transaction_date: new Date(ledger.transaction_date).toISOString().slice(0, 10), // Changed to date only
        description: ledger.description,
        reference_no: ledger.reference_no || '',
        debit_amount: ledger.debit_amount,
        credit_amount: ledger.credit_amount,
        payment_method: ledger.payment_method || '',
        transfer_reference_no: ledger.transfer_reference_no || '',
        remarks: ledger.remarks || '',
        created_by: ledger.created_by || 'Admin',
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load ledger entry');
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
        return;
      }

      if (formData.debit_amount === 0 && formData.credit_amount === 0) {
        toast.error('Either debit or credit amount must be greater than 0');
        return;
      }

      if (formData.debit_amount > 0 && formData.credit_amount > 0) {
        toast.error('Cannot have both debit and credit amounts in the same transaction');
        return;
      }

      const submitData = {
        ...formData,
        debit_amount: formData.debit_amount || 0,
        credit_amount: formData.credit_amount || 0,
      };

      await tenantLedgerAPI.update(Number(ledgerId), submitData);
      toast.success('Ledger entry updated successfully');
      router.push('/tenant-ledger');
    } catch (error: unknown) {
      console.error('Error updating ledger entry:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      console.error('Error response:', axiosError.response);
      toast.error(axiosError.response?.data?.message || 'Failed to update ledger entry');
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
                    </label>
                    <Input
                      type="text"
                      value={formData.reference_no}
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
                      value={formData.debit_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        debit_amount: Number(e.target.value),
                        credit_amount: Number(e.target.value) > 0 ? 0 : prev.credit_amount
                      }))}
                      placeholder="0.00"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Amount charged to tenant (rent, fees, penalties, etc.)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Amount (Payment Received)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.credit_amount}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        credit_amount: Number(e.target.value),
                        debit_amount: Number(e.target.value) > 0 ? 0 : prev.debit_amount
                      }))}
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
