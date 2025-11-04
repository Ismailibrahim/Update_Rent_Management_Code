"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { customersApi, api, quotationsApi } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Edit,
  FileText,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  Briefcase,
  Plus,
  TrendingUp,
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: number;
  resort_name: string;
  resort_code?: string;
  holding_company?: string;
  contact_person?: string;
  designation?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
  created_at?: string;
  updated_at?: string;
}

interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  valid_until: string;
  currency: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface CustomerFormData {
  resort_name: string;
  resort_code?: string;
  holding_company?: string;
  contact_person: string;
  designation: string;
  email: string;
  phone: string;
  mobile?: string;
  address: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
}

interface SupportContract {
  id: number;
  customer_id: number;
  contract_type: string;
  products: string[];
  contract_number?: string;
  start_date?: string;
  expiry_date?: string;
  status: 'active' | 'expired' | 'manually_inactive';
  notes?: string;
  days_until_expiry?: number | null;
  status_color?: string;
  is_expiring_soon?: boolean;
  created_at: string;
  updated_at: string;
}

interface ContractType {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface SupportProduct {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

interface CreateContractData {
  customer_id: number;
  contract_type: string;
  products: string[];
  contract_number: string;
  start_date: string;
  expiry_date: string;
  notes: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [supportContracts, setSupportContracts] = useState<SupportContract[]>([]);
  const [supportProducts, setSupportProducts] = useState<SupportProduct[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateContractDialogOpen, setIsCreateContractDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    resort_name: "",
    resort_code: "",
    holding_company: "",
    contact_person: "",
    designation: "",
    email: "",
    phone: "",
    mobile: "",
    address: "",
    country: "",
    tax_number: "",
    payment_terms: ""
  });
  const [contractData, setContractData] = useState<CreateContractData>({
    customer_id: 0,
    contract_type: "",
    products: [],
    contract_number: "",
    start_date: "",
    expiry_date: "",
    notes: "",
  });

  useEffect(() => {
    fetchCustomer();
    fetchQuotations();
    fetchSupportContracts();
    fetchSupportProducts();
    fetchContractTypes();
  }, [params.id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await customersApi.getById(params.id as string);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast({
        title: "Error",
        description: "Failed to load customer details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    try {
      setQuotationsLoading(true);
      const response = await api.get('/quotations', {
        params: { customer_id: params.id }
      });
      setQuotations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast({
        title: "Error",
        description: "Failed to load quotation history",
        variant: "destructive",
      });
    } finally {
      setQuotationsLoading(false);
    }
  };

  const fetchSupportContracts = async () => {
    try {
      const response = await api.get(`/customers/${params.id}/support-contracts`);
      setSupportContracts(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching support contracts:', error);
    }
  };

  const fetchSupportProducts = async () => {
    try {
      const response = await api.get("/support-products", {
        params: { status: "active" },
      });
      setSupportProducts(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching support products:", error);
    }
  };

  const fetchContractTypes = async () => {
    try {
      const response = await api.get("/contract-types", {
        params: { status: "active" },
      });
      setContractTypes(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching contract types:", error);
    }
  };

  const openCreateContractDialog = () => {
    if (customer) {
      setContractData({
        customer_id: customer.id,
        contract_type: "",
        products: [],
        contract_number: "",
        start_date: "",
        expiry_date: "",
        notes: "",
      });
      setIsCreateContractDialogOpen(true);
    }
  };

  const handleProductToggle = (product: string, checked: boolean) => {
    setContractData(prev => ({
      ...prev,
      products: checked
        ? [...prev.products, product]
        : prev.products.filter(p => p !== product)
    }));
  };

  const handleCreateContract = async () => {
    try {
      await api.post("/support-contracts", contractData);
      toast({
        title: "Success",
        description: "Support contract created successfully",
      });
      setIsCreateContractDialogOpen(false);
      fetchSupportContracts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create support contract",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics from actual quotations data
  const quotationStats = {
    totalQuotations: quotations.length,
    acceptedQuotations: quotations.filter(q => q.status === 'accepted').length,
    totalRevenue: quotations.filter(q => q.status === 'accepted').reduce((sum, q) => sum + q.total_amount, 0),
    averageDealSize: quotations.length > 0 ? quotations.reduce((sum, q) => sum + q.total_amount, 0) / quotations.length : 0
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { className: "bg-gray-100 text-gray-800", label: "Draft" },
      sent: { className: "bg-blue-100 text-blue-800", label: "Sent" },
      accepted: { className: "bg-green-100 text-green-800", label: "Accepted" },
      rejected: { className: "bg-red-100 text-red-800", label: "Rejected" },
      expired: { className: "bg-yellow-100 text-yellow-800", label: "Expired" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const openEditDialog = () => {
    if (customer) {
      setFormData({
        resort_name: customer.resort_name,
        resort_code: customer.resort_code || "",
        holding_company: customer.holding_company || "",
        contact_person: customer.contact_person || "",
        designation: customer.designation || "",
        email: customer.email || "",
        phone: customer.phone || "",
        mobile: customer.mobile || "",
        address: customer.address || "",
        country: customer.country || "",
        tax_number: customer.tax_number || "",
        payment_terms: customer.payment_terms || ""
      });
      setIsEditDialogOpen(true);
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateCustomer = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      await customersApi.update(customer.id.toString(), formData);
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      setIsEditDialogOpen(false);
      await fetchCustomer();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Customer not found</h3>
          <Button onClick={() => router.push('/dashboard/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/customers')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Building2 className="mr-2 h-8 w-8 text-blue-600" />
              {customer.resort_name}
            </h1>
            <p className="text-muted-foreground">
              Customer ID: #{customer.id} • Member since {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={openEditDialog}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer
          </Button>
          <Button onClick={() => router.push('/dashboard/quotations/create')}>
            <Plus className="mr-2 h-4 w-4" />
            New Quotation
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <Label className="text-sm text-gray-600">Customer Since</Label>
            <p className="text-xl font-semibold text-gray-900">
              {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Last Updated</Label>
            <p className="text-xl font-semibold text-gray-900">
              {customer.updated_at ? new Date(customer.updated_at).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Payment Terms</Label>
            <p className="text-xl font-semibold text-gray-900">
              {customer.payment_terms || 'Not specified'}
            </p>
          </div>
          <div>
            <Label className="text-sm text-gray-600">Status</Label>
            <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">Active</Badge>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5 text-blue-600" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Contact Person</Label>
                <p className="text-base font-semibold">{customer.contact_person || 'Not provided'}</p>
                {customer.designation && (
                  <p className="text-sm text-gray-600">{customer.designation}</p>
                )}
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Email Address</Label>
                <p className="text-base">
                  <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                    {customer.email || 'Not provided'}
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Phone Number</Label>
                <p className="text-base">
                  <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                    {customer.phone || 'Not provided'}
                  </a>
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Address</Label>
                <p className="text-base whitespace-pre-wrap">{customer.address || 'Not provided'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Briefcase className="mr-2 h-5 w-5 text-green-600" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Resort Name</Label>
                <p className="text-base font-semibold">{customer.resort_name}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Tax Number / VAT ID</Label>
                <p className="text-base">{customer.tax_number || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Payment Terms</Label>
                <p className="text-base font-medium">
                  {customer.payment_terms || 'Not specified'}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-gray-500">Account Created</Label>
                <p className="text-base">
                  {customer.created_at
                    ? new Date(customer.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'Not available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-purple-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" variant="outline" onClick={() => router.push('/dashboard/quotations/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create New Quotation
            </Button>
            <Button className="w-full" variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
            <Button className="w-full" variant="outline">
              <Phone className="mr-2 h-4 w-4" />
              Call Customer
            </Button>
            <Button className="w-full" variant="outline" onClick={openEditDialog}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-blue-900 mb-1">Total Quotations</Label>
                <p className="text-3xl font-bold text-blue-700">{quotationStats.totalQuotations}</p>
                <p className="text-xs text-blue-600 mt-1">All time</p>
              </div>
              <FileText className="h-10 w-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-green-900 mb-1">Accepted</Label>
                <p className="text-3xl font-bold text-green-700">{quotationStats.acceptedQuotations}</p>
                <p className="text-xs text-green-600 mt-1">
                  {quotationStats.totalQuotations > 0 
                    ? `${Math.round((quotationStats.acceptedQuotations / quotationStats.totalQuotations) * 100)}% conversion`
                    : 'No quotations'
                  }
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-purple-900 mb-1">Total Revenue</Label>
                <p className="text-3xl font-bold text-purple-700">
                  ${quotationStats.totalRevenue >= 1000 
                    ? `${(quotationStats.totalRevenue / 1000).toFixed(1)}K`
                    : quotationStats.totalRevenue.toFixed(0)
                  }
                </p>
                <p className="text-xs text-purple-600 mt-1">Lifetime value</p>
              </div>
              <DollarSign className="h-10 w-10 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-amber-900 mb-1">Avg. Deal Size</Label>
                <p className="text-3xl font-bold text-amber-700">
                  ${quotationStats.averageDealSize >= 1000 
                    ? `${(quotationStats.averageDealSize / 1000).toFixed(1)}K`
                    : quotationStats.averageDealSize.toFixed(0)
                  }
                </p>
                <p className="text-xs text-amber-600 mt-1">Per quotation</p>
              </div>
              <Clock className="h-10 w-10 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-purple-600" />
                Quotation History
              </CardTitle>
              <CardDescription>
                All quotations for this customer
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              Export to CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quotationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading quotation history...</p>
              </div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No quotations found for this customer</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => router.push('/dashboard/quotations/create')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create First Quotation
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Quotation ID</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">{quotation.quotation_number}</TableCell>
                    <TableCell>
                      {format(new Date(quotation.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      {quotation.valid_until ? format(new Date(quotation.valid_until), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(quotation.status)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {quotation.currency} {quotation.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/quotations/${quotation.id}`)}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Support Contracts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-green-600" />
                Support Contracts
              </CardTitle>
              <CardDescription>
                Active and past support contracts for this customer
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/support-contracts')}
            >
              View All Contracts
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {supportContracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No support contracts found for this customer</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={openCreateContractDialog}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Support Contract
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Contract Type</TableHead>
                  <TableHead>Products</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supportContracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell className="font-medium">{contract.contract_type}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {contract.products.slice(0, 2).map((product, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {product}
                          </Badge>
                        ))}
                        {contract.products.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contract.products.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contract.start_date ? format(new Date(contract.start_date), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.expiry_date ? format(new Date(contract.expiry_date), 'MMM dd, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.days_until_expiry !== null && contract.days_until_expiry !== undefined ? (
                        <span className={
                          contract.days_until_expiry < 0
                            ? 'text-red-600 font-semibold'
                            : contract.days_until_expiry <= 30
                            ? 'text-yellow-600 font-semibold'
                            : 'text-green-600'
                        }>
                          {contract.days_until_expiry < 0
                            ? `${Math.abs(contract.days_until_expiry)} days ago`
                            : `${contract.days_until_expiry} days`}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {contract.status === 'expired' || contract.status === 'manually_inactive' ? (
                        <Badge variant="destructive" className="capitalize">
                          {contract.status === 'manually_inactive' ? 'Inactive' : 'Expired'}
                        </Badge>
                      ) : contract.is_expiring_soon ? (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">Expiring Soon</Badge>
                      ) : (
                        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editResortName">Resort Name *</Label>
              <Input
                id="editResortName"
                placeholder="Enter resort name"
                value={formData.resort_name}
                onChange={(e) => handleInputChange('resort_name', e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editContactPerson">Contact Person</Label>
                <Input
                  id="editContactPerson"
                  placeholder="Enter contact person"
                  value={formData.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDesignation">Designation</Label>
                <Input
                  id="editDesignation"
                  placeholder="Enter designation"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTaxNumber">Tax Number</Label>
                <Input
                  id="editTaxNumber"
                  placeholder="Enter tax number"
                  value={formData.tax_number || ''}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPaymentTerms">Payment Terms</Label>
                <Input
                  id="editPaymentTerms"
                  placeholder="e.g., Net 30, COD"
                  value={formData.payment_terms || ''}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editAddress">Address</Label>
              <Textarea
                id="editAddress"
                placeholder="Enter complete address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCustomer}
              disabled={loading || !formData.resort_name}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Support Contract Dialog */}
      <Dialog open={isCreateContractDialogOpen} onOpenChange={setIsCreateContractDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Create Support Contract</DialogTitle>
            <DialogDescription>
              Add a new support contract for {customer?.resort_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contract Information */}
            <div className="bg-gray-50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Contract Information
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-type" className="text-sm font-medium">
                    Contract Type *
                  </Label>
                  <Select
                    value={contractData.contract_type}
                    onValueChange={(value) =>
                      setContractData({ ...contractData, contract_type: value })
                    }
                  >
                    <SelectTrigger id="contract-type" className="bg-white">
                      <SelectValue placeholder="Select contract type" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contract-number" className="text-sm font-medium">
                    Contract Number
                  </Label>
                  <Input
                    id="contract-number"
                    value={contractData.contract_number}
                    onChange={(e) =>
                      setContractData({ ...contractData, contract_number: e.target.value })
                    }
                    placeholder="e.g., CONTR-2025-001"
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="bg-blue-50 rounded-lg p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Products Covered *
              </h3>
              {supportProducts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No support products available.</p>
                  <p className="text-sm mt-2">Please add products in Support Products page first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {supportProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`
                        flex items-center space-x-2 p-3 rounded-md border-2 transition-all cursor-pointer
                        ${
                          contractData.products.includes(product.name)
                            ? "border-blue-500 bg-blue-100"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }
                      `}
                      onClick={() => {
                        const checked = !contractData.products.includes(product.name);
                        handleProductToggle(product.name, checked);
                      }}
                    >
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={contractData.products.includes(product.name)}
                        onCheckedChange={(checked) =>
                          handleProductToggle(product.name, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                      >
                        {product.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {contractData.products.length > 0 && (
                <p className="text-sm text-blue-700 font-medium">
                  {contractData.products.length} product{contractData.products.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {/* Dates Section */}
            <div className="bg-green-50 rounded-lg p-5 space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Contract Period
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={contractData.start_date}
                    onChange={(e) =>
                      setContractData({ ...contractData, start_date: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry-date" className="text-sm font-medium">
                    Expiry Date
                  </Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={contractData.expiry_date}
                    onChange={(e) =>
                      setContractData({ ...contractData, expiry_date: e.target.value })
                    }
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional Notes
              </Label>
              <Textarea
                id="notes"
                value={contractData.notes}
                onChange={(e) =>
                  setContractData({ ...contractData, notes: e.target.value })
                }
                placeholder="Add any additional information about this contract..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsCreateContractDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateContract} className="min-w-[100px]">
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
