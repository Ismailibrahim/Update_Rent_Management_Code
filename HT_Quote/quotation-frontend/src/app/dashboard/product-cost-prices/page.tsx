"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api, productsApi } from "@/lib/api";
import { Search, Plus, Edit, Trash2, DollarSign, Calendar, Package } from "lucide-react";
import { format } from "date-fns";

interface Product {
  id: number;
  name: string;
  sku: string;
  category?: {
    name: string;
  };
}

interface ProductCostPrice {
  id: number;
  product_id: number;
  cost_price: number;
  shipment_received_date: string;
  supplier_name?: string;
  invoice_number?: string;
  notes?: string;
  product?: Product;
  created_at: string;
  updated_at: string;
}

interface CostPriceFormData {
  product_id: number | null;
  cost_price: string;
  shipment_received_date: string;
  supplier_name: string;
  invoice_number: string;
  notes: string;
}

export default function ProductCostPricesPage() {
  const { toast } = useToast();
  const [costPrices, setCostPrices] = useState<ProductCostPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCostPrice, setEditingCostPrice] = useState<ProductCostPrice | null>(null);
  const [formData, setFormData] = useState<CostPriceFormData>({
    product_id: null,
    cost_price: "",
    shipment_received_date: new Date().toISOString().split('T')[0],
    supplier_name: "",
    invoice_number: "",
    notes: "",
  });

  useEffect(() => {
    loadCostPrices();
    loadProducts();
  }, []);

  const loadCostPrices = async () => {
    try {
      setLoading(true);
      const response = await api.get('/product-cost-prices', {
        params: searchTerm ? { search: searchTerm } : {}
      });
      setCostPrices(response.data.data || response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to load cost prices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsApi.getAll();
      setProducts(response.data.data || response.data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const handleSearch = () => {
    loadCostPrices();
  };

  const resetForm = () => {
    setFormData({
      product_id: null,
      cost_price: "",
      shipment_received_date: new Date().toISOString().split('T')[0],
      supplier_name: "",
      invoice_number: "",
      notes: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.product_id || !formData.cost_price || !formData.shipment_received_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await api.post('/product-cost-prices', formData);
      toast({
        title: "Success",
        description: "Cost price created successfully!",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      await loadCostPrices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create cost price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingCostPrice || !formData.product_id || !formData.cost_price || !formData.shipment_received_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await api.put(`/product-cost-prices/${editingCostPrice.id}`, formData);
      toast({
        title: "Success",
        description: "Cost price updated successfully!",
      });
      setIsEditDialogOpen(false);
      setEditingCostPrice(null);
      resetForm();
      await loadCostPrices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update cost price",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this cost price?")) return;

    try {
      await api.delete(`/product-cost-prices/${id}`);
      toast({
        title: "Success",
        description: "Cost price deleted successfully!",
      });
      await loadCostPrices();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete cost price",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (costPrice: ProductCostPrice) => {
    setEditingCostPrice(costPrice);
    setFormData({
      product_id: costPrice.product_id,
      cost_price: costPrice.cost_price.toString(),
      shipment_received_date: costPrice.shipment_received_date,
      supplier_name: costPrice.supplier_name || "",
      invoice_number: costPrice.invoice_number || "",
      notes: costPrice.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Cost Prices</h1>
          <p className="text-muted-foreground">
            Track product cost prices with shipment dates
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cost Price
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Cost Prices</CardTitle>
          <CardDescription>Search by product name, SKU, supplier, or invoice number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Prices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Cost Prices</CardTitle>
          <CardDescription>
            {costPrices.length} cost price{costPrices.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Shipment Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Invoice #</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      <span>Loading...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : costPrices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No cost prices found
                  </TableCell>
                </TableRow>
              ) : (
                costPrices.map((costPrice) => (
                  <TableRow key={costPrice.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{costPrice.product?.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{costPrice.product?.sku || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{parseFloat(costPrice.cost_price.toString()).toFixed(2)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(costPrice.shipment_received_date), 'MMM dd, yyyy')}</span>
                      </div>
                    </TableCell>
                    <TableCell>{costPrice.supplier_name || '-'}</TableCell>
                    <TableCell>{costPrice.invoice_number || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(costPrice)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(costPrice.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Cost Price</DialogTitle>
            <DialogDescription>
              Record a new product cost price with shipment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-product">Product *</Label>
                <Select
                  value={formData.product_id?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, product_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} {product.sku ? `(${product.sku})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-cost-price">Cost Price *</Label>
                <Input
                  id="create-cost-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-date">Shipment Received Date *</Label>
                <Input
                  id="create-date"
                  type="date"
                  value={formData.shipment_received_date}
                  onChange={(e) => setFormData({ ...formData, shipment_received_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-supplier">Supplier Name</Label>
                <Input
                  id="create-supplier"
                  placeholder="Enter supplier name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-invoice">Invoice Number</Label>
              <Input
                id="create-invoice"
                placeholder="Enter invoice number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                placeholder="Enter any additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Cost Price</DialogTitle>
            <DialogDescription>
              Update product cost price and shipment details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product">Product *</Label>
                <Select
                  value={formData.product_id?.toString() || ""}
                  onValueChange={(value) => setFormData({ ...formData, product_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} {product.sku ? `(${product.sku})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cost-price">Cost Price *</Label>
                <Input
                  id="edit-cost-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Shipment Received Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.shipment_received_date}
                  onChange={(e) => setFormData({ ...formData, shipment_received_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier Name</Label>
                <Input
                  id="edit-supplier"
                  placeholder="Enter supplier name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-invoice">Invoice Number</Label>
              <Input
                id="edit-invoice"
                placeholder="Enter invoice number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Enter any additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingCostPrice(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
