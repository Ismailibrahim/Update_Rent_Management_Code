'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Building2, Users, DollarSign, RefreshCw } from 'lucide-react';
import { propertiesAPI, tenantsAPI, rentalUnitsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface DashboardStats {
  totalProperties: number;
  totalTenants: number;
  totalRentalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  monthlyRevenue: number;
  maintenanceRequests: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalTenants: 0,
    totalRentalUnits: 0,
    occupiedUnits: 0,
    availableUnits: 0,
    monthlyRevenue: 0,
    maintenanceRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!authLoading && user) {
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('Please log in to view dashboard data');
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel with timeout
      const [propertiesRes, tenantsRes, rentalUnitsRes] = await Promise.all([
        propertiesAPI.getAll().catch(() => ({ data: { properties: [] } })),
        tenantsAPI.getAll().catch(() => ({ data: { tenants: [] } })),
        rentalUnitsAPI.getAll().catch(() => ({ data: { rentalUnits: [] } }))
      ]);

      const properties = propertiesRes.data.properties || [];
      const tenants = tenantsRes.data.tenants || [];
      const rentalUnits = rentalUnitsRes.data.rentalUnits || [];

      // Calculate stats
      const occupiedUnits = rentalUnits.filter((unit: { status: string }) => unit.status === 'occupied').length;
      const availableUnits = rentalUnits.filter((unit: { status: string }) => unit.status === 'available').length;
      
      setStats({
        totalProperties: properties.length,
        totalTenants: tenants.length,
        totalRentalUnits: rentalUnits.length,
        occupiedUnits,
        availableUnits,
        monthlyRevenue: 0, // Payments API is not working, set to 0
        maintenanceRequests: 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SidebarLayout>
        <div className="space-y-8">
          {/* Page Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white border border-gray-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Metrics Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="bg-white border border-gray-200">
                <CardHeader className="pb-3">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">{error}</div>
            <p className="text-gray-600">Please log in to view your dashboard data.</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
          {/* Page Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome to your rental property management dashboard
              </p>
            </div>
            <button
              onClick={() => {
                fetchDashboardData();
              }}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Properties
              </CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalProperties}</div>
              <p className="text-sm text-gray-500">
                Properties managed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Tenants
              </CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalTenants}</div>
              <p className="text-sm text-gray-500">
                Active tenants
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Rental Units
              </CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Building2 className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalRentalUnits}</div>
              <p className="text-sm text-gray-500">
                {stats.occupiedUnits} occupied, {stats.availableUnits} available
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Revenue
              </CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                MVR {stats.monthlyRevenue.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500">
                All time revenue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Occupancy Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {stats.totalRentalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalRentalUnits) * 100) : 0}%
              </div>
              <p className="text-sm text-gray-500">
                {stats.occupiedUnits} of {stats.totalRentalUnits} units occupied
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Available Units</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">{stats.availableUnits}</div>
              <p className="text-sm text-gray-500">
                Ready for new tenants
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900">Average Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                MVR {stats.totalRentalUnits > 0 && stats.monthlyRevenue > 0 ? Math.round(stats.monthlyRevenue / stats.totalRentalUnits).toLocaleString() : '0'}
              </div>
              <p className="text-sm text-gray-500">
                Per rental unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">System Overview</CardTitle>
            <CardDescription className="text-gray-600">
              Current system status and key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Properties Management</p>
                  <p className="text-xs text-gray-500">Managing {stats.totalProperties} properties across the system</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Tenant Relations</p>
                  <p className="text-xs text-gray-500">{stats.totalTenants} active tenants in the system</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Unit Availability</p>
                  <p className="text-xs text-gray-500">{stats.availableUnits} units available for rent</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Revenue Tracking</p>
                  <p className="text-xs text-gray-500">Total revenue: MVR {stats.monthlyRevenue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}