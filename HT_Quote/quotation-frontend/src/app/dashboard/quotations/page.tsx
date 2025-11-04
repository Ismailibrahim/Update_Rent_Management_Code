"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { api, quotationsApi, customersApi } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, FileText, Send, Check, X, Eye, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until: string;
  currency: string;
  exchange_rate: number;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  tax_amount: number;
  total_amount: number;
  total_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  notes?: string;
  terms_conditions?: string;
  selected_tc_templates?: number[];
  created_by?: number;
  sent_date?: string;
  accepted_date?: string;
  rejected_date?: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: number;
    resort_name: string;
    holding_company?: string;
    country?: string;
  };
  items?: QuotationItem[];
}

interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency: string;
  discount_percentage: number;
  discount_amount: number;
  tax_rate: number;
  item_total: number;
  parent_item_id?: number;
  is_amc_line: boolean;
  amc_description_used?: string;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    description: string;
  };
}

interface Customer {
  id: number;
  resort_name: string;
  holding_company?: string;
  country?: string;
  resort_code?: string;
}

interface QuotationFormData {
  quotation_number: string;
  customer_id?: number;
  title: string;
  description?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until?: string;
  currency?: string;
  exchange_rate: number;
  discount_percentage: number;
  notes?: string;
  terms_conditions?: string;
}

interface QuotationStatus {
  id: number;
  status_name: string;
  status_key: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statuses, setStatuses] = useState<QuotationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState<QuotationFormData>({
    quotation_number: '',
    customer_id: undefined,
    title: '',
    description: '',
    status: 'draft',
    valid_until: '',
    currency: 'USD',
    exchange_rate: 1,
    discount_percentage: 0,
    notes: '',
    terms_conditions: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Mock data for development
  const mockQuotations: Quotation[] = [
    {
      id: 1,
      quotation_number: 'Q-2024-001',
      customer_id: 1,
      status: 'sent',
      valid_until: '2024-12-31',
      currency: 'USD',
      exchange_rate: 1,
      subtotal: 5000,
      discount_amount: 0,
      discount_percentage: 0,
      tax_amount: 500,
      total_amount: 5500,
      notes: 'Please review and confirm',
      terms_conditions: 'Payment terms: 30 days',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      customer: {
        id: 1,
        resort_name: 'ABC Hotel',
        holding_company: 'ABC Holdings',
        country: 'Maldives'
      }
    }
  ];

  const mockCustomers: Customer[] = [
    {
      id: 1,
      resort_name: 'ABC Hotel',
      holding_company: 'ABC Holdings',
      country: 'Maldives',
      resort_code: 'ABC001'
    }
  ];

  useEffect(() => {
    fetchQuotations();
    fetchCustomers();
    fetchStatuses();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching quotations...');
      const response = await quotationsApi.getAll();
      console.log('✅ Quotations fetched successfully:', response.data);
      
      // Handle paginated response - quotations are in response.data.data
      const quotationsData = response.data?.data || response.data || [];
      const quotationsArray = Array.isArray(quotationsData) ? quotationsData : [];
      setQuotations(quotationsArray);
      
      console.log('📊 Processed quotations:', quotationsArray.length);
    } catch (error: any) {
      console.error('❌ Error fetching quotations:', error);
      
      if (error.code === 'ECONNABORTED') {
        console.error('⏰ Request timed out after 60 seconds');
        toast({
          title: "Timeout Error",
          description: "The request took too long to complete. Please try again.",
          variant: "destructive",
        });
      } else if (error.response?.status === 500) {
        console.error('🚨 Server error:', error.response.data);
        toast({
          title: "Server Error",
          description: error.response.data?.message || "Failed to fetch quotations from server",
          variant: "destructive",
        });
      } else {
        console.error('🔗 Network or other error:', error.message);
        toast({
          title: "Connection Error",
          description: "Unable to connect to server. Please check your connection.",
          variant: "destructive",
        });
      }
      
      // Use mock data on error
      setQuotations(mockQuotations);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      // Handle paginated response - customers are in response.data.data
      const customersData = response.data?.data || response.data || [];
      const customersArray = Array.isArray(customersData) ? customersData : [];
      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Use mock data on error
      setCustomers(mockCustomers);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await api.get('/test-statuses');
      setStatuses(response.data);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      // Fallback to default statuses
      setStatuses([]);
    }
  };

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      const response = await quotationsApi.create(formData);
      setQuotations([...quotations, response.data]);
      setIsCreateDialogOpen(false);
      setFormData({
        quotation_number: '',
        customer_id: undefined,
        title: '',
        description: '',
        status: 'draft',
        valid_until: '',
        currency: 'USD',
        exchange_rate: 1,
        discount_percentage: 0,
        notes: '',
        terms_conditions: ''
      });
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedQuotation) return;

    try {
      setSubmitting(true);
      const response = await quotationsApi.update(selectedQuotation.id.toString(), formData);
      setQuotations(quotations.map(quotation => 
        quotation.id === selectedQuotation.id ? response.data : quotation
      ));
      setIsEditDialogOpen(false);
      setSelectedQuotation(null);
      setFormData({
        quotation_number: '',
        customer_id: undefined,
        title: '',
        description: '',
        status: 'draft',
        valid_until: '',
        currency: 'USD',
        exchange_rate: 1,
        discount_percentage: 0,
        notes: '',
        terms_conditions: ''
      });
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;

    try {
      setSubmitting(true);
      await quotationsApi.delete(selectedQuotation.id.toString());
      setQuotations(quotations.filter(quotation => quotation.id !== selectedQuotation.id));
      setIsDeleteDialogOpen(false);
      setSelectedQuotation(null);
      toast({
        title: "Success",
        description: "Quotation deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting quotation:', error);
      
      let errorMessage = "Failed to delete quotation";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async (quotation: Quotation) => {
    try {
      setSubmitting(true);
      await quotationsApi.send(quotation.id.toString());
      await fetchQuotations(); // Refresh the list
      toast({
        title: "Success",
        description: "Quotation sent successfully",
      });
    } catch (error) {
      console.error('Error sending quotation:', error);
      toast({
        title: "Error",
        description: "Failed to send quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (quotation: Quotation) => {
    try {
      setSubmitting(true);
      await quotationsApi.accept(quotation.id.toString());
      await fetchQuotations(); // Refresh the list
      toast({
        title: "Success",
        description: "Quotation accepted successfully",
      });
    } catch (error) {
      console.error('Error accepting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to accept quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (quotation: Quotation) => {
    try {
      setSubmitting(true);
      await quotationsApi.reject(quotation.id.toString());
      await fetchQuotations(); // Refresh the list
      toast({
        title: "Success",
        description: "Quotation rejected successfully",
      });
    } catch (error) {
      console.error('Error rejecting quotation:', error);
      toast({
        title: "Error",
        description: "Failed to reject quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (quotation: Quotation, newStatus: string) => {
    if (quotation.status === newStatus) return;

    try {
      setSubmitting(true);

      // Call appropriate API based on status transition
      if (newStatus === 'sent') {
        await quotationsApi.send(quotation.id.toString());
      } else if (newStatus === 'accepted') {
        await quotationsApi.accept(quotation.id.toString());
      } else if (newStatus === 'rejected') {
        await quotationsApi.reject(quotation.id.toString());
      } else {
        // For draft and expired, we need a general update endpoint
        await api.put(`/quotations/${quotation.id}`, {
          ...quotation,
          status: newStatus
        });
      }

      await fetchQuotations();
      toast({
        title: "Success",
        description: `Quotation status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        title: "Error",
        description: "Failed to change quotation status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const openEditDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setFormData({
      quotation_number: quotation.quotation_number,
      customer_id: quotation.customer_id,
      title: quotation.title,
      description: quotation.description || '',
      status: quotation.status,
      valid_until: quotation.valid_until || '',
      currency: quotation.currency || 'USD',
      exchange_rate: quotation.exchange_rate || 1,
      discount_percentage: quotation.discount_percentage || 0,
      notes: quotation.notes || '',
      terms_conditions: quotation.terms_conditions || ''
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = async (quotation: Quotation) => {
    console.log('👁️ Opening view dialog for quotation:', quotation.id);
    setIsViewLoading(true);
    
    // Fetch full quotation details with cost and profit data
    try {
      console.log('📡 Fetching quotation details from API...');
      const response = await quotationsApi.getById(quotation.id.toString());
      console.log('✅ API response received:', response.data);
      
      // Handle both old and new response structures
      if (response.data.quotation) {
        // New structure: { quotation: {...}, serviceTerms: [...] }
        setSelectedQuotation(response.data.quotation);
      } else {
        // Old structure: direct quotation data
        setSelectedQuotation(response.data);
      }
    } catch (error: any) {
      console.error('❌ Error fetching quotation details:', error);
      console.error('📄 Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        quotationId: quotation.id
      });
      
      // Use the quotation data from the table as fallback
      console.log('🔄 Using fallback quotation data:', quotation);
      setSelectedQuotation(quotation);
    } finally {
      setIsViewLoading(false);
    }

    setIsViewDialogOpen(true);

    // Fetch status history
    try {
      const response = await api.get(`/quotations/${quotation.id}/status-history`);
      setStatusHistory(response.data || []);
    } catch (error) {
      console.error('Error fetching status history:', error);
      setStatusHistory([]);
    }
  };

  // Filter and sort quotations
  const allFilteredQuotations = Array.isArray(quotations) ? quotations
    .filter(quotation => {
      const matchesSearch = quotation.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           quotation.customer?.resort_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || quotation.status === statusFilter;
      const matchesCustomer = customerFilter === "all" || quotation.customer_id.toString() === customerFilter;
      return matchesSearch && matchesStatus && matchesCustomer;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];

  // Pagination logic
  const totalPages = Math.ceil(allFilteredQuotations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredQuotations = allFilteredQuotations.slice(startIndex, endIndex);

  // Calculate totals for all filtered quotations (not just current page)
  const totalAmount = allFilteredQuotations.reduce((sum, quotation) => sum + (Number(quotation.total_amount) || 0), 0);
  const sentCount = allFilteredQuotations.filter(q => q.status === 'sent').length;
  const acceptedCount = allFilteredQuotations.filter(q => q.status === 'accepted').length;

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, customerFilter]);

  // Helper function to format currency values with commas
  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusColor = (statusKey: string | undefined) => {
    if (!statusKey) return 'bg-gray-100 text-gray-800';
    const status = statuses.find(s => s.status_key === statusKey);
    if (!status || !status.color) return 'bg-gray-100 text-gray-800';

    const colorMap: { [key: string]: string } = {
      'gray': 'bg-gray-100 text-gray-800',
      'blue': 'bg-blue-100 text-blue-800',
      'green': 'bg-green-100 text-green-800',
      'yellow': 'bg-yellow-100 text-yellow-800',
      'red': 'bg-red-100 text-red-800',
      'orange': 'bg-orange-100 text-orange-800',
      'purple': 'bg-purple-100 text-purple-800',
      'indigo': 'bg-indigo-100 text-indigo-800',
    };

    return colorMap[status.color] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">
            Manage customer quotations and track their status
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Quotation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Quotation</DialogTitle>
                <DialogDescription>
                  Create a new quotation for a customer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="create-customer">Customer *</Label>
                  <Select
                    value={formData.customer_id?.toString() ?? ""}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(customers) && customers.length > 0 ? customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.resort_name}
                        </SelectItem>
                      )) : (
                        <SelectItem value="no-customers" disabled>
                          No customers available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.status_key}>
                            {status.status_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-valid-until">Valid Until *</Label>
                    <Input
                      id="create-valid-until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-exchange-rate">Exchange Rate</Label>
                    <Input
                      id="create-exchange-rate"
                      type="number"
                      step="0.0001"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-discount">Discount %</Label>
                    <Input
                      id="create-discount"
                      type="number"
                      step="0.01"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-notes">Notes</Label>
                  <Textarea
                    id="create-notes"
                    placeholder="Additional notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-terms">Terms & Conditions</Label>
                  <Textarea
                    id="create-terms"
                    placeholder="Terms and conditions"
                    value={formData.terms_conditions}
                    onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setFormData({
                      customer_id: undefined,
                      status: 'draft',
                      valid_until: '',
                      currency: 'USD',
                      exchange_rate: 1,
                      discount_percentage: 0,
                      notes: '',
                      terms_conditions: ''
                    });
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting ? "Creating..." : "Create Quotation"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quotations Overview</CardTitle>
          <CardDescription>
            Search and filter quotations by number, customer, or status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {Array.isArray(customers) && customers.length > 0 && customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.resort_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.status_key}>
                    {status.status_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Quotations</span>
                </div>
                <div className="text-2xl font-bold mt-1">{filteredQuotations.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span className="text-sm font-medium">Sent</span>
                </div>
                <div className="text-2xl font-bold mt-1">{sentCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Accepted</span>
                </div>
                <div className="text-2xl font-bold mt-1">{acceptedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Total Value</span>
                </div>
                <div className="text-2xl font-bold mt-1">${formatCurrency(totalAmount)}</div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>
            Manage and track customer quotations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading quotations...</div>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No quotations found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by creating your first quotation"
                  }
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Quotation
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell className="font-medium">
                        {quotation.quotation_number}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{quotation.customer?.resort_name || 'Unknown'}</div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={quotation.status}
                          onValueChange={(value) => handleStatusChange(quotation, value)}
                        >
                          <SelectTrigger className={`w-32 ${getStatusColor(quotation.status)}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map((status) => (
                              <SelectItem key={status.id} value={status.status_key}>
                                {status.status_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {new Date(quotation.valid_until).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {quotation.currency} {formatCurrency(quotation.total_amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(quotation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(quotation)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {quotation.status === 'draft' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSend(quotation)}
                              disabled={submitting}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {quotation.status === 'sent' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAccept(quotation)}
                                disabled={submitting}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReject(quotation)}
                                disabled={submitting}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(quotation)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && allFilteredQuotations.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, allFilteredQuotations.length)} of {allFilteredQuotations.length} quotations
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog - Quick Preview */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Quick Preview</DialogTitle>
            <DialogDescription>
              {selectedQuotation?.quotation_number} - Basic quotation information
            </DialogDescription>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4">
              {/* Quick Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Customer</Label>
                  <p className="text-lg font-semibold">{selectedQuotation.customer?.resort_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedQuotation.status)}>
                      {selectedQuotation.status?.toUpperCase() || 'N/A'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-4 gap-3 pt-3 border-t">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Label className="text-xs text-blue-900">Total</Label>
                  <p className="text-lg font-bold text-blue-700">
                    {selectedQuotation.currency} {formatCurrency(selectedQuotation.total_amount)}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <Label className="text-xs text-purple-900">Cost</Label>
                  <p className="text-lg font-bold text-purple-700">
                    {selectedQuotation.currency} {Number(selectedQuotation.total_cost || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <Label className="text-xs text-green-900">Profit</Label>
                  <p className="text-lg font-bold text-green-700">
                    {selectedQuotation.currency} {Number(selectedQuotation.total_profit || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg">
                  <Label className="text-xs text-amber-900">Margin</Label>
                  <p className="text-lg font-bold text-amber-700">
                    {Number(selectedQuotation.profit_margin || 0).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Items Summary */}
              {selectedQuotation.items && selectedQuotation.items.length > 0 && (
                <div className="pt-3 border-t">
                  <Label className="text-sm font-semibold text-gray-700">Items ({selectedQuotation.items.length})</Label>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                    {selectedQuotation.items.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <p className="text-xs text-gray-500">
                            {Number(item.quantity).toFixed(2)} × {selectedQuotation.currency} {Number(item.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">{selectedQuotation.currency} {Number(item.item_total).toFixed(2)}</p>
                      </div>
                    ))}
                    {selectedQuotation.items.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        + {selectedQuotation.items.length - 5} more items
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <Label className="text-xs text-gray-500">Created</Label>
                  <p className="text-sm">{new Date(selectedQuotation.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Valid Until</Label>
                  <p className="text-sm">{new Date(selectedQuotation.valid_until).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                console.log('🔗 View Full Details clicked');
                console.log('📄 Selected quotation:', selectedQuotation);
                if (selectedQuotation) {
                  // Handle both old and new response structures
                  const quotationId = selectedQuotation.id || selectedQuotation.quotation?.id;
                  const url = `/dashboard/quotations/${quotationId}`;
                  console.log('🚀 Navigating to:', url);
                  
                  // Try router.push first, fallback to window.location if it fails
                  try {
                    router.push(url);
                  } catch (error) {
                    console.error('❌ Router navigation failed:', error);
                    console.log('🔄 Falling back to window.location');
                    window.location.href = url;
                  }
                  
                  setIsViewDialogOpen(false);
                } else {
                  console.error('❌ No selected quotation available');
                }
              }}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Quotation</DialogTitle>
            <DialogDescription>
              Update quotation details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-customer">Customer *</Label>
              <Select
                value={formData.customer_id?.toString() ?? ""}
                onValueChange={(value) => setFormData({ ...formData, customer_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(customers) && customers.length > 0 ? customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.resort_name}
                    </SelectItem>
                  )) : (
                    <SelectItem value="no-customers" disabled>
                      No customers available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.status_key}>
                        {status.status_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-valid-until">Valid Until *</Label>
                <Input
                  id="edit-valid-until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData({ ...formData, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="AED">AED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-exchange-rate">Exchange Rate</Label>
                <Input
                  id="edit-exchange-rate"
                  type="number"
                  step="0.0001"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-discount">Discount %</Label>
                <Input
                  id="edit-discount"
                  type="number"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-terms">Terms & Conditions</Label>
              <Textarea
                id="edit-terms"
                placeholder="Terms and conditions"
                value={formData.terms_conditions}
                onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedQuotation(null);
                setFormData({
                  customer_id: undefined,
                  status: 'draft',
                  valid_until: '',
                  currency: 'USD',
                  exchange_rate: 1,
                  discount_percentage: 0,
                  notes: '',
                  terms_conditions: ''
                });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Updating..." : "Update Quotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quotation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}