"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api, quotationsApi } from "@/lib/api";
import {
  ArrowLeft,
  Edit,
  Send,
  Check,
  X,
  FileText,
  Download,
  Printer,
  Mail,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  User,
  Building2,
  Phone,
  AtSign,
  Wrench,
  ChevronDown,
  ChevronUp
} from "lucide-react";
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
import { QuotationPrintView } from "@/components/quotation/QuotationPrintView";
import QuotationPrintViewSpareParts from "@/components/quotation/QuotationPrintViewSpareParts";
import HardwareRepairCard from "@/components/quotation/HardwareRepairCard";

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
  import_duty?: number;
  import_duty_inclusive?: boolean;
  customer?: {
    id: number;
    company_name: string;
    contact_person: string;
    email: string;
    phone: string;
    fax?: string;
    address?: string;
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
  cost_price?: number;
  total_cost?: number;
  profit?: number;
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

interface StatusHistory {
  id: number;
  quotation_id: number;
  old_status: string;
  new_status: string;
  changed_by?: {
    id: number;
    name: string;
  };
  created_at: string;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'send' | 'accept' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSparePartQuote, setIsSparePartQuote] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [serviceTerms, setServiceTerms] = useState<any[]>([]);
  const [hardwareRepairDetails, setHardwareRepairDetails] = useState<any>(null);

  useEffect(() => {
    fetchQuotation();
    fetchStatusHistory();
    fetchCompanySettings();
    fetchCurrentUser();
    fetchHardwareRepairDetails();
  }, [params.id]);

  const fetchQuotation = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to view quotations",
          variant: "destructive",
        });
        window.location.href = '/login';
        return;
      }
      
      const response = await quotationsApi.getById(params.id as string);
      
      // Handle new API response structure
      if (response.data.quotation && response.data.serviceTerms) {
        setQuotation(response.data.quotation);
        setServiceTerms(response.data.serviceTerms);
      } else {
        // Fallback for old API structure
        setQuotation(response.data);
        setServiceTerms([]);
      }
    } catch (error: any) {
      
      let errorMessage = "Failed to load quotation details";
      
      if (error.response?.status === 404) {
        errorMessage = "Quotation not found. It may have been deleted or you don't have permission to view it.";
      } else if (error.response?.status === 401) {
        errorMessage = "Please log in to view this quotation.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to view this quotation.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Redirect to quotations list after a short delay
      setTimeout(() => {
        window.location.href = '/dashboard/quotations';
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      const response = await api.get(`/quotations/${params.id}/status-history`);
      setStatusHistory(response.data || []);
    } catch (error) {
      // Error fetching status history
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await api.get('/settings');
      const settingsMap = response.data.settings;

      const settings = {
        company_name: settingsMap?.company_name?.setting_value || '',
        company_address: settingsMap?.company_address?.setting_value || '',
        company_logo: settingsMap?.company_logo?.setting_value || '',
        company_phone: settingsMap?.company_phone?.setting_value || '',
        company_email: settingsMap?.company_email?.setting_value || '',
        company_tax_number: settingsMap?.company_tax_number?.setting_value || '',
      };

      setCompanySettings(settings);
    } catch (error) {
      // Error fetching company settings
    }
  };

  const fetchCurrentUser = () => {
    try {
      const userData = localStorage.getItem("user");
      if (userData) {
        const user = JSON.parse(userData);
        setCurrentUser(user);
      }
    } catch (error) {
      // Error fetching current user
    }
  };

  const fetchHardwareRepairDetails = async () => {
    try {
      const response = await api.get(`/quotations/${params.id}/hardware-repair-details`);
      setHardwareRepairDetails(response.data.data);
    } catch (error) {
      setHardwareRepairDetails(null);
    }
  };

  const handleAction = async () => {
    if (!quotation || !actionType) return;

    try {
      setSubmitting(true);
      if (actionType === 'send') {
        await quotationsApi.send(quotation.id.toString());
      } else if (actionType === 'accept') {
        await quotationsApi.accept(quotation.id.toString());
      } else if (actionType === 'reject') {
        await quotationsApi.reject(quotation.id.toString());
      }

      toast({
        title: "Success",
        description: `Quotation ${actionType} successfully`,
      });

      await fetchQuotation();
      await fetchStatusHistory();
      setIsActionDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${actionType} quotation`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openActionDialog = (type: 'send' | 'accept' | 'reject') => {
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'draft': 'bg-gray-100 text-gray-800',
      'sent': 'bg-blue-100 text-blue-800',
      'accepted': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'expired': 'bg-orange-100 text-orange-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getItemProfit = (item: QuotationItem) => {
    if (item.profit !== undefined) return item.profit;
    if (item.cost_price && item.quantity) {
      return item.item_total - (item.cost_price * item.quantity);
    }
    return 0;
  };

  const getItemProfitMargin = (item: QuotationItem) => {
    const profit = getItemProfit(item);
    return item.item_total > 0 ? (profit / item.item_total) * 100 : 0;
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Quotation-${quotation?.quotation_number || 'Document'}`,
  });

  const handleDownloadPDF = useReactToPrint({
    contentRef: printRef,
    documentTitle: (() => {
      const customer = quotation?.customer as any;
      const companyName = customer?.resort_name || 
                         customer?.company_name || 
                         customer?.contact_person || 
                         'Company';
      const quotationNumber = quotation?.quotation_number || 'Document';
      return `${companyName} - ${quotationNumber}`;
    })(),
  });


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quotation details...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Quotation not found</h3>
          <Button onClick={() => router.push('/dashboard/quotations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotations
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
            onClick={() => router.push('/dashboard/quotations')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{quotation.quotation_number}</h1>
            <p className="text-muted-foreground">
              Created on {new Date(quotation.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {quotation.status === 'draft' && (
            <>
              <div className="flex items-center space-x-2 border rounded-md px-3 py-2">
                <Checkbox 
                  id="spare-part-quote" 
                  checked={isSparePartQuote}
                  onCheckedChange={(checked) => setIsSparePartQuote(checked as boolean)}
                />
                <Label 
                  htmlFor="spare-part-quote" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Spare Part Quote
                </Label>
              </div>
            <Button onClick={() => openActionDialog('send')} disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              Send
            </Button>
            </>
          )}
          {quotation.status === 'sent' && (
            <>
              <Button
                onClick={() => openActionDialog('accept')}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                onClick={() => openActionDialog('reject')}
                disabled={submitting}
                variant="destructive"
              >
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/quotations/${params.id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <Label className="text-sm text-gray-600">Status</Label>
              <Badge className={`${getStatusColor(quotation.status)} text-lg px-4 py-1 mt-1`}>
                {quotation.status.toUpperCase()}
              </Badge>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Currency</Label>
              <p className="text-2xl font-bold text-gray-900">{quotation.currency}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Total Amount</Label>
              <p className="text-2xl font-bold text-blue-700">
                {quotation.currency} {Number(quotation.total_amount).toFixed(2)}
              </p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Valid Until</Label>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(quotation.valid_until).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="financial">Financial Analysis</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <Label className="text-xs text-gray-500">Company Name</Label>
                    <p className="text-base font-semibold">{(quotation.customer as any)?.resort_name || quotation.customer?.company_name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <Label className="text-xs text-gray-500">Contact Person</Label>
                    <div className="flex items-center space-x-2">
                      <p className="text-base">
                        {quotation.customer?.contacts?.find((contact: any) => contact.is_primary)?.contact_person || 
                         quotation.customer?.contacts?.[0]?.contact_person || 
                         'N/A'}
                      </p>
                      {quotation.customer?.contacts?.find((contact: any) => contact.is_primary) && (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AtSign className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <Label className="text-xs text-gray-500">Email</Label>
                    <p className="text-base">
                      {quotation.customer?.contacts?.find((contact: any) => contact.is_primary)?.email || 
                       quotation.customer?.contacts?.[0]?.email || 
                       'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <Label className="text-xs text-gray-500">Phone</Label>
                    <p className="text-base">
                      {quotation.customer?.contacts?.find((contact: any) => contact.is_primary)?.phone || 
                       quotation.customer?.contacts?.[0]?.phone || 
                       'N/A'}
                    </p>
                  </div>
                </div>
                {quotation.customer?.address && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <Label className="text-xs text-gray-500">Address</Label>
                      <p className="text-base">{quotation.customer.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Key Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <Label className="text-sm font-medium text-blue-900">Total Revenue</Label>
                  <p className="text-lg font-bold text-blue-700">
                    {quotation.currency} {Number(quotation.total_amount).toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <Label className="text-sm font-medium text-purple-900">Total Cost</Label>
                  <p className="text-lg font-bold text-purple-700">
                    {quotation.currency} {Number(quotation.total_cost || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <Label className="text-sm font-medium text-green-900">Total Profit</Label>
                  <p className="text-lg font-bold text-green-700">
                    {quotation.currency} {Number(quotation.total_profit || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
                  <Label className="text-base font-semibold text-amber-900">Profit Margin</Label>
                  <p className="text-2xl font-bold text-amber-700">
                    {Number(quotation.profit_margin || 0).toFixed(2)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes and Terms */}
          {(quotation.notes || quotation.terms_conditions) && (
            <div className="grid grid-cols-1 gap-6">
              {quotation.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{quotation.notes}</p>
                  </CardContent>
                </Card>
              )}
              {quotation.terms_conditions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Terms & Conditions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{quotation.terms_conditions}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Quotation Items
              </CardTitle>
              <CardDescription>
                Detailed breakdown of all items in this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotation.items && quotation.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Discount</TableHead>
                        <TableHead className="text-right">Tax Rate</TableHead>
                        <TableHead className="text-right">Item Total</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotation.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.product && (
                                <p className="text-xs text-gray-500">{item.product.name}</p>
                              )}
                              <Badge variant="outline" className="text-xs mt-1">
                                {item.item_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{Number(item.quantity).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{quotation.currency} {Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {item.discount_percentage > 0 && `${item.discount_percentage}%`}
                            {item.discount_amount > 0 && `${quotation.currency} ${Number(item.discount_amount).toFixed(2)}`}
                            {item.discount_percentage === 0 && item.discount_amount === 0 && '-'}
                          </TableCell>
                          <TableCell className="text-right">{item.tax_rate > 0 ? `${item.tax_rate}%` : '-'}</TableCell>
                          <TableCell className="text-right font-semibold">{quotation.currency} {Number(item.item_total).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            {item.product_id ? (
                              <span className="text-blue-700">{quotation.currency} {Number(item.total_cost || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.product_id ? (
                              <span className={getItemProfit(item) >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                                {quotation.currency} {Number(getItemProfit(item)).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.product_id ? (
                              <span className={getItemProfitMargin(item) >= 0 ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                                {Number(getItemProfitMargin(item)).toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No items in this quotation</p>
              )}
            </CardContent>
          </Card>

          {/* Hardware Repair Card */}
          <HardwareRepairCard 
            quotationId={quotation.id}
            hardwareRepairDetails={hardwareRepairDetails}
            onUpdate={setHardwareRepairDetails}
          />
        </TabsContent>

        {/* Financial Analysis Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Quotation Totals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Quotation Totals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <Label className="text-sm text-gray-600">Subtotal</Label>
                  <p className="text-lg font-semibold">{quotation.currency} {Number(quotation.subtotal).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <Label className="text-sm text-gray-600">Discount ({quotation.discount_percentage}%)</Label>
                  <p className="text-lg text-red-600 font-semibold">-{quotation.currency} {Number(quotation.discount_amount).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <Label className="text-sm text-gray-600">Tax</Label>
                  <p className="text-lg font-semibold">{quotation.currency} {Number(quotation.tax_amount).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pt-3 bg-blue-50 p-4 rounded-lg">
                  <Label className="text-base font-bold">Total Amount</Label>
                  <p className="text-2xl font-bold text-blue-700">{quotation.currency} {Number(quotation.total_amount).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Profit Analysis */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center text-green-900">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Profit Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-green-200">
                  <Label className="text-sm text-green-800">Total Cost (Products)</Label>
                  <p className="text-lg font-semibold text-blue-700">{quotation.currency} {Number(quotation.total_cost || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-green-200">
                  <Label className="text-sm text-green-800">Total Revenue</Label>
                  <p className="text-lg font-semibold text-purple-700">{quotation.currency} {Number(quotation.total_amount).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-green-200">
                  <Label className="text-sm text-green-800">Total Profit</Label>
                  <p className="text-lg font-semibold text-green-700">{quotation.currency} {Number(quotation.total_profit || 0).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center bg-green-100 p-4 rounded-lg border-2 border-green-300">
                  <Label className="text-base font-bold text-green-900">Profit Margin</Label>
                  <p className="text-3xl font-bold text-green-700">{Number(quotation.profit_margin || 0).toFixed(2)}%</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products vs Services Breakdown */}
          {quotation.items && quotation.items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="text-sm text-blue-900">Products Revenue</Label>
                    <p className="text-2xl font-bold text-blue-700">
                      {quotation.currency} {quotation.items
                        .filter(item => item.product_id && item.item_type === 'product')
                        .reduce((sum, item) => sum + Number(item.item_total), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <Label className="text-sm text-purple-900">Services Revenue</Label>
                    <p className="text-2xl font-bold text-purple-700">
                      {quotation.currency} {quotation.items
                        .filter(item => item.item_type === 'service')
                        .reduce((sum, item) => sum + Number(item.item_total), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                    <Label className="text-sm text-indigo-900">AMC Revenue</Label>
                    <p className="text-2xl font-bold text-indigo-700">
                      {quotation.currency} {quotation.items
                        .filter(item => item.item_type === 'amc')
                        .reduce((sum, item) => sum + Number(item.item_total), 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Status Change History
              </CardTitle>
              <CardDescription>
                Track all status changes and actions taken on this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statusHistory.length > 0 ? (
                <div className="space-y-3">
                  {statusHistory.map((history, index) => (
                    <div key={history.id || index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg border">
                      <div className="flex-shrink-0 mt-1">
                        <Badge className={getStatusColor(history.new_status)}>
                          {history.new_status?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {history.old_status ? (
                            <>Changed from <span className="text-gray-600 font-semibold">{history.old_status}</span> to <span className="text-gray-900 font-semibold">{history.new_status}</span></>
                          ) : (
                            <>Created with status <span className="text-gray-900 font-semibold">{history.new_status}</span></>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          <User className="inline h-3 w-3 mr-1" />
                          {history.changed_by?.name || 'System'} •
                          <Calendar className="inline h-3 w-3 ml-2 mr-1" />
                          {new Date(history.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No status changes recorded yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden Print Component */}
      <div className="hidden">
        {quotation && (
          isSparePartQuote ? (
            <QuotationPrintViewSpareParts 
              ref={printRef} 
              quotation={quotation} 
              companySettings={companySettings} 
              currentUser={currentUser} 
              serviceTerms={serviceTerms} 
              hardwareRepairDetails={hardwareRepairDetails}
            />
          ) : (
          <QuotationPrintView 
            ref={printRef} 
            quotation={quotation} 
            companySettings={companySettings} 
            currentUser={currentUser} 
            serviceTerms={serviceTerms} 
          />
          )
        )}
      </div>
      

      {/* Action Confirmation Dialog */}
      <AlertDialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'send' && 'Send Quotation'}
              {actionType === 'accept' && 'Accept Quotation'}
              {actionType === 'reject' && 'Reject Quotation'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'send' && 'Are you sure you want to send this quotation to the customer?'}
              {actionType === 'accept' && 'Are you sure you want to accept this quotation?'}
              {actionType === 'reject' && 'Are you sure you want to reject this quotation?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={submitting}
              className={
                actionType === 'accept'
                  ? 'bg-green-600 hover:bg-green-700'
                  : actionType === 'reject'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {submitting ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
