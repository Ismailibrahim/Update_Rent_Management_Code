"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag, Save, X } from "lucide-react";
import { expenseCategoriesApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  allows_item_override: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface ExpenseCategoryFormData {
  name: string;
  description: string;
  allows_item_override: boolean;
  sort_order: number;
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<ExpenseCategoryFormData>({
    name: "",
    description: "",
    allows_item_override: false,
    sort_order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await expenseCategoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading expense categories:", error);
      toast({
        title: "Error",
        description: "Failed to load expense categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      name: "",
      description: "",
      allows_item_override: false,
      sort_order: categories.length + 1,
    });
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      allows_item_override: category.allows_item_override || false,
      sort_order: category.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await expenseCategoriesApi.create(formData);
      setCategories([...categories, response.data]);
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "", allows_item_override: false, sort_order: 0 });
      toast({
        title: "Success",
        description: "Expense category created successfully.",
      });
    } catch (error: any) {
      console.error("Error creating expense category:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create expense category",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const response = await expenseCategoriesApi.update(selectedCategory.id.toString(), formData);
      setCategories(categories.map(c => c.id === selectedCategory.id ? response.data : c));
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ name: "", description: "", allows_item_override: false, sort_order: 0 });
      toast({
        title: "Success",
        description: "Expense category updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating expense category:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update expense category",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: ExpenseCategory) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      await expenseCategoriesApi.delete(category.id.toString());
      setCategories(categories.filter(c => c.id !== category.id));
      toast({
        title: "Success",
        description: "Expense category deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting expense category:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete expense category",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading expense categories...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
          <p className="text-gray-600">Manage expense categories for landed cost calculations</p>
        </div>
        <Button onClick={openCreateDialog} className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => (
          <Card key={category.id} className="hover:shadow-lg transition-all duration-200 border-gray-200 bg-white">
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center space-x-2 text-gray-900">
                  <Tag className="h-5 w-5 text-gray-600" />
                  <span>{category.name}</span>
                </CardTitle>
                <Badge 
                  variant={category.is_active ? "default" : "secondary"}
                  className={category.is_active 
                    ? "bg-gray-900 text-white hover:bg-gray-800" 
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                >
                  {category.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {category.description && (
                <CardDescription className="text-gray-600 mt-2">{category.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {category.allows_item_override && (
                  <Badge variant="outline" className="text-xs border-gray-400 text-gray-700 bg-gray-50">
                    ✏️ Per-Item Editable
                  </Badge>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Sort Order: {category.sort_order}</span>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(category)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category)}
                      className="h-8 w-8 p-0 hover:bg-gray-100 hover:text-gray-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="border-gray-200 bg-white">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expense categories</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by creating your first expense category for landed cost calculations.
            </p>
            <Button onClick={openCreateDialog} className="bg-gray-900 hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Expense Category</DialogTitle>
            <DialogDescription>
              Add a new expense category for landed cost calculations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-sm font-medium text-gray-700">Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sort-order" className="text-sm font-medium text-gray-700">Sort Order</Label>
              <Input
                id="create-sort-order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="create-allows-override"
                checked={formData.allows_item_override}
                onCheckedChange={(checked) => setFormData({ ...formData, allows_item_override: !!checked })}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="create-allows-override" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Allow Per-Item Override
                </Label>
                <p className="text-xs text-gray-500 font-normal leading-relaxed">
                  Enables manual entry of amounts for each product in shipment
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="bg-gray-900 hover:bg-gray-800 text-white">
              {submitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense Category</DialogTitle>
            <DialogDescription>
              Update the expense category information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-sm font-medium text-gray-700">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter category description"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort-order" className="text-sm font-medium text-gray-700">Sort Order</Label>
              <Input
                id="edit-sort-order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="edit-allows-override"
                checked={formData.allows_item_override}
                onCheckedChange={(checked) => setFormData({ ...formData, allows_item_override: !!checked })}
                className="mt-1"
              />
              <div className="space-y-1">
                <Label htmlFor="edit-allows-override" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Allow Per-Item Override
                </Label>
                <p className="text-xs text-gray-500 font-normal leading-relaxed">
                  Enables manual entry of amounts for each product in shipment
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting} className="bg-gray-900 hover:bg-gray-800 text-white">
              {submitting ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

