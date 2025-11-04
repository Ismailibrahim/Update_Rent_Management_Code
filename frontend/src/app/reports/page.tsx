'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { BarChart3, Download, TrendingUp, DollarSign, Users, Building2, Package, RefreshCw, X } from 'lucide-react';
import { propertiesAPI, tenantsAPI, rentalUnitsAPI, maintenanceCostsAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { toast } from 'react-hot-toast';

interface ReportStats {
  totalProperties: number;
  totalTenants: number;
  totalRentalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  totalMaintenanceCosts: number;
  totalRevenue: number;
}

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ReportStats>({
    totalProperties: 0,
    totalTenants: 0,
    totalRentalUnits: 0,
    occupiedUnits: 0,
    availableUnits: 0,
    totalMaintenanceCosts: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{type: string, name: string} | null>(null);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Cache data for 30 seconds
  const CACHE_DURATION = 30000;

  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const dataPromise = Promise.all([
        propertiesAPI.getAll(),
        tenantsAPI.getAll(),
        rentalUnitsAPI.getAll(),
        maintenanceCostsAPI.getAll()
      ]);

      const [propertiesResponse, tenantsResponse, rentalUnitsResponse, maintenanceResponse] = 
        await Promise.race([dataPromise, timeoutPromise]) as [
          { data: { properties: unknown[] } },
          { data: { tenants: unknown[] } },
          { data: { rentalUnits: unknown[] } },
          { data: { maintenanceCosts: unknown[] } }
        ];

      const properties = (propertiesResponse.data.properties || []) as unknown[];
      const tenants = (tenantsResponse.data.tenants || []) as unknown[];
      const rentalUnits = (rentalUnitsResponse.data.rentalUnits || []) as { status: string }[];
      const maintenanceCosts = (maintenanceResponse.data.maintenanceCosts || []) as { amount?: number }[];

      // Calculate statistics
      const totalProperties = properties.length;
      const totalTenants = tenants.length;
      const totalRentalUnits = rentalUnits.length;
      const occupiedUnits = rentalUnits.filter(unit => unit.status === 'occupied').length;
      const availableUnits = rentalUnits.filter(unit => unit.status === 'available').length;
      const totalMaintenanceCosts = maintenanceCosts.reduce((sum: number, cost: { amount?: number }) => sum + (cost.amount || 0), 0);

      setStats({
        totalProperties,
        totalTenants,
        totalRentalUnits,
        occupiedUnits,
        availableUnits,
        totalMaintenanceCosts,
        totalRevenue: 0 // Revenue calculation would need payment data
      });

      // Update cache timestamp
      setLastFetch(Date.now());
    } catch (error) {
      console.error('Error fetching reports data:', error);
      setError('Failed to load reports data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!authLoading && user) {
      const now = Date.now();
      // Use cached data if available and not expired
      if (now - lastFetch < CACHE_DURATION && stats.totalProperties > 0) {
        setLoading(false);
        return;
      }
      fetchReportData();
    } else if (!authLoading && !user) {
      setLoading(false);
      setError('Please log in to view reports data');
    }
  }, [user, authLoading, lastFetch, stats.totalProperties, fetchReportData]);

  const handleGenerateReport = async (reportType: string, reportName: string) => {
    setGeneratingReport(true);
    setSelectedReport({ type: reportType, name: reportName });
    
    try {
      // Simulate report generation with actual data processing
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time
      
      // Generate report data based on type
      let generatedData = null;
      
      switch (reportName) {
        case 'Monthly Revenue':
          generatedData = {
            title: 'Monthly Revenue Report',
            period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            totalRevenue: stats.totalRevenue,
            averagePerUnit: stats.totalRentalUnits > 0 ? Math.round(stats.totalRevenue / stats.totalRentalUnits) : 0,
            occupancyRate: stats.totalRentalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalRentalUnits) * 100) : 0,
            summary: `Revenue analysis for ${stats.totalRentalUnits} rental units with ${stats.occupiedUnits} occupied units.`
          };
          break;
          
        case 'Annual Profit/Loss':
          generatedData = {
            title: 'Annual Profit/Loss Report',
            period: new Date().getFullYear().toString(),
            totalRevenue: stats.totalRevenue,
            totalExpenses: stats.totalMaintenanceCosts,
            netProfit: stats.totalRevenue - stats.totalMaintenanceCosts,
            profitMargin: stats.totalRevenue > 0 ? Math.round(((stats.totalRevenue - stats.totalMaintenanceCosts) / stats.totalRevenue) * 100) : 0,
            summary: `Annual financial performance with ${stats.totalMaintenanceCosts} in maintenance costs.`
          };
          break;
          
        case 'Occupancy Rates':
          generatedData = {
            title: 'Occupancy Rate Report',
            period: 'Current Status',
            totalUnits: stats.totalRentalUnits,
            occupiedUnits: stats.occupiedUnits,
            availableUnits: stats.availableUnits,
            occupancyRate: stats.totalRentalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalRentalUnits) * 100) : 0,
            summary: `${stats.occupiedUnits} of ${stats.totalRentalUnits} units are currently occupied.`
          };
          break;
          
        case 'Property Performance':
          generatedData = {
            title: 'Property Performance Report',
            period: 'Current Status',
            totalProperties: stats.totalProperties,
            totalUnits: stats.totalRentalUnits,
            occupiedUnits: stats.occupiedUnits,
            occupancyRate: stats.totalRentalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalRentalUnits) * 100) : 0,
            summary: `Performance analysis across ${stats.totalProperties} properties.`
          };
          break;
          
        case 'Maintenance Costs':
          generatedData = {
            title: 'Maintenance Cost Report',
            period: 'All Time',
            totalCosts: stats.totalMaintenanceCosts,
            averagePerUnit: stats.totalRentalUnits > 0 ? Math.round(stats.totalMaintenanceCosts / stats.totalRentalUnits) : 0,
            totalUnits: stats.totalRentalUnits,
            summary: `Total maintenance costs: MVR ${stats.totalMaintenanceCosts.toLocaleString()}`
          };
          break;
          
        case 'Tenant Payment History':
          generatedData = {
            title: 'Tenant Payment History Report',
            period: 'All Time',
            totalTenants: stats.totalTenants,
            occupiedUnits: stats.occupiedUnits,
            occupancyRate: stats.totalRentalUnits > 0 ? Math.round((stats.occupiedUnits / stats.totalRentalUnits) * 100) : 0,
            summary: `Payment history for ${stats.totalTenants} active tenants.`
          };
          break;
          
        case 'Asset Inventory':
          generatedData = {
            title: 'Asset Inventory Report',
            period: 'Current Status',
            totalProperties: stats.totalProperties,
            totalUnits: stats.totalRentalUnits,
            summary: `Asset inventory across ${stats.totalProperties} properties and ${stats.totalRentalUnits} units.`
          };
          break;
          
        default:
          generatedData = {
            title: `${reportName} Report`,
            period: 'Current Status',
            summary: `Report generated for ${reportName} with current system data.`,
            totalProperties: stats.totalProperties,
            totalTenants: stats.totalTenants,
            totalUnits: stats.totalRentalUnits
          };
      }
      
      setReportData(generatedData);
      setShowReportModal(true);
      toast.success(`${reportName} report generated successfully!`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleDownloadReport = (reportType: string, reportName: string) => {
    if (!reportData) {
      toast.error('Please generate the report first before downloading.');
      return;
    }
    
    // Create a simple text report
    const reportContent = `
${reportData.title}
Generated on: ${new Date().toLocaleDateString()}
Period: ${reportData.period}

${Object.entries(reportData)
  .filter(([key]) => key !== 'title' && key !== 'period' && key !== 'summary')
  .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${value}`)
  .join('\n')}

Summary:
${reportData.summary}

---
Generated by Rent Management System
    `.trim();
    
    // Create and download file
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success(`${reportName} report downloaded successfully!`);
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setSelectedReport(null);
    setReportData(null);
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

          {/* Report Categories Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white border border-gray-200">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
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
            <p className="text-gray-600">Please log in to view your reports data.</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const reportCards = [
    {
      title: 'Financial Report',
      description: 'Revenue, expenses, and profit analysis',
      icon: DollarSign,
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
      reports: ['Monthly Revenue', 'Annual Profit/Loss', 'Expense Breakdown', 'Payment Trends']
    },
    {
      title: 'Property Report',
      description: 'Property performance and occupancy rates',
      icon: Building2,
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
      reports: ['Occupancy Rates', 'Property Performance', 'Rental Income by Property', 'Maintenance Costs']
    },
    {
      title: 'Tenant Report',
      description: 'Tenant analytics and payment history',
      icon: Users,
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
      reports: ['Tenant Payment History', 'Lease Expirations', 'Tenant Satisfaction', 'Move-in/Move-out Trends']
    },
    {
      title: 'Asset Report',
      description: 'Asset inventory and maintenance tracking',
      icon: Package,
      color: 'bg-gray-100',
      iconColor: 'text-gray-600',
      reports: ['Asset Inventory', 'Maintenance Schedule', 'Depreciation Report', 'Asset Utilization']
    }
  ];

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
            <p className="mt-2 text-gray-600">
              Generate and download comprehensive reports
            </p>
          </div>
          <button
            onClick={() => {
              setLastFetch(0); // Force refresh by clearing cache
              fetchReportData();
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
                Maintenance Costs
              </CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                MVR {stats.totalMaintenanceCosts.toLocaleString()}
              </div>
              <p className="text-sm text-gray-500">
                Total maintenance costs
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
              <CardTitle className="text-lg font-semibold text-gray-900">Average Maintenance Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                MVR {stats.totalRentalUnits > 0 ? Math.round(stats.totalMaintenanceCosts / stats.totalRentalUnits).toLocaleString() : '0'}
              </div>
              <p className="text-sm text-gray-500">
                Per rental unit
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Report Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reportCards.map((category, index) => (
            <Card key={index} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${category.color}`}>
                    <category.icon className={`h-6 w-6 ${category.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.reports.map((report, reportIndex) => (
                    <div key={reportIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{report}</span>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGenerateReport(category.title, report)}
                          disabled={loading || generatingReport}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {generatingReport && selectedReport?.name === report ? 'Generating...' : 'Generate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadReport(category.title, report)}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Overview */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Reports Overview</CardTitle>
            <CardDescription className="text-gray-600">
              Current system status and available reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Financial Reports</p>
                  <p className="text-xs text-gray-500">Revenue tracking and financial analysis reports</p>
                </div>
                  </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Property Reports</p>
                  <p className="text-xs text-gray-500">Property performance and occupancy analysis</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Tenant Reports</p>
                  <p className="text-xs text-gray-500">Tenant analytics and payment history reports</p>
                </div>
              </div>
              <div className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="w-3 h-3 bg-gray-400 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">Asset Reports</p>
                  <p className="text-xs text-gray-500">Asset inventory and maintenance tracking reports</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Modal */}
        {showReportModal && reportData && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{String(reportData.title)}</h2>
                  <button
                    onClick={closeReportModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Generated:</span>
                        <span className="ml-2 text-gray-900">{new Date().toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Period:</span>
                        <span className="ml-2 text-gray-900">{String(reportData.period)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(reportData)
                      .filter(([key]) => key !== 'title' && key !== 'period' && key !== 'summary')
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="font-medium text-gray-600">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                          </span>
                          <span className="text-gray-900 font-semibold">
                            {typeof value === 'number' && key.toLowerCase().includes('cost') ? `MVR ${value.toLocaleString()}` : 
                             typeof value === 'number' && key.toLowerCase().includes('rate') ? `${value}%` :
                             typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Summary</h3>
                    <p className="text-blue-800 text-sm">{String(reportData.summary)}</p>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={closeReportModal}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => handleDownloadReport(selectedReport?.type || '', selectedReport?.name || '')}
                      className="flex items-center"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
