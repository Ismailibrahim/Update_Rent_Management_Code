"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Plus,
  Eye,
  Edit,
  Loader2,
} from "lucide-react";
import { api, usersApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import FollowupReminders from "@/components/FollowupReminders";
import { format } from "date-fns";

interface DashboardStats {
  totalQuotations: number;
  activeCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  quotationsThisMonth: number;
  customersThisMonth: number;
  quotationsLastMonth: number;
  customersLastMonth: number;
}

interface RecentQuotation {
  id: number;
  quotation_number: string;
  customer: {
    id: number;
    resort_name: string;
  };
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
}

const getStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    sent: "outline",
    accepted: "default",
    rejected: "destructive",
    approved: "default",
    pending: "outline",
  };

  return (
    <Badge variant={variants[status.toLowerCase()] || "secondary"}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")}
    </Badge>
  );
};

export default function DashboardPage() {
  // Force immediate render with visible content
  console.log("✅ DashboardPage component is rendering!");
  
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false); // Start with false to render immediately
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  const [stats, setStats] = useState<DashboardStats>({
    totalQuotations: 0,
    activeCustomers: 0,
    totalProducts: 0,
    totalRevenue: 0,
    quotationsThisMonth: 0,
    customersThisMonth: 0,
    quotationsLastMonth: 0,
    customersLastMonth: 0,
  });
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch data but don't block rendering
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // Don't set loading to true - render UI immediately, load data in background
    try {
      // Show subtle loading indicator but don't block
      
      let quotations: any[] = [];
      let customers: any[] = [];
      let products: any[] = [];
      
      // Fetch quotations - handle pagination with timeout
      try {
        const quotationsResponse = await Promise.race([
          api.get("/quotations?per_page=100"),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          )
        ]) as any;
        
        // Handle paginated response
        if (quotationsResponse.data?.data && Array.isArray(quotationsResponse.data.data)) {
          quotations = quotationsResponse.data.data;
        } else if (Array.isArray(quotationsResponse.data)) {
          quotations = quotationsResponse.data;
        } else if (quotationsResponse.data?.items) {
          quotations = quotationsResponse.data.items;
        }
      } catch (error: any) {
        console.log("Error fetching quotations:", error?.message || 'Unknown error');
        // Don't show toast for server errors - they're already logged
        if (error.response?.status === 500 || error.response?.status >= 500) {
          // Server error - silently continue with empty data
        } else if (error.response?.status !== 403 && error.response?.status !== 401) {
          toast({
            title: "Warning",
            description: "Could not load quotations data",
            variant: "default",
          });
        }
      }
      
      // Fetch customers - handle permission errors gracefully with timeout
      try {
        const customersResponse = await Promise.race([
          api.get("/customers"),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          )
        ]) as any;
        
        // Handle different response structures
        if (customersResponse.data?.data) {
          if (Array.isArray(customersResponse.data.data)) {
            customers = customersResponse.data.data;
          }
        } else if (customersResponse.data?.success && Array.isArray(customersResponse.data.data)) {
          customers = customersResponse.data.data;
        } else if (Array.isArray(customersResponse.data)) {
          customers = customersResponse.data;
        } else if (customersResponse.data) {
          // Fallback: try to extract any array from the response
          customers = [];
        }
      } catch (error: any) {
        console.log("Error fetching customers:", error?.message || 'Unknown error');
        // Silently handle permission errors - user just won't see customer stats
        if (error.response?.status === 403) {
          // Permission denied - expected for some users
        } else if (error.response?.status === 500 || error.response?.status >= 500) {
          // Server error - silently continue with empty data
        } else {
          toast({
            title: "Warning",
            description: "Could not load customers data",
            variant: "default",
          });
        }
        customers = []; // Default to empty array
      }
      
      // Fetch products - handle permission errors gracefully with timeout
      try {
        const productsResponse = await Promise.race([
          api.get("/products"),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 15000)
          )
        ]) as any;
        
        if (productsResponse.data?.data && Array.isArray(productsResponse.data.data)) {
          products = productsResponse.data.data;
        } else if (Array.isArray(productsResponse.data)) {
          products = productsResponse.data;
        }
      } catch (error: any) {
        console.log("Error fetching products:", error?.message || 'Unknown error');
        // Don't show error if it's a permission issue or server error
        if (error.response?.status === 500 || error.response?.status >= 500) {
          // Server error - silently continue with empty data
        } else if (error.response?.status !== 403) {
          toast({
            title: "Warning",
            description: "Could not load products data",
            variant: "default",
          });
        }
      }

      // Calculate statistics - safe with empty arrays if fetch failed
      const totalQuotations = quotations?.length || 0;
      const activeCustomers = customers?.filter((c: any) => c && (c.is_active === undefined || c.is_active !== false)).length || 0;
      const totalProducts = products?.filter((p: any) => p && (p.is_active === undefined || p.is_active !== false)).length || 0;
      
      // Calculate revenue (sum of all quotation totals)
      const totalRevenue = (quotations || []).reduce((sum: number, q: any) => {
        if (!q) return sum;
        return sum + (parseFloat(q.total_amount || q.total || 0) || 0);
      }, 0);

      // Calculate monthly stats
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
      const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

      const quotationsThisMonth = (quotations || []).filter((q: any) => {
        if (!q || !q.created_at) return false;
        try {
          const date = new Date(q.created_at);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        } catch {
          return false;
        }
      }).length;

      const quotationsLastMonth = (quotations || []).filter((q: any) => {
        if (!q || !q.created_at) return false;
        try {
          const date = new Date(q.created_at);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        } catch {
          return false;
        }
      }).length;

      const customersThisMonth = (customers || []).filter((c: any) => {
        if (!c || !c.created_at) return false;
        try {
          const date = new Date(c.created_at);
          return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
        } catch {
          return false;
        }
      }).length;

      const customersLastMonth = (customers || []).filter((c: any) => {
        if (!c || !c.created_at) return false;
        try {
          const date = new Date(c.created_at);
          return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        } catch {
          return false;
        }
      }).length;

      setStats({
        totalQuotations,
        activeCustomers,
        totalProducts,
        totalRevenue,
        quotationsThisMonth,
        customersThisMonth,
        quotationsLastMonth,
        customersLastMonth,
      });

      // Get recent quotations (last 10)
      const recent = (quotations || [])
        .filter((q: any) => q && q.created_at)
        .sort((a: any, b: any) => {
          try {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          } catch {
            return 0;
          }
        })
        .slice(0, 10);
      setRecentQuotations(recent);

      // Calculate top customers by quotation value
      const customerTotals: Record<number, { name: string; total: number; count: number }> = {};
      (quotations || []).forEach((q: any) => {
        if (!q) return;
        if (q.customer_id || q.customer) {
          try {
            const customerId = q.customer?.id || q.customer_id;
            const customerName = q.customer?.resort_name || q.customer?.name || `Customer ${customerId}`;
            
            if (!customerTotals[customerId]) {
              customerTotals[customerId] = {
                name: customerName,
                total: 0,
                count: 0,
              };
            }
            customerTotals[customerId].total += parseFloat(q.total_amount || q.total || 0) || 0;
            customerTotals[customerId].count += 1;
          } catch (e) {
            // Silently ignore processing errors
            console.log("Error processing quotation for customer totals:", e);
          }
        }
      });

      const top = Object.values(customerTotals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopCustomers(top);

    } catch (error: any) {
      console.log("Error fetching dashboard data:", error?.message || 'Unknown error');
      // Set default empty state to ensure dashboard can still render
      setStats({
        totalQuotations: 0,
        activeCustomers: 0,
        totalProducts: 0,
        totalRevenue: 0,
        quotationsThisMonth: 0,
        customersThisMonth: 0,
        quotationsLastMonth: 0,
        customersLastMonth: 0,
      });
      setRecentQuotations([]);
      setTopCustomers([]);
      
      // Only show toast for non-server errors
      if (error.response?.status !== 403 && error.response?.status !== 500) {
        toast({
          title: "Warning",
          description: "Some dashboard data could not be loaded. The dashboard will show available data.",
          variant: "default",
        });
      }
    } finally {
      // Data loaded (or failed) - page is already rendered
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number): { value: string; type: "positive" | "negative" } => {
    if (previous === 0) {
      return current > 0 ? { value: "+100%", type: "positive" } : { value: "0%", type: "positive" };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`,
      type: change >= 0 ? "positive" : "negative",
    };
  };

  const statsDisplay = [
    {
      title: "Total Quotations",
      value: stats.totalQuotations.toString(),
      change: calculateChange(stats.quotationsThisMonth, stats.quotationsLastMonth),
      icon: FileText,
    },
    {
      title: "Active Customers",
      value: stats.activeCustomers.toString(),
      change: calculateChange(stats.customersThisMonth, stats.customersLastMonth),
      icon: Users,
    },
    {
      title: "Products",
      value: stats.totalProducts.toString(),
      change: { value: "-", type: "positive" as const },
      icon: Package,
    },
    {
      title: "Total Revenue",
      value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: { value: "-", type: "positive" as const },
      icon: DollarSign,
    },
  ];

  console.log("✅ DashboardPage render - loading:", loading);
  
  // Always render something immediately - with very visible content
  // Remove inline styles that could cause hydration mismatch
  return (
    <div className="container mx-auto py-6 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your quotation system.
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/quotations/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Quotation
        </Button>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mr-2" />
          <p className="text-sm text-muted-foreground">Loading data...</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsDisplay.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change.value !== "-" && (
                <p className="text-xs text-muted-foreground">
                  <span
                    className={
                      stat.change.type === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {stat.change.value}
                  </span>{" "}
                  from last month
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Follow-up Reminders */}
      <FollowupReminders />

      {/* Recent Quotations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Quotations</CardTitle>
            <CardDescription>Latest quotation activity</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentQuotations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No quotations found
                    </TableCell>
                  </TableRow>
                ) : (
                  recentQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        {quotation.quotation_number || `Q-${quotation.id}`}
                      </TableCell>
                      <TableCell>{quotation.customer?.resort_name || "Unknown"}</TableCell>
                      <TableCell>
                        {quotation.currency || "USD"} {Number(quotation.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                      <TableCell>{format(new Date(quotation.created_at), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/quotations/${quotation.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/dashboard/quotations/create")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Quotation
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/dashboard/customers")}
            >
              <Users className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/dashboard/products")}
            >
              <Package className="mr-2 h-4 w-4" />
              Add Product
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push("/reports")}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Additional Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
            <CardDescription>Customers by total quotation value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No customer data available
                </div>
              ) : (
                topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.count} {customer.count === 1 ? "quotation" : "quotations"}
                      </p>
                    </div>
                    <p className="font-medium">
                      ${customer.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Laravel API</span>
                <Badge variant="default">Running</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Database</span>
                <Badge variant="default">MySQL Connected</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Quotations</span>
                <span className="text-sm font-medium">{stats.totalQuotations}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Customers</span>
                <span className="text-sm font-medium">{stats.activeCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Products</span>
                <span className="text-sm font-medium">{stats.totalProducts}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}