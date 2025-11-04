'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { DollarSign, Plus, Search, Edit, Trash2, Eye, Star, TrendingUp } from 'lucide-react';
import { currenciesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
  is_active: boolean;
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
  created_at: string;
  updated_at: string;
}

export default function CurrenciesPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await currenciesAPI.getAll();
      setCurrencies(response.data.currencies || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast.error('Failed to fetch currencies');
    } finally {
      setLoading(false);
    }
  };

  const filteredCurrencies = currencies.filter(currency =>
    currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    currency.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteCurrency = async (id: number) => {
    if (!confirm('Are you sure you want to delete this currency?')) return;
    
    try {
      await currenciesAPI.delete(id);
      toast.success('Currency deleted successfully');
      fetchCurrencies();
    } catch (error) {
      console.error('Error deleting currency:', error);
      toast.error('Failed to delete currency');
    }
  };

  const handleSetBaseCurrency = async (id: number) => {
    try {
      await currenciesAPI.update(id, { is_base: true });
      toast.success('Base currency updated successfully');
      fetchCurrencies();
    } catch (error) {
      console.error('Error setting base currency:', error);
      toast.error('Failed to set base currency');
    }
  };

  const formatAmount = (amount: number, currency: Currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimal_places,
      maximumFractionDigits: currency.decimal_places,
    }).format(amount);
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Currencies</h1>
            <p className="mt-2 text-gray-600">
              Manage currencies and exchange rates
            </p>
          </div>
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Currency
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search currencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Currencies Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCurrencies.map((currency) => (
              <Card key={currency.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        {currency.symbol} {currency.code}
                        {currency.is_base && (
                          <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {currency.name}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        currency.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {currency.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {currency.is_base && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                          Base Currency
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Exchange Rate:</span>
                      <span className="text-sm font-medium">{currency.exchange_rate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Decimal Places:</span>
                      <span className="text-sm font-medium">{currency.decimal_places}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Format:</span>
                      <span className="text-sm font-medium">
                        {formatAmount(1234.56, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Separators:</span>
                      <span className="text-sm font-medium">
                        {currency.thousands_separator} / {currency.decimal_separator}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    {!currency.is_base && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSetBaseCurrency(currency.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    {!currency.is_base && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteCurrency(currency.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredCurrencies.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No currencies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first currency.'}
            </p>
            <div className="mt-6">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Currency
              </Button>
            </div>
          </div>
        )}

        {/* Exchange Rate Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900">Exchange Rate Information</CardTitle>
            <CardDescription className="text-gray-600">
              Current exchange rates and conversion tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Live Rates</h3>
                <p className="text-sm text-gray-600">Real-time exchange rates</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Auto Conversion</h3>
                <p className="text-sm text-gray-600">Automatic currency conversion</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Star className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900">Base Currency</h3>
                <p className="text-sm text-gray-600">Set your primary currency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
