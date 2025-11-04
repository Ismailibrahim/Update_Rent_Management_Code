'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/UI/Card';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { Select } from '@/components/UI/Select';
import { FileText, Calendar, Users, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { rentInvoicesAPI, rentalUnitsAPI } from '@/services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '@/components/Layout/SidebarLayout';

interface RentalUnit {
  id: number;
  unit_number: string;
  floor_number: number;
  // New separate columns
  rent_amount: number;
  currency: string;
  property: {
    id: number;
    name: string;
  };
  tenant: {
    id: number;
    first_name: string;
    last_name: string;
    full_name?: string;
  };
  status: string;
}

interface GenerationResult {
  generated_count: number;
  invoices: Record<string, unknown>[];
  errors: string[];
}

export default function MonthlyRentPage() {
  const [occupiedUnits, setOccupiedUnits] = useState<RentalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null);
  
  // Form state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dueDateOffset, setDueDateOffset] = useState(7);

  useEffect(() => {
    fetchOccupiedUnits();
  }, []);

  const fetchOccupiedUnits = async () => {
    try {
      setLoading(true);
      const response = await rentalUnitsAPI.getAll({ status: 'occupied' });
      setOccupiedUnits(response.data.rentalUnits || []);
    } catch (error) {
      console.error('Error fetching occupied units:', error);
      toast.error('Failed to fetch occupied rental units');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoices = async () => {
    if (occupiedUnits.length === 0) {
      toast.error('No occupied rental units found');
      return;
    }

    try {
      setGenerating(true);
      const response = await rentInvoicesAPI.generateMonthly({
        month: selectedMonth,
        year: selectedYear,
        due_date_offset: dueDateOffset
      });

      setGenerationResult(response.data);
      
      if (response.data.generated_count > 0) {
        toast.success(`Successfully generated ${response.data.generated_count} invoices`);
      }
      
      if (response.data.errors.length > 0) {
        toast.error(`${response.data.errors.length} invoices could not be generated`);
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

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const formatCurrency = (amount: number, currency: string = 'MVR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'MVR' ? 'USD' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('$', currency === 'MVR' ? 'MVR ' : '$');
  };

  const calculateTotalRent = () => {
    return occupiedUnits.reduce((total, unit) => {
      return total + (unit.rent_amount || 0);
    }, 0);
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monthly Rent Generation</h1>
            <p className="mt-2 text-gray-600">
              Generate invoices for all occupied rental units
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Occupied Units</p>
                  <p className="text-2xl font-bold text-gray-900">{occupiedUnits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(calculateTotalRent())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Target Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Generate Invoices
            </CardTitle>
            <CardDescription>
              Configure the invoice generation parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateInvoices}
                disabled={generating || occupiedUnits.length === 0}
                className="flex items-center"
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
          </CardContent>
        </Card>

        {/* Generation Results */}
        {generationResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                {generationResult.generated_count > 0 ? (
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
                )}
                Generation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">
                      {generationResult.generated_count} invoices generated successfully
                    </span>
                  </div>
                  {generationResult.errors.length > 0 && (
                    <div className="flex items-center text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">
                        {generationResult.errors.length} errors
                      </span>
                    </div>
                  )}
                </div>

                {generationResult.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {generationResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {generationResult.invoices.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Generated Invoices:</h4>
                    <div className="space-y-2">
                      {generationResult.invoices.map((invoice, index) => {
                        const invoiceData = invoice as Record<string, unknown>;
                        const tenant = invoiceData.tenant as Record<string, unknown>;
                        const property = invoiceData.property as Record<string, unknown>;
                        const rentalUnit = invoiceData.rental_unit as Record<string, unknown>;
                        
                        return (
                          <div key={index} className="text-sm text-green-700">
                            • {String(invoiceData.invoice_number)} - {String(tenant?.full_name || `${tenant?.first_name} ${tenant?.last_name}`)} 
                            ({String(property?.name)} - Unit {String(rentalUnit?.unit_number)}) - {formatCurrency(invoiceData.total_amount as number, invoiceData.currency as string)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Occupied Units Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Occupied Rental Units</CardTitle>
            <CardDescription>
              Units that will receive invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : occupiedUnits.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No occupied units</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are no occupied rental units to generate invoices for.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {occupiedUnits.map((unit) => (
                      <tr key={unit.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {unit.tenant?.full_name || 'No Tenant'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {unit.property.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          Unit {unit.unit_number}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          {formatCurrency(unit.rent_amount || 0, unit.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
