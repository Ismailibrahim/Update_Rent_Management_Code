"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Plus, Trash2, Package, Search, GripVertical } from "lucide-react";

interface Product {
  id: number;
  name: string | null;
  sku: string | null;
  category?: {
    name: string;
    category_type: string;
  };
}

interface ProductSuggestion {
  id: number;
  product_id: number;
  suggested_product_id: number;
  display_order: number;
  product: Product;
  suggested_product: Product;
}

export default function ProductSuggestionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogSearchTerm, setDialogSearchTerm] = useState("");
  const [draggedItem, setDraggedItem] = useState<ProductSuggestion | null>(null);
  const [dragOverItem, setDragOverItem] = useState<ProductSuggestion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
    loadSuggestions();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(
        (p) =>
          (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
          (p.sku?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      const response = await api.get("/products");
      const productsData = response.data.data || response.data;
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get("/product-suggestions");
      setSuggestions(response.data);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      toast({
        title: "Error",
        description: "Failed to load suggestions",
        variant: "destructive",
      });
      setSuggestions([]);
    }
  };

  const openManageDialog = (product: Product) => {
    setSelectedProduct(product);
    const existing = suggestions
      .filter((s) => s.product_id === product.id)
      .map((s) => s.suggested_product_id);
    setSelectedSuggestions(existing);
    setDialogSearchTerm("");
    setIsDialogOpen(true);
  };

  const toggleSuggestion = (productId: number) => {
    if (selectedSuggestions.includes(productId)) {
      setSelectedSuggestions(selectedSuggestions.filter((id) => id !== productId));
    } else {
      if (selectedSuggestions.length >= 10) {
        toast({
          title: "Limit Reached",
          description: "Maximum 10 suggestions allowed per product",
          variant: "destructive",
        });
        return;
      }
      setSelectedSuggestions([...selectedSuggestions, productId]);
    }
  };

  const saveSuggestions = async () => {
    if (!selectedProduct) return;

    setLoading(true);
    try {
      console.log("Saving suggestions for product:", selectedProduct.id);
      console.log("Selected suggestions:", selectedSuggestions);

      const response = await api.post("/product-suggestions/bulk", {
        product_id: selectedProduct.id,
        suggested_product_ids: selectedSuggestions,
      });

      console.log("Save response:", response.data);

      toast({
        title: "Success",
        description: "Product suggestions updated successfully",
      });

      setIsDialogOpen(false);
      loadSuggestions();
    } catch (error: unknown) {
      console.error("Save error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error("Error response:", err.response?.data);

      toast({
        title: "Error",
        description: err.response?.data?.message || err.message || "Failed to save suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSuggestion = async (id: number) => {
    try {
      await api.delete(`/product-suggestions/${id}`);
      toast({
        title: "Success",
        description: "Suggestion deleted successfully",
      });
      loadSuggestions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete suggestion",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (e: React.DragEvent, suggestion: ProductSuggestion) => {
    setDraggedItem(suggestion);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, suggestion: ProductSuggestion) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverItem(suggestion);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSuggestion: ProductSuggestion) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetSuggestion.id) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // Only allow reordering within the same product
    if (draggedItem.product_id !== targetSuggestion.product_id) {
      toast({
        title: "Invalid Action",
        description: "Cannot reorder suggestions across different products",
        variant: "destructive",
      });
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    try {
      // Get all suggestions for this product
      const productSuggestions = suggestions
        .filter(s => s.product_id === draggedItem.product_id)
        .sort((a, b) => a.display_order - b.display_order);

      // Find indices
      const draggedIndex = productSuggestions.findIndex(s => s.id === draggedItem.id);
      const targetIndex = productSuggestions.findIndex(s => s.id === targetSuggestion.id);

      // Reorder array
      const reordered = [...productSuggestions];
      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      // Update display_order for all items
      const updates = reordered.map((item, index) => ({
        id: item.id,
        display_order: index + 1
      }));

      // Send update to backend
      await api.post('/product-suggestions/reorder', { suggestions: updates });

      toast({
        title: "Success",
        description: "Suggestions reordered successfully",
      });

      loadSuggestions();
    } catch (error) {
      console.error("Reorder error:", error);
      toast({
        title: "Error",
        description: "Failed to reorder suggestions",
        variant: "destructive",
      });
    } finally {
      setDraggedItem(null);
      setDragOverItem(null);
    }
  };

  // Group suggestions by product
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.product_id]) {
      acc[suggestion.product_id] = {
        product: suggestion.product,
        suggestions: [],
      };
    }
    acc[suggestion.product_id].suggestions.push(suggestion);
    return acc;
  }, {} as Record<number, { product: Product; suggestions: ProductSuggestion[] }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Suggestions</h1>
          <p className="text-muted-foreground">
            Manage which products should be suggested together in quotations
          </p>
        </div>
      </div>

      {/* Search and Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Product Suggestions</CardTitle>
          <CardDescription>
            Select a product to manage its suggested items (max 10 per product)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Search Product</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by product name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="ml-3 text-gray-500">Loading products...</p>
            </div>
          ) : (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Suggestions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No products found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const suggestionCount = suggestions.filter(
                      (s) => s.product_id === product.id
                    ).length;

                    return (
                      <TableRow key={product.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{product.name || 'Unnamed Product'}</TableCell>
                        <TableCell className="text-gray-600">{product.sku || 'No SKU'}</TableCell>
                        <TableCell>
                          {product.category && (
                            <Badge variant="outline">
                              {product.category.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={suggestionCount > 0 ? "default" : "secondary"}>
                            {suggestionCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => openManageDialog(product)}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>

      {/* Current Suggestions - Card Layout */}
      <Card>
        <CardHeader>
          <CardTitle>Current Suggestions</CardTitle>
          <CardDescription>All configured product suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedSuggestions).length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No product suggestions configured yet</p>
              <p className="text-sm text-gray-400 mt-1">Select a product above to add suggestions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.values(groupedSuggestions).map(({ product, suggestions: productSuggestions }) => (
                <Card key={product.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name || 'Unnamed Product'}</CardTitle>
                        <CardDescription className="mt-1">
                          SKU: {product.sku || 'No SKU'} • {productSuggestions.length} suggestion{productSuggestions.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openManageDialog(product)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {productSuggestions
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((suggestion) => (
                          <div
                            key={suggestion.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, suggestion)}
                            onDragOver={(e) => handleDragOver(e, suggestion)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, suggestion)}
                            className={`group relative flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-move ${
                              draggedItem?.id === suggestion.id ? 'opacity-50 scale-95' : ''
                            } ${
                              dragOverItem?.id === suggestion.id && draggedItem?.id !== suggestion.id ? 'border-blue-500 bg-blue-100 scale-105' : ''
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-shrink-0 mt-0.5">
                              <Badge variant="secondary" className="w-7 h-7 flex items-center justify-center p-0">
                                {suggestion.display_order}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {suggestion.suggested_product.name || 'Unnamed Product'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {suggestion.suggested_product.sku || 'No SKU'}
                              </p>
                              {suggestion.suggested_product.category && (
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {suggestion.suggested_product.category.name}
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSuggestion(suggestion.id);
                              }}
                              className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Suggestions Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setDialogSearchTerm("");
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Manage Suggestions for {selectedProduct?.name || 'Unnamed Product'}</DialogTitle>
            <DialogDescription>
              Select products to suggest when adding &ldquo;{selectedProduct?.name || 'Unnamed Product'}&rdquo; to a quotation
              (max 10)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[50vh]">
            <div className="text-sm font-medium">
              Selected: {selectedSuggestions.length} / 10
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search products by name or SKU..."
                value={dialogSearchTerm}
                onChange={(e) => setDialogSearchTerm(e.target.value)}
                className="pl-10"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="space-y-2">
              {products
                .filter((p) => {
                  if (p.id === selectedProduct?.id) return false;
                  if (!dialogSearchTerm) return true;
                  const searchLower = dialogSearchTerm.toLowerCase();
                  return (p.name?.toLowerCase() || '').includes(searchLower) ||
                         (p.sku?.toLowerCase() || '').includes(searchLower);
                })
                .map((product) => (
                  <div
                    key={product.id}
                    className={`flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedSuggestions.includes(product.id) ? "bg-blue-50 border-blue-300" : ""
                    }`}
                    onClick={() => toggleSuggestion(product.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSuggestions.includes(product.id)}
                        onChange={() => toggleSuggestion(product.id)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-medium">{product.name || 'Unnamed Product'}</p>
                        <p className="text-sm text-gray-500">{product.sku || 'No SKU'}</p>
                      </div>
                    </div>
                    {product.category && (
                      <Badge variant="outline">{product.category.name}</Badge>
                    )}
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveSuggestions} disabled={loading}>
              {loading ? "Saving..." : "Save Suggestions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
