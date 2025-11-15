"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Package,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  GripVertical,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

interface SupportProduct {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Statistics {
  total: number;
  active: number;
  inactive: number;
}

export default function SupportProductsPage() {
  const [products, setProducts] = useState<SupportProduct[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    inactive: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SupportProduct | null>(null);
  const [createData, setCreateData] = useState({
    name: "",
    is_active: true,
  });
  const [editData, setEditData] = useState({
    name: "",
    is_active: true,
  });

  useEffect(() => {
    fetchProducts();
    fetchStatistics();
  }, [searchQuery, statusFilter]);

  const fetchProducts = async () => {
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get("/support-products", { params });
      setProducts(response.data.data || response.data);
    } catch (error) {
      console.error("Error fetching support products:", error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get("/support-products/statistics");
      setStatistics(response.data.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  const handleCreateProduct = async () => {
    // Frontend validation
    if (!createData.name.trim()) {
      alert("Product name is required.");
      return;
    }

    try {
      await api.post("/support-products", createData);
      setCreateDialogOpen(false);
      resetCreateData();
      fetchProducts();
      fetchStatistics();
    } catch (error: any) {
      console.error("Error creating support product:", error);
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        if (errors) {
          let errorMessage = "Validation failed:\n";
          Object.keys(errors).forEach(key => {
            errorMessage += `• ${key}: ${errors[key].join(', ')}\n`;
          });
          alert(errorMessage);
        } else {
          alert("Validation failed. Please check your input.");
        }
      } else {
        alert("Failed to create support product: " + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    // Frontend validation
    if (!editData.name.trim()) {
      alert("Product name is required.");
      return;
    }

    try {
      await api.put(`/support-products/${selectedProduct.id}`, editData);
      setEditDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchStatistics();
    } catch (error: any) {
      console.error("Error updating support product:", error);
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        if (errors) {
          let errorMessage = "Validation failed:\n";
          Object.keys(errors).forEach(key => {
            errorMessage += `• ${key}: ${errors[key].join(', ')}\n`;
          });
          alert(errorMessage);
        } else {
          alert("Validation failed. Please check your input.");
        }
      } else {
        alert("Failed to update support product: " + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      await api.delete(`/support-products/${selectedProduct.id}`);
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchStatistics();
    } catch (error) {
      console.error("Error deleting support product:", error);
    }
  };

  const handleToggleStatus = async (product: SupportProduct) => {
    try {
      await api.post(`/support-products/${product.id}/toggle-status`);
      fetchProducts();
      fetchStatistics();
    } catch (error) {
      console.error("Error toggling status:", error);
    }
  };

  const handleMoveUp = async (product: SupportProduct, index: number) => {
    if (index === 0) return;

    const newProducts = [...products];
    const temp = newProducts[index - 1];
    newProducts[index - 1] = newProducts[index];
    newProducts[index] = temp;

    const updatedProducts = newProducts.map((p, i) => ({
      id: p.id,
      sort_order: i,
    }));

    try {
      await api.post("/support-products/update-sort-order", {
        products: updatedProducts,
      });
      fetchProducts();
    } catch (error) {
      console.error("Error updating sort order:", error);
    }
  };

  const handleMoveDown = async (product: SupportProduct, index: number) => {
    if (index === products.length - 1) return;

    const newProducts = [...products];
    const temp = newProducts[index + 1];
    newProducts[index + 1] = newProducts[index];
    newProducts[index] = temp;

    const updatedProducts = newProducts.map((p, i) => ({
      id: p.id,
      sort_order: i,
    }));

    try {
      await api.post("/support-products/update-sort-order", {
        products: updatedProducts,
      });
      fetchProducts();
    } catch (error) {
      console.error("Error updating sort order:", error);
    }
  };

  const openEditDialog = (product: SupportProduct) => {
    setSelectedProduct(product);
    setEditData({
      name: product.name,
      is_active: product.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (product: SupportProduct) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const resetCreateData = () => {
    setCreateData({
      name: "",
      is_active: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Products</h1>
          <p className="text-muted-foreground">
            Manage products covered by support contracts
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Package className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No support products found
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(product, index)}
                            disabled={index === 0}
                          >
                            <GripVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                              <Power className="mr-2 h-4 w-4" />
                              {product.is_active ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveUp(product, index)}
                              disabled={index === 0}
                            >
                              ↑ Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMoveDown(product, index)}
                              disabled={index === products.length - 1}
                            >
                              ↓ Move Down
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(product)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Support Product</DialogTitle>
            <DialogDescription>
              Create a new product that can be covered by support contracts
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Product Name *</Label>
              <Input
                id="create-name"
                value={createData.name}
                onChange={(e) =>
                  setCreateData({ ...createData, name: e.target.value })
                }
                placeholder="e.g., OPERA Cloud"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="create-active"
                checked={createData.is_active}
                onChange={(e) =>
                  setCreateData({ ...createData, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="create-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateData();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProduct}
              disabled={!createData.name.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Support Product</DialogTitle>
            <DialogDescription>Update support product details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name *</Label>
              <Input
                id="edit-name"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                placeholder="e.g., OPERA Cloud"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editData.is_active}
                onChange={(e) =>
                  setEditData({ ...editData, is_active: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEditProduct}
              disabled={!editData.name.trim()}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Support Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedProduct?.name}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
