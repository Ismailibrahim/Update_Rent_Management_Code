"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  MoreVertical,
  Pencil,
  Trash2,
  RefreshCw,
  Ban,
  Shield,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { api, customersApi } from "@/lib/api";

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

interface Customer {
  id: number;
  resort_name: string;
  company_name?: string;
  email?: string;
  phone?: string;
}

interface SupportContract {
  id: number;
  customer_id: number;
  contract_type: string;
  products: string[];
  contract_number?: string;
  start_date?: string;
  expiry_date?: string;
  status: "active" | "expired" | "manually_inactive";
  notes?: string;
  customer?: Customer;
  days_until_expiry?: number | null;
  status_color?: string;
  is_expiring_soon?: boolean;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  total: number;
  active: number;
  expiring_soon: number;
  expired: number;
  manually_inactive: number;
}

interface CreateContractData {
  customer_id: number;
  contract_type: string;
  products: string[];
  contract_number?: string;
  start_date?: string;
  expiry_date?: string;
  notes?: string;
}

interface UpdateContractData extends CreateContractData {
  status: "active" | "expired" | "manually_inactive";
}

interface RenewContractData {
  start_date?: string;
  expiry_date?: string;
  contract_number?: string;
  notes?: string;
}

export default function SupportContractsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [contracts, setContracts] = useState<SupportContract[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    expiring_soon: 0,
    expired: 0,
    manually_inactive: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supportProducts, setSupportProducts] = useState<SupportProduct[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [contractTypeFilter, setContractTypeFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<SupportContract | null>(null);


  const [renewData, setRenewData] = useState<RenewContractData>({
    start_date: "",
    expiry_date: "",
    contract_number: "",
    notes: "",
  });

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (contractTypeFilter) params.append("contract_type", contractTypeFilter);
      if (productFilter) params.append("product", productFilter);
      if (statusFilter) params.append("status", statusFilter);

      // Pagination parameters
      params.append("page", currentPage.toString());
      params.append("per_page", itemsPerPage.toString());

      const response = await api.get(
        `/support-contracts?${params.toString()}`
      );
      
      // Handle paginated response
      if (response.data.data) {
        setContracts(response.data.data);
        setTotalPages(response.data.last_page || 1);
        setTotalItems(response.data.total || 0);
      } else {
        // Fallback for non-paginated response
        setContracts(response.data);
        setTotalPages(1);
        setTotalItems(response.data.length);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch support contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, contractTypeFilter, productFilter, statusFilter, currentPage, itemsPerPage, toast]);

  useEffect(() => {
    fetchCustomers();
    fetchSupportProducts();
    fetchContractTypes();
    fetchContracts(); // Initial load
    fetchStatistics(); // Initial statistics
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, contractTypeFilter, productFilter, statusFilter]);

  // Fetch contracts when page or filters change
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Fetch statistics when filters change
  useEffect(() => {
    if (searchTerm || contractTypeFilter || productFilter || statusFilter) {
      fetchStatistics();
    }
  }, [searchTerm, contractTypeFilter, productFilter, statusFilter]);

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/support-contracts/statistics");
      setStatistics(response.data.data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchSupportProducts = async () => {
    try {
      const response = await api.get("/support-products", {
        params: { status: "active" },
      });
      const products = response.data.data || response.data;
      console.log("Fetched support products:", products);
      setSupportProducts(products);
    } catch (error) {
      console.error("Error fetching support products:", error);
    }
  };

  const fetchContractTypes = async () => {
    try {
      const response = await api.get("/contract-types", {
        params: { status: "active" },
      });
      const types = response.data.data || response.data;
      setContractTypes(types);
    } catch (error) {
      console.error("Error fetching contract types:", error);
    }
  };


  const handleRenewContract = async () => {
    if (!selectedContract) return;

    try {
      await api.post(
        `/support-contracts/${selectedContract.id}/renew`,
        renewData
      );
      toast({
        title: "Success",
        description: "Support contract renewed successfully",
      });
      setRenewDialogOpen(false);
      setSelectedContract(null);
      resetRenewData();
      fetchContracts();
      fetchStatistics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to renew support contract",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContract = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contract?")) return;

    try {
      await api.delete(`/support-contracts/${id}`);
      toast({
        title: "Success",
        description: "Support contract deleted successfully",
      });
      fetchContracts();
      fetchStatistics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete support contract",
        variant: "destructive",
      });
    }
  };

  const handleSetInactive = async (id: number) => {
    try {
      await api.post(`/support-contracts/${id}/set-inactive`);
      toast({
        title: "Success",
        description: "Support contract set to inactive",
      });
      fetchContracts();
      fetchStatistics();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set contract inactive",
        variant: "destructive",
      });
    }
  };


  const resetRenewData = () => {
    setRenewData({
      start_date: "",
      expiry_date: "",
      contract_number: "",
      notes: "",
    });
  };


  const openRenewDialog = (contract: SupportContract) => {
    setSelectedContract(contract);
    setRenewData({
      start_date: "",
      expiry_date: "",
      contract_number: "",
      notes: "",
    });
    setRenewDialogOpen(true);
  };

  const getStatusBadgeVariant = (
    status: string,
    isExpiringSoon?: boolean
  ): "destructive" | "default" | "secondary" => {
    if (status === "expired" || status === "manually_inactive")
      return "destructive";
    if (isExpiringSoon) return "default";
    return "secondary";
  };

  const getDaysUntilExpiryColor = (days: number | null) => {
    if (days === null) return "text-gray-500";
    if (days < 0) return "text-red-600";
    if (days <= 30) return "text-yellow-600";
    return "text-green-600";
  };

  const getAvailableProducts = (): string[] => {
    const products = supportProducts.map((p) => p.name);
    console.log("Available products:", products, "from supportProducts:", supportProducts);
    return products;
  };


  // Color mapping for different products
  const getProductColor = (product: string) => {
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-green-100 text-green-800 border-green-200", 
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-orange-100 text-orange-800 border-orange-200",
      "bg-pink-100 text-pink-800 border-pink-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-red-100 text-red-800 border-red-200",
      "bg-yellow-100 text-yellow-800 border-yellow-200",
      "bg-cyan-100 text-cyan-800 border-cyan-200"
    ];
    
    // Use product name to determine consistent color
    const hash = product.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const renderProductsList = (products: string[]) => {
    if (products.length === 0) return "-";
    if (products.length <= 2) {
      return (
        <div className="flex flex-wrap gap-1">
          {products.map((product, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className={`text-xs ${getProductColor(product)}`}
            >
              {product}
            </Badge>
          ))}
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1">
        {products.slice(0, 2).map((product, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            className={`text-xs ${getProductColor(product)}`}
          >
            {product}
          </Badge>
        ))}
        <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-200">
          +{products.length - 2} more
        </Badge>
      </div>
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support Contracts</h1>
        <Button onClick={() => router.push("/dashboard/support-contracts/create")}>
          <Plus className="mr-2 h-4 w-4" />
          New Contract
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {statistics.expiring_soon}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.expired}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Manually Inactive
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {statistics.manually_inactive}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={contractTypeFilter || "all"}
                onValueChange={(value) => setContractTypeFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Contract Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {contractTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={productFilter || "all"} onValueChange={(value) => setProductFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {supportProducts.map((product) => (
                    <SelectItem key={product.id} value={product.name}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="manually_inactive">
                    Manually Inactive
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
                <span className="text-muted-foreground">Loading contracts...</span>
              </div>
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium text-gray-900 mb-2">No contracts found</p>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your filters or create a new support contract
              </p>
              <Button onClick={() => router.push("/dashboard/support-contracts/create")} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Contract
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-6 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    {/* Left Section - Main Info */}
                    <div className="flex-1 space-y-3">
                      {/* Customer & Contract Type */}
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {contract.customer?.resort_name || contract.customer?.company_name || "Unknown Customer"}
                        </h3>
                        <Badge variant="outline" className="font-normal">
                          {contract.contract_type}
                        </Badge>
                      </div>

                      {/* Products */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Products:</span>
                        <div className="flex flex-wrap gap-1">
                          {contract.products.map((product, index) => (
                            <Badge 
                              key={index} 
                              variant="outline" 
                              className={`text-xs font-normal ${getProductColor(product)}`}
                            >
                              {product}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="flex items-center gap-6 text-sm">
                        {contract.start_date && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Started: {format(new Date(contract.start_date), "MMM dd, yyyy")}</span>
                          </div>
                        )}
                        {contract.expiry_date && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Expires: {format(new Date(contract.expiry_date), "MMM dd, yyyy")}</span>
                          </div>
                        )}
                        {contract.contract_number && (
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <FileText className="h-4 w-4" />
                            <span className="text-xs">{contract.contract_number}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Status & Actions */}
                    <div className="flex items-start gap-4 ml-6">
                      {/* Days Until Expiry */}
                      {contract.days_until_expiry !== null && contract.days_until_expiry !== undefined && (
                        <div className="text-center min-w-[100px]">
                          <div className={`text-2xl font-bold ${getDaysUntilExpiryColor(contract.days_until_expiry)}`}>
                            {contract.days_until_expiry < 0
                              ? Math.abs(contract.days_until_expiry)
                              : contract.days_until_expiry}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {contract.days_until_expiry < 0 ? "days overdue" : "days left"}
                          </div>
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="flex flex-col items-end gap-2">
                        {contract.status === "expired" || contract.status === "manually_inactive" ? (
                          <Badge variant="destructive" className="capitalize px-3 py-1">
                            {contract.status === "manually_inactive" ? "Inactive" : "Expired"}
                          </Badge>
                        ) : contract.is_expiring_soon ? (
                          <Badge className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1">
                            Expiring Soon
                          </Badge>
                        ) : (
                          <Badge className="bg-green-600 hover:bg-green-700 px-3 py-1">
                            Active
                          </Badge>
                        )}

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/support-contracts/${contract.id}/edit`)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRenewDialog(contract)}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Renew
                            </DropdownMenuItem>
                            {contract.status === "active" && (
                              <DropdownMenuItem onClick={() => handleSetInactive(contract.id)}>
                                <Ban className="mr-2 h-4 w-4" />
                                Set Inactive
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDeleteContract(contract.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {contracts.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} contracts
              </p>
              </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">Rows per page:</p>
                  <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setCurrentPage(1);
                    // Note: itemsPerPage is currently readonly, but this is for future enhancement
                  }}
                >
                  <SelectTrigger className="w-[70px]">
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="flex items-center gap-1">
            <Button
              variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
            </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 ||
                             page === totalPages ||
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[36px]"
                        >
                          {page}
                        </Button>
            </div>
                    ))}
            </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                  </div>
              </div>
            </div>
        )}
      </Card>

      {/* Renew Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renew Support Contract</DialogTitle>
            <DialogDescription>
              Create a renewal for this support contract
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="renew-contract-number">Contract Number</Label>
              <Input
                id="renew-contract-number"
                value={renewData.contract_number}
                onChange={(e) =>
                  setRenewData({ ...renewData, contract_number: e.target.value })
                }
                placeholder="Enter contract number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renew-start-date">Start Date *</Label>
              <Input
                id="renew-start-date"
                type="date"
                value={renewData.start_date}
                onChange={(e) =>
                  setRenewData({ ...renewData, start_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renew-expiry-date">Expiry Date *</Label>
              <Input
                id="renew-expiry-date"
                type="date"
                value={renewData.expiry_date}
                onChange={(e) =>
                  setRenewData({ ...renewData, expiry_date: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="renew-notes">Notes</Label>
              <Textarea
                id="renew-notes"
                value={renewData.notes}
                onChange={(e) =>
                  setRenewData({ ...renewData, notes: e.target.value })
                }
                placeholder="Enter notes"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenewDialogOpen(false);
                setSelectedContract(null);
                resetRenewData();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRenewContract}>Renew</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
