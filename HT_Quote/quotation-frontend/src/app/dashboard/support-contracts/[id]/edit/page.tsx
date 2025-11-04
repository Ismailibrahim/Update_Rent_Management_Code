"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api, customersApi } from "@/lib/api";
import {
  ArrowLeft,
  Save,
  Search,
  Shield,
  Package,
  Calendar,
  Check,
} from "lucide-react";

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
  created_at: string;
  updated_at: string;
}

interface UpdateContractData {
  customer_id: number;
  contract_type: string;
  products: string[];
  contract_number?: string;
  start_date?: string;
  expiry_date?: string;
  status: "active" | "expired" | "manually_inactive";
  notes?: string;
}

export default function EditSupportContractPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const [contract, setContract] = useState<SupportContract | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [supportProducts, setSupportProducts] = useState<SupportProduct[]>([]);
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);

  const [formData, setFormData] = useState<UpdateContractData>({
    customer_id: 0,
    contract_type: "",
    products: [],
    contract_number: "",
    start_date: "",
    expiry_date: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    fetchContract();
    fetchCustomers();
    fetchSupportProducts();
    fetchContractTypes();
  }, [params.id]);

  const fetchContract = async () => {
    try {
      const response = await api.get(`/support-contracts/${params.id}`);
      const contractData = response.data.data || response.data;
      setContract(contractData);
      
      // Initialize form data with contract data
      setFormData({
        customer_id: contractData.customer_id,
        contract_type: contractData.contract_type,
        products: contractData.products || [],
        contract_number: contractData.contract_number || "",
        start_date: contractData.start_date || "",
        expiry_date: contractData.expiry_date || "",
        status: contractData.status,
        notes: contractData.notes || "",
      });
    } catch (error) {
      console.error("Error fetching contract:", error);
      toast({
        title: "Error",
        description: "Failed to load contract details",
        variant: "destructive",
      });
      router.push("/dashboard/support-contracts");
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customersApi.getAll();
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    }
  };

  const fetchSupportProducts = async () => {
    try {
      const response = await api.get("/support-products", {
        params: { status: "active" },
      });
      const products = response.data.data || response.data;
      setSupportProducts(products);
    } catch (error) {
      console.error("Error fetching support products:", error);
      toast({
        title: "Error",
        description: "Failed to load support products",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to load contract types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContract = async () => {
    // Validation
    if (formData.customer_id === 0) {
      toast({
        title: "Error",
        description: "Please select a customer",
        variant: "destructive",
      });
      return;
    }

    if (!formData.contract_type) {
      toast({
        title: "Error",
        description: "Please select a contract type",
        variant: "destructive",
      });
      return;
    }

    if (formData.products.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one product",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/support-contracts/${params.id}`, formData);
      toast({
        title: "Success",
        description: "Support contract updated successfully",
      });
      router.push("/dashboard/support-contracts");
    } catch (error) {
      console.error("Error updating contract:", error);
      toast({
        title: "Error",
        description: "Failed to update support contract",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProductToggle = (product: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      products: checked
        ? [...prev.products, product]
        : prev.products.filter((p) => p !== product),
    }));
  };

  const getSelectedCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.resort_name : "Select customer";
  };

  const getAvailableProducts = (): string[] => {
    return supportProducts.map((p) => p.name);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Contract not found</h3>
          <Button onClick={() => router.push("/dashboard/support-contracts")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Support Contracts
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
            onClick={() => router.push("/dashboard/support-contracts")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Support Contracts
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Shield className="mr-2 h-8 w-8 text-blue-600" />
              Edit Support Contract
            </h1>
            <p className="text-muted-foreground">
              Update contract details for {contract.customer?.resort_name || contract.customer?.company_name || "Unknown Customer"}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/support-contracts")}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleUpdateContract} disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? "Updating..." : "Update Contract"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5 text-blue-600" />
                Contract Information
              </CardTitle>
              <CardDescription>
                Basic details about the support contract
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customer" className="text-sm font-medium">
                  Customer *
                </Label>
                <Popover open={openCustomerPopover} onOpenChange={setOpenCustomerPopover}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      <span className="truncate">{getSelectedCustomerName(formData.customer_id)}</span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.resort_name} ${customer.email || ''}`}
                              onSelect={() => {
                                setFormData({ ...formData, customer_id: customer.id });
                                setOpenCustomerPopover(false);
                              }}
                            >
                              <div className="flex flex-col w-full">
                                <span className="font-medium">{customer.resort_name}</span>
                                {customer.email && (
                                  <span className="text-sm text-muted-foreground">
                                    {customer.email}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract-type" className="text-sm font-medium">
                    Contract Type *
                  </Label>
                  <Select
                    value={formData.contract_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, contract_type: value })
                    }
                  >
                    <SelectTrigger>
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
                    value={formData.contract_number}
                    onChange={(e) =>
                      setFormData({ ...formData, contract_number: e.target.value })
                    }
                    placeholder="e.g., CONTR-2025-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-medium">
                  Status
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "expired" | "manually_inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="manually_inactive">Manually Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5 text-green-600" />
                Products Covered *
              </CardTitle>
              <CardDescription>
                Select the products covered by this support contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supportProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No support products available.</p>
                  <p className="text-sm mt-2">Please add products in Support Products page first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getAvailableProducts().map((product) => (
                    <div
                      key={product}
                      className={`
                        flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer
                        ${
                          formData.products.includes(product)
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 bg-white hover:border-green-300 hover:bg-gray-50"
                        }
                      `}
                    >
                      <Checkbox
                        id={`product-${product}`}
                        checked={formData.products.includes(product)}
                        onCheckedChange={(checked) =>
                          handleProductToggle(product, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`product-${product}`}
                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                        onClick={(e) => {
                          e.preventDefault();
                          const checked = !formData.products.includes(product);
                          handleProductToggle(product, checked);
                        }}
                      >
                        {product}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {formData.products.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700 font-medium flex items-center">
                    <Check className="mr-2 h-4 w-4" />
                    {formData.products.length} product{formData.products.length > 1 ? "s" : ""} selected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Period */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                Contract Period
              </CardTitle>
              <CardDescription>
                Define the start and end dates for the contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry-date" className="text-sm font-medium">
                    Expiry Date
                  </Label>
                  <Input
                    id="expiry-date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>
                Add any additional information about this contract
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Add any additional information about this contract..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Customer</Label>
                <p className="text-sm font-semibold">
                  {getSelectedCustomerName(formData.customer_id)}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Contract Type</Label>
                <p className="text-sm font-semibold">
                  {formData.contract_type || "Not selected"}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Status</Label>
                <Badge 
                  variant={
                    formData.status === "active" ? "default" :
                    formData.status === "expired" ? "destructive" : "secondary"
                  }
                  className="capitalize"
                >
                  {formData.status === "manually_inactive" ? "Inactive" : formData.status}
                </Badge>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-600">Products</Label>
                <div className="space-y-1">
                  {formData.products.length === 0 ? (
                    <p className="text-sm text-gray-500">No products selected</p>
                  ) : (
                    formData.products.map((product) => (
                      <Badge 
                        key={product} 
                        variant="outline" 
                        className={`mr-1 mb-1 ${getProductColor(product)}`}
                      >
                        {product}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              
              {formData.contract_number && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Contract Number</Label>
                  <p className="text-sm font-semibold">{formData.contract_number}</p>
                </div>
              )}
              
              {(formData.start_date || formData.expiry_date) && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Period</Label>
                  <p className="text-sm">
                    {formData.start_date && `Start: ${new Date(formData.start_date).toLocaleDateString()}`}
                  </p>
                  <p className="text-sm">
                    {formData.expiry_date && `End: ${new Date(formData.expiry_date).toLocaleDateString()}`}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t">
                <Label className="text-sm font-medium text-gray-600">Contract ID</Label>
                <p className="text-sm font-mono text-gray-500">#{contract.id}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
