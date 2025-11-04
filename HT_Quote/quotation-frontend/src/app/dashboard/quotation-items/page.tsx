"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { api } from "@/lib/api";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

interface QuotationItem {
  id: number;
  quotation_id: number;
  product_id?: number;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  currency?: string;
  discount_percentage?: number;
  discount_amount?: number;
  tax_rate?: number;
  item_total: number;
  parent_item_id?: number;
  is_amc_line: boolean;
  quotation?: {
    id: number;
    quotation_number: string;
    customer?: {
      id: number;
      resort_name: string;
    };
  };
  product?: {
    id: number;
    name: string;
  };
}

interface Quotation {
  id: number;
  quotation_number: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
}

export default function QuotationItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<QuotationItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<QuotationItem | null>(null);

  // Currency formatting function
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [formData, setFormData] = useState({
    quotation_id: "",
    product_id: "",
    item_type: "product",
    description: "",
    quantity: "1",
    unit_price: "0",
    currency: "USD",
    discount_percentage: "0",
    discount_amount: "0",
    tax_rate: "0",
    is_amc_line: false,
  });

  useEffect(() => {
    loadItems();
    loadQuotations();
    loadProducts();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/quotation-items");
      setItems(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading quotation items:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadQuotations = async () => {
    try {
      const response = await api.get("/quotations");
      setQuotations(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading quotations:", error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      quotation_id: "",
      product_id: "",
      item_type: "product",
      description: "",
      quantity: "1",
      unit_price: "0",
      currency: "USD",
      discount_percentage: "0",
      discount_amount: "0",
      tax_rate: "0",
      is_amc_line: false,
    });
    setSelectedItem(null);
  };

  const handleCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: QuotationItem) => {
    setSelectedItem(item);
    setFormData({
      quotation_id: item.quotation_id.toString(),
      product_id: item.product_id?.toString() || "",
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      currency: item.currency || "USD",
      discount_percentage: item.discount_percentage?.toString() || "0",
      discount_amount: item.discount_amount?.toString() || "0",
      tax_rate: item.tax_rate?.toString() || "0",
      is_amc_line: item.is_amc_line,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (item: QuotationItem) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await api.delete(`/quotation-items/${itemToDelete.id}`);
      loadItems();
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting quotation item");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        quotation_id: parseInt(formData.quotation_id),
        product_id: formData.product_id ? parseInt(formData.product_id) : null,
        item_type: formData.item_type,
        description: formData.description,
        quantity: parseFloat(formData.quantity),
        unit_price: parseFloat(formData.unit_price),
        currency: formData.currency,
        discount_percentage: parseFloat(formData.discount_percentage),
        discount_amount: parseFloat(formData.discount_amount),
        tax_rate: parseFloat(formData.tax_rate),
        is_amc_line: formData.is_amc_line,
      };

      if (selectedItem) {
        await api.put(`/quotation-items/${selectedItem.id}`, payload);
      } else {
        await api.post("/quotation-items", payload);
      }

      loadItems();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving item:", error);
      const errorMsg = error.response?.data?.message || "Error saving quotation item";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.quotation?.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotation Items</h1>
          <p className="text-muted-foreground">Manage quotation line items</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Items</CardTitle>
          <CardDescription>Filter quotation items by description or quotation number</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table className="table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Quotation #</TableHead>
                <TableHead className="w-40">Customer</TableHead>
                <TableHead className="w-24">Type</TableHead>
                <TableHead className="min-w-48">Description</TableHead>
                <TableHead className="w-48">Product</TableHead>
                <TableHead className="text-right w-20">Quantity</TableHead>
                <TableHead className="text-right w-24">Unit Price</TableHead>
                <TableHead className="text-right w-24">Total</TableHead>
                <TableHead className="text-right w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No quotation items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.quotation?.quotation_number || `#${item.quotation_id}`}
                    </TableCell>
                    <TableCell>
                      {item.quotation?.customer?.resort_name || "-"}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                        {item.item_type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={item.description}>{item.description}</TableCell>
                    <TableCell>{item.product?.name || "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.unit_price), item.currency || 'USD')}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.item_total), item.currency || 'USD')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(item)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            <DialogDescription>
              {selectedItem ? "Update quotation item details" : "Create a new quotation item"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quotation_id">Quotation *</Label>
                <Select
                  value={formData.quotation_id}
                  onValueChange={(value) => handleInputChange("quotation_id", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select quotation" />
                  </SelectTrigger>
                  <SelectContent>
                    {quotations.map((quot) => (
                      <SelectItem key={quot.id} value={quot.id.toString()}>
                        {quot.quotation_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="item_type">Item Type *</Label>
                <Select
                  value={formData.item_type}
                  onValueChange={(value) => handleInputChange("item_type", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="amc">AMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product_id">Product (Optional)</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) => handleInputChange("product_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {products.map((prod) => (
                    <SelectItem key={prod.id} value={prod.id.toString()}>
                      {prod.name} ({prod.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange("quantity", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price}
                  onChange={(e) => handleInputChange("unit_price", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange("currency", e.target.value)}
                  maxLength={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="discount_percentage">Discount %</Label>
                <Input
                  id="discount_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount_percentage}
                  onChange={(e) => handleInputChange("discount_percentage", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount_amount">Discount Amount</Label>
                <Input
                  id="discount_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => handleInputChange("discount_amount", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_rate">Tax Rate %</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : selectedItem ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this quotation item. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}