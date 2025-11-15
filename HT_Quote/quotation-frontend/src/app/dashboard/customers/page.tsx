"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { customersApi, countriesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  MoreHorizontal,
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
} from "lucide-react";

interface Customer {
  id: number;
  resort_code?: string;
  resort_name: string;
  holding_company?: string;
  address?: string;
  country?: string;
  tax_number?: string;
  payment_terms?: string;
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  contacts?: Array<{
    id: number;
    contact_person: string;
    designation?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    is_primary: boolean;
    contact_type: string;
  }>;
}

interface CustomerFormData {
  resort_code: string;
  resort_name: string;
  holding_company: string;
  address: string;
  country: string;
  tax_number?: string;
  payment_terms?: string;
}

interface Country {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCustomers, setTotalCustomers] = useState(0);
  
  // Sorting state
  const [sortField, setSortField] = useState<keyof Customer | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [resortCodeError, setResortCodeError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CustomerFormData>({
    resort_code: "",
    resort_name: "",
    holding_company: "",
    address: "",
    country: "",
    tax_number: "",
    payment_terms: "",
  });

  // Import dialog states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'import'>('upload');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);

  useEffect(() => {
    loadCustomers();
    loadCountries();
  }, []);

  const loadCustomers = async (page = currentPage, perPage = itemsPerPage) => {
    try {
      setLoading(true);
      const response = await customersApi.getAll();
      console.log('Customers API Response:', response);
      const customersData = response.data.data || response.data;
      console.log('Total customers loaded:', customersData.length);
      
      // Set total count
      setTotalCustomers(customersData.length);
      
      // For now, we'll do client-side pagination since the API doesn't support server-side pagination
      // In a real application, you'd want to implement server-side pagination
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await countriesApi.getAll();
      setCountries(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast({
        title: "Error",
        description: "Failed to load countries",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    const processedValue = (field === 'country' && value === 'none') ? '' : value;
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear resort code error when user starts typing
    if (field === 'resort_code' && resortCodeError) {
      setResortCodeError(null);
    }
    // Keep Credit checkbox in sync with Payment Terms
    if (field === 'payment_terms') {
      // no-op, visual sync happens via checked binding
    }

    // Real-time duplicate checking for resort code and name
    if (field === 'resort_code' && value.trim()) {
      const duplicate = customers.find(customer => 
          customer.resort_code?.toLowerCase() === value.toLowerCase() && 
        (!editingCustomer || customer.id !== editingCustomer.id)
        );
      if (duplicate) {
        setResortCodeError(`Resort code "${value}" already exists`);
        } else {
          setResortCodeError(null);
        }
    }

    if (field === 'resort_name' && value.trim()) {
      const duplicate = customers.find(customer => 
        customer.resort_name.toLowerCase() === value.toLowerCase() &&
        (!editingCustomer || customer.id !== editingCustomer.id)
      );
      if (duplicate) {
        // You could add a similar error state for resort name if needed
        console.log(`Resort name "${value}" already exists`);
      }
    }
  };

  const resetForm = () => {
      setFormData({
        resort_code: "",
        resort_name: "",
        holding_company: "",
        address: "",
        country: "",
        tax_number: "",
      payment_terms: "",
      });
      setResortCodeError(null);
  };

  const handleCreateCustomer = async () => {
    if (!formData.resort_name.trim()) {
      toast({
        title: "Error",
        description: "Resort name is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates before submitting
    const duplicateName = customers.find(customer => 
      customer.resort_name.toLowerCase() === formData.resort_name.toLowerCase()
    );
    
    const duplicateCode = formData.resort_code.trim() && customers.find(customer => 
      customer.resort_code?.toLowerCase() === formData.resort_code.toLowerCase()
    );

    if (duplicateName) {
      toast({
        title: "Duplicate Resort Name",
        description: `A customer with the name "${formData.resort_name}" already exists. Please choose a different name.`,
        variant: "destructive",
      });
      return;
    }

    if (duplicateCode) {
      toast({
        title: "Duplicate Resort Code",
        description: `A customer with the code "${formData.resort_code}" already exists. Please choose a different code.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await customersApi.create(formData);
      toast({
        title: "Success",
        description: "Customer created successfully!",
      });
      resetForm();
      setIsCreateDialogOpen(false);
      await loadCustomers();
    } catch (error: any) {
      console.error('Error creating customer:', error);
      
      // Handle server-side validation errors
      const errorMessage = error.response?.data?.message || "Failed to create customer";
      const errorDetails = error.response?.data?.errors;
      
      if (errorDetails) {
        // Handle Laravel validation errors
        const firstError = Object.values(errorDetails)[0];
        const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
        toast({
          title: "Validation Error",
          description: errorText,
          variant: "destructive",
        });
      } else {
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!editingCustomer) return;
    
    if (!formData.resort_name.trim()) {
      toast({
        title: "Error",
        description: "Resort name is required",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates before submitting (excluding current customer)
    const duplicateName = customers.find(customer => 
      customer.id !== editingCustomer.id && 
      customer.resort_name.toLowerCase() === formData.resort_name.toLowerCase()
    );
    
    const duplicateCode = formData.resort_code.trim() && customers.find(customer => 
      customer.id !== editingCustomer.id && 
      customer.resort_code?.toLowerCase() === formData.resort_code.toLowerCase()
    );

    if (duplicateName) {
      toast({
        title: "Duplicate Resort Name",
        description: `A customer with the name "${formData.resort_name}" already exists. Please choose a different name.`,
        variant: "destructive",
      });
      return;
    }

    if (duplicateCode) {
      toast({
        title: "Duplicate Resort Code",
        description: `A customer with the code "${formData.resort_code}" already exists. Please choose a different code.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await customersApi.update(editingCustomer.id.toString(), formData);
      toast({
        title: "Success",
        description: "Customer updated successfully!",
      });
      resetForm();
      setIsEditDialogOpen(false);
      setEditingCustomer(null);
      await loadCustomers();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      
      // Handle server-side validation errors
      const errorMessage = error.response?.data?.message || "Failed to update customer";
      const errorDetails = error.response?.data?.errors;
      
      if (errorDetails) {
        // Handle Laravel validation errors
        const firstError = Object.values(errorDetails)[0];
        const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
        toast({
          title: "Validation Error",
          description: errorText,
          variant: "destructive",
        });
        } else {
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    try {
      setLoading(true);
      await customersApi.delete(deletingCustomer.id.toString());
      toast({
        title: "Success",
        description: "Customer deleted successfully!",
      });
      setIsDeleteDialogOpen(false);
      setDeletingCustomer(null);
      await loadCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      resort_code: customer.resort_code || "",
      resort_name: customer.resort_name,
      holding_company: customer.holding_company || "",
      address: customer.address || "",
      country: customer.country || "",
      tax_number: customer.tax_number || "",
      payment_terms: customer.payment_terms || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setDeletingCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  const openViewDialog = (customer: Customer) => {
    setViewingCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const downloadTemplate = () => {
    const csvContent = `resort_code,resort_name,holding_company,address,country,tax_number,payment_terms
RES001,Paradise Resort,Paradise Holdings Ltd,"123 Beach Road, Malé",Maldives,TAX123456,Net 30
RES002,Sunset Villa,Sunset Group,"456 Ocean View, Addu",Maldives,TAX789012,COD
RES003,Blue Lagoon Resort,Blue Lagoon Holdings,"789 Lagoon Street, Baa Atoll",Maldives,TAX345678,Net 15`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportStep('preview');
      
      // Parse CSV file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
      toast({
        title: "Error",
              description: "CSV file must contain at least a header row and one data row",
        variant: "destructive",
      });
            return;
          }

          // Helper function to parse CSV line properly
          const parseCSVLine = (line: string): string[] => {
            const result: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
    } else {
                current += char;
              }
            }
            
            result.push(current.trim());
            return result;
          };

          // Parse headers
          const headers = parseCSVLine(lines[0]);
          console.log('Parsed headers:', headers);
          
          // Validate required headers
          const requiredHeaders = ['resort_name'];
          const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
          
          if (missingHeaders.length > 0) {
        toast({
          title: "Error",
              description: `Missing required headers: ${missingHeaders.join(', ')}`,
          variant: "destructive",
        });
            return;
          }

          // Parse data rows
          const data = lines.slice(1).map((line, index) => {
            const values = parseCSVLine(line);
            const row: any = {};
            headers.forEach((header, headerIndex) => {
              row[header] = values[headerIndex] || '';
            });
            row._rowNumber = index + 2; // For error reporting
            return row;
          }).filter(row => row.resort_name && row.resort_name.trim()); // Filter out empty rows

          console.log('Parsed data sample:', data.slice(0, 2)); // Log first 2 rows for debugging

          if (data.length === 0) {
      toast({
        title: "Error",
              description: "No valid data rows found in CSV file",
        variant: "destructive",
      });
            return;
          }

          setImportData(data);
        } catch (error) {
          console.error('Error parsing CSV:', error);
      toast({
        title: "Error",
            description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive",
      });
    }
      };
      reader.readAsText(file);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setImportStep('import');
      
      // Validate data before sending
      const validData = importData.filter(row => {
        if (!row.resort_name || !row.resort_name.trim()) {
          return false;
        }
        return true;
      });

      if (validData.length === 0) {
        setImportResult({
          success: 0,
          errors: ['No valid data to import. Please check that all rows have a resort name.']
        });
        return;
      }

      const response = await customersApi.bulkImport(validData);
      setImportResult(response.data);
      
      if (response.data.success > 0) {
      await loadCustomers();
      toast({
          title: "Import Successful",
          description: `${response.data.success} customers imported successfully`,
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.message || 'Import failed';
      setImportResult({
        success: 0,
        errors: [errorMessage]
      });
      toast({
        title: "Import Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep('upload');
    setImportResult(null);
    setIsImportDialogOpen(false);
  };

  const filteredCustomers = customers.filter(customer =>
      customer.resort_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.resort_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.holding_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.country?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Handle null/undefined values
    if (!aValue && !bValue) return 0;
    if (!aValue) return sortDirection === 'asc' ? 1 : -1;
    if (!bValue) return sortDirection === 'asc' ? -1 : 1;
    
    // Convert to strings for comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  // Sorting handler
  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Helper function to get sort icon
  const getSortIcon = (field: keyof Customer) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} customers
                {searchTerm && ` (filtered from ${customers.length} total)`}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
          <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
            />
          </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('resort_code')}
                >
                    <div className="flex items-center space-x-1">
                      <span>Resort Code</span>
                    {getSortIcon('resort_code')}
                  </div>
                </TableHead>
                <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('resort_name')}
                >
                    <div className="flex items-center space-x-1">
                      <span>Resort Name</span>
                    {getSortIcon('resort_name')}
                  </div>
                </TableHead>
                <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => handleSort('holding_company')}
                >
                    <div className="flex items-center space-x-1">
                      <span>Company</span>
                      {getSortIcon('holding_company')}
                  </div>
                </TableHead>
                <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('address')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Address</span>
                      {getSortIcon('address')}
                  </div>
                </TableHead>
                <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => handleSort('country')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Country</span>
                      {getSortIcon('country')}
                  </div>
                </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "No customers found matching your search" : "No customers found"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                      {customer.resort_code || '-'}
                  </TableCell>
                      <TableCell>{customer.resort_name}</TableCell>
                      <TableCell>{customer.holding_company || '-'}</TableCell>
                      <TableCell className="max-w-xs">
                        {customer.address ? (
                          <div className="whitespace-pre-line text-sm" title={customer.address}>
                            {customer.address}
                    </div>
                        ) : (
                          '-'
                        )}
                  </TableCell>
                      <TableCell>{customer.country || '-'}</TableCell>
                      <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDialog(customer)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openEditDialog(customer)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="mr-2 h-4 w-4" />
                          View Quotations
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(customer)}
                              className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
              </div>

          {/* Pagination Controls */}
          {filteredCustomers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Rows per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
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

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                          <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="h-8 w-8 p-0"
                          >
                        {pageNum}
                          </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resort-code">Resort Code</Label>
              <Input
                id="resort-code"
                placeholder="e.g., RES001"
                value={formData.resort_code}
                onChange={(e) => handleInputChange('resort_code', e.target.value)}
              />
              {resortCodeError && (
                <p className="text-sm text-red-600">{resortCodeError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="resort-name">Resort Name *</Label>
              <Input
                id="resort-name"
                placeholder="e.g., Paradise Resort"
                value={formData.resort_name}
                onChange={(e) => handleInputChange('resort_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holding-company">Company</Label>
              <Input
                id="holding-company"
                placeholder="e.g., Paradise Holdings Ltd"
                value={formData.holding_company}
                onChange={(e) => handleInputChange('holding_company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter full address (supports multiple lines)"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select 
                  value={formData.country || 'none'} 
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No country selected</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-number">Tax Number</Label>
                <Input
                  id="tax-number"
                  placeholder="e.g., TAX123456"
                  value={formData.tax_number}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                />
              </div>
              </div>
              <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="payment-terms-credit"
                    checked={(formData.payment_terms || '').toLowerCase() === 'credit'}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      handleInputChange('payment_terms', isChecked ? 'Credit' : '');
                    }}
                  />
                  <Label htmlFor="payment-terms-credit" className="text-sm">Credit</Label>
                </div>
              </div>
              <Input
                id="payment-terms"
                placeholder="e.g., Net 30, COD, etc."
                value={formData.payment_terms}
                onChange={(e) => handleInputChange('payment_terms', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCustomer} disabled={loading}>
              {loading ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Label htmlFor="edit-resort-code">Resort Code</Label>
              <Input
                id="edit-resort-code"
                placeholder="e.g., RES001"
                value={formData.resort_code}
                onChange={(e) => handleInputChange('resort_code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-resort-name">Resort Name *</Label>
              <Input
                id="edit-resort-name"
                placeholder="e.g., Paradise Resort"
                value={formData.resort_name}
                onChange={(e) => handleInputChange('resort_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-holding-company">Company</Label>
              <Input
                id="edit-holding-company"
                placeholder="e.g., Paradise Holdings Ltd"
                value={formData.holding_company}
                onChange={(e) => handleInputChange('holding_company', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Textarea
                id="edit-address"
                placeholder="Enter full address (supports multiple lines)"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-country">Country</Label>
                <Select 
                  value={formData.country || 'none'} 
                  onValueChange={(value) => handleInputChange('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No country selected</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tax-number">Tax Number</Label>
              <Input
                  id="edit-tax-number"
                  placeholder="e.g., TAX123456"
                  value={formData.tax_number}
                  onChange={(e) => handleInputChange('tax_number', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-payment-terms">Payment Terms</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-payment-terms-credit"
                    checked={(formData.payment_terms || '').toLowerCase() === 'credit'}
                    onCheckedChange={(checked) => {
                      const isChecked = Boolean(checked);
                      handleInputChange('payment_terms', isChecked ? 'Credit' : '');
                    }}
                  />
                  <Label htmlFor="edit-payment-terms-credit" className="text-sm">Credit</Label>
                </div>
              </div>
              <Input
                id="edit-payment-terms"
                placeholder="e.g., Net 30, COD, etc."
                value={formData.payment_terms}
                onChange={(e) => handleInputChange('payment_terms', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCustomer} disabled={loading}>
              {loading ? "Updating..." : "Update Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCustomer?.resort_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Deleting..." : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Customer Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              Quick view of customer information
            </DialogDescription>
          </DialogHeader>
          {viewingCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Resort Code</p>
                  <p className="text-sm font-medium">{viewingCustomer.resort_code || '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Resort Name</p>
                  <p className="text-sm font-medium">{viewingCustomer.resort_name}</p>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Company</p>
                  <p className="text-sm font-medium">{viewingCustomer.holding_company || '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Country</p>
                  <p className="text-sm font-medium">{viewingCustomer.country || '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Tax Number</p>
                  <p className="text-sm font-medium">{viewingCustomer.tax_number || '-'}</p>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500">Payment Terms</p>
                  <p className="text-sm font-medium">{viewingCustomer.payment_terms || '-'}</p>
                </div>
              </div>
              {viewingCustomer.address && (
                <div className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-white">
                  <p className="text-xs uppercase text-gray-500 mb-1">Address</p>
                  <p className="text-sm whitespace-pre-line">{viewingCustomer.address}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Customers</DialogTitle>
            <DialogDescription>
              Import customers from a CSV file
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importStep} className="w-full flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="preview">Preview Data</TabsTrigger>
              <TabsTrigger value="import">Import Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4 flex-1 overflow-auto">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-blue-600 hover:text-blue-500">
                      Choose CSV file
                    </span>
                    <input
                      id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  </Label>
                  <p className="text-sm text-gray-500 mt-2">
                    or drag and drop your CSV file here
                  </p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                      Download Template
                    </Button>
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancel
                    </Button>
                  </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4 flex-1 overflow-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Ready to import {importData.length} customers
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Review the data below before proceeding with the import
                </p>
              </div>

              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Resort Code</TableHead>
                      <TableHead>Resort Name</TableHead>
                      <TableHead>Holding Company</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.slice(0, 10).map((row, index) => {
                      const isValid = row.resort_name && row.resort_name.trim();
                      return (
                        <TableRow key={index} className={!isValid ? 'bg-red-50' : ''}>
                          <TableCell className="font-mono text-xs">{row._rowNumber || index + 2}</TableCell>
                          <TableCell>{row.resort_code || '-'}</TableCell>
                          <TableCell className={!isValid ? 'text-red-600 font-medium' : ''}>
                            {row.resort_name || 'Missing'}
                          </TableCell>
                          <TableCell>{row.holding_company || '-'}</TableCell>
                          <TableCell>{row.country || '-'}</TableCell>
                          <TableCell>
                            {isValid ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Valid
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Invalid
                              </Badge>
                            )}
                          </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing first 10 rows of {importData.length} total rows
                </span>
                <span>
                  {importData.filter(row => row.resort_name && row.resort_name.trim()).length} valid rows
                </span>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setImportStep('upload')}>
                  Back
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={loading || importData.filter(row => row.resort_name && row.resort_name.trim()).length === 0}
                  className="bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {loading ? "Importing..." : `Import ${importData.filter(row => row.resort_name && row.resort_name.trim()).length} Customers`}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="import" className="space-y-4 flex-1 overflow-auto">
              {importResult && (
            <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {importResult.success > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      Import completed: {importResult.success} customers imported successfully
                    </span>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Errors ({importResult.errors.length}):</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-32 overflow-auto">
                        {importResult.errors.map((error: any, index: number) => (
                          <div key={index} className="text-sm text-red-600 mb-2 p-2 bg-white rounded border">
                            <div className="font-medium">
                              Row {error.row}: {error.resort_name || 'Unknown'}
                  </div>
                            <div className="text-xs text-red-500 mt-1">
                              {error.error}
                </div>
                          </div>
                        ))}
              </div>
            </div>
          )}
                  
                  {importResult.success > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          Successfully imported {importResult.success} customers
                        </span>
          </div>
                      <p className="text-xs text-green-600 mt-1">
                        The customers have been added to your database and are now available in the customer list.
                      </p>
            </div>
                  )}
                          </div>
              )}
              
              <div className="flex justify-end">
                <Button onClick={resetImport} className="bg-gray-900 hover:bg-gray-800 text-white">
                  Done
            </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}