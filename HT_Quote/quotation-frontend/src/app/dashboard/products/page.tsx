"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { productsApi, categoriesApi, amcApi } from "@/lib/api";
import { Search, Plus, Edit, Trash2, Package, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Product {
  id: number;
  name: string;
  description: string;
  sku: string;
  category_id: number;
  unit_price: number;
  total_man_days?: number;
  pricing_model?: 'one_time' | 'recurring';
  is_man_day_based: boolean;
  has_amc_option: boolean;
  amc_unit_price?: number;
  amc_description_id?: number;
  brand?: string;
  model?: string;
  part_number?: string;
  is_discountable: boolean;
  is_active: boolean;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  man_day_rate?: number;
  total_lot_price?: number;
  is_service_product?: boolean;
  category?: {
    id: number;
    name: string;
    category_type: string;
  };
  amc_description?: {
    id: number;
    description: string;
  };
}

interface Category {
  id: number;
  name: string;
  category_type: 'services' | 'hardware' | 'software' | 'spare_parts';
}

interface AmcDescription {
  id: number;
  description: string;
  product_type?: string;
}


export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [amcDescriptions, setAmcDescriptions] = useState<AmcDescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();


  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Sorting state
  const [sortField, setSortField] = useState<keyof Product>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadAmcDescriptions();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsApi.getAll();
      // Handle both paginated and non-paginated responses
      const productsData = response.data.data || response.data;
      
      if (Array.isArray(productsData)) {
        // Backend now provides man_day_rate, total_lot_price, and is_service_product
        setProducts(productsData);
      } else {
        console.error("Products data is not an array:", productsData);
        setProducts([]);
      }
    } catch (error) {
      console.error("Error loading products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please check if the backend server is running.",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadAmcDescriptions = async () => {
    try {
      const response = await amcApi.getDescriptions();
      setAmcDescriptions(response.data);
    } catch (error) {
      console.error("Error loading AMC descriptions:", error);
    }
  };



  const handleDelete = async () => {
    if (!selectedProduct) return;

    try {
      setSubmitting(true);
      await productsApi.delete(selectedProduct.id.toString());
      
      setProducts(products.filter(p => p.id !== selectedProduct.id));
      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Product deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };


  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  // Handle sort
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Product) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.sku?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.brand?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "all" ||
      (product.category && product.category.category_type === categoryFilter);

    return matchesSearch && matchesCategory;
  });

  // Sort filtered products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle nested category name
    if (sortField === 'category_id' || sortField === 'category') {
      aValue = a.category?.name || '';
      bValue = b.category?.name || '';
    }

    // Convert to string for comparison
    const aStr = (aValue ?? '').toString();
    const bStr = (bValue ?? '').toString();

    const comparison = aStr.localeCompare(bStr);
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex);

  // Reset to page 1 when search term or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage product catalog and pricing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/dashboard/products/spreadsheet')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel Spreadsheet
          </Button>
          <Button onClick={() => router.push('/dashboard/products/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Package className="h-5 w-5 text-gray-600" />
            <span>Product Catalog</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Search and filter products by name, SKU, or category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400">
                <SelectValue placeholder="Filter by category type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="software">Software</SelectItem>
                <SelectItem value="spare_parts">Spare Parts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-gray-900">Products</CardTitle>
          <CardDescription className="text-gray-600">
            {sortedProducts.length} products found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full table-fixed">
              <TableHeader className="bg-gray-50 border-b">
                <TableRow className="hover:bg-gray-50">
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '12%' }}
                    onClick={() => handleSort('sku')}
                  >
                    <div className="flex items-center">
                      SKU
                      {getSortIcon('sku')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '25%' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Product Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '12%' }}
                    onClick={() => handleSort('unit_price')}
                  >
                    <div className="flex items-center">
                      Price
                      {getSortIcon('unit_price')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '10%' }}
                    onClick={() => handleSort('amc_unit_price')}
                  >
                    <div className="flex items-center">
                      AMC
                      {getSortIcon('amc_unit_price')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '12%' }}
                    onClick={() => handleSort('category_id')}
                  >
                    <div className="flex items-center">
                      Category
                      {getSortIcon('category_id')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-gray-700 py-3 px-4 cursor-pointer select-none"
                    style={{ width: '15%' }}
                    onClick={() => handleSort('brand')}
                  >
                    <div className="flex items-center">
                      Brand/Model
                      {getSortIcon('brand')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="font-medium text-gray-700 py-3 px-4 text-center"
                    style={{ width: '8%' }}
                  >
                    Discount
                  </TableHead>
                  <TableHead 
                    className="font-medium text-gray-700 py-3 px-4"
                    style={{ width: '6%' }}
                  >
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
            <TableBody className="divide-y divide-gray-200">
                {paginatedProducts.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <Package className="h-12 w-12 text-gray-300" />
                        <div className="text-gray-500 font-medium">No products found</div>
                        <div className="text-gray-400 text-sm">Try adjusting your search or filters</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                paginatedProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="py-3 px-4">
                        <span className="font-mono text-sm text-gray-600">
                          {product.sku || "N/A"}
                        </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2 w-full">
                            <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">{product.name}</div>
                              {product.description && (
                                <div className="text-sm text-gray-500 truncate mt-1">{product.description}</div>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[400px] z-50 bg-slate-900 text-white border-slate-700">
                          <div className="space-y-1">
                            <div className="font-medium text-white">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-slate-200 whitespace-pre-wrap">{product.description}</div>
                            )}
                      </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1 cursor-help">
                                <span className="font-semibold text-green-700">
                                  {Number(product.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                {product.is_service_product && (
                                  <Badge variant="secondary" className="text-xs">/day</Badge>
                                )}
                          </div>
                        </TooltipTrigger>
                        {product.is_service_product && product.total_man_days && (
                          <TooltipContent side="top" className="max-w-[300px] z-50 bg-slate-900 text-white border-slate-700">
                            <div className="space-y-1">
                              <div className="font-medium text-white">Service Pricing Details</div>
                              <div className="text-sm text-slate-200">
                                <div>Per Day Rate: ${Number(product.unit_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div>Total Man Days: {product.total_man_days}</div>
                                <div className="font-semibold text-green-400">Total Lot Price: ${Number(product.total_lot_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col space-y-1">
                        {product.has_amc_option ? (
                          <span className="font-semibold text-green-700">
                                {Number(product.amc_unit_price || 0).toFixed(2)}
                          </span>
                    ) : (
                          <span className="text-gray-400">-</span>
                    )}
                          </div>
                        </TooltipTrigger>
                        {product.has_amc_option && product.amc_description && (
                          <TooltipContent side="top" className="max-w-[300px] z-50 bg-slate-900 text-white border-slate-700">
                            <div className="space-y-1">
                              <div className="font-medium text-white">AMC Details</div>
                              <div className="text-sm text-slate-200">
                                <div>Price: ${Number(product.amc_unit_price || 0).toFixed(2)}</div>
                                <div>Description: {product.amc_description.description}</div>
                              </div>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${
                            product.category?.category_type === 'hardware' 
                              ? 'border-blue-200 bg-blue-50 text-blue-700' 
                              : product.category?.category_type === 'services' 
                              ? 'border-green-200 bg-green-50 text-green-700' 
                            : product.category?.category_type === 'spare_parts'
                            ? 'border-orange-200 bg-orange-50 text-orange-700'
                              : 'border-purple-200 bg-purple-50 text-purple-700'
                          }`}
                        >
                          {product.category?.name || "No Category"}
                        </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-sm">
                            {product.brand && (
                              <div className="font-medium truncate text-gray-800" title={product.brand}>
                                {product.brand}
                        </div>
                            )}
                            {product.model && (
                              <div className="text-gray-500 truncate text-xs mt-1" title={product.model}>
                                {product.model}
                      </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[300px] z-50 bg-slate-900 text-white border-slate-700">
                          <div className="space-y-1">
                            {product.brand && <div className="font-medium text-white">{product.brand}</div>}
                            {product.model && <div className="text-sm text-slate-200">{product.model}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge 
                        variant={product.is_discountable ? "default" : "secondary"}
                        className={product.is_discountable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                      >
                        {product.is_discountable ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                          onClick={() => router.push(`/dashboard/products/${product.id}/edit`)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                        </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                    </TableCell>
                </TableRow>
                  ))
                )}
            </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedProducts.length)} of {sortedProducts.length} products
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
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
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
        </CardContent>
      </Card>




      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{selectedProduct?.name}&rdquo;? This action cannot be undone.
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