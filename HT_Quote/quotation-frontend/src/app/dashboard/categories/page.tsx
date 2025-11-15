"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Plus,
  Search,
  Tag,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { categoriesApi } from "@/lib/api";

interface Category {
  id: number;
  name: string;
  description: string;
  parent_id?: number;
  category_type: 'services' | 'hardware' | 'software' | 'spare_parts';
  is_active: boolean;
  products_count: number;
  created_at: string;
  updated_at: string;
  parent?: Category;
  children?: Category[];
}

interface CategoryFormData {
  name: string;
  description: string;
  parent_id: number; // Required - must be one of the 4 main categories
  category_type: 'services' | 'hardware' | 'software' | 'spare_parts';
  is_active: boolean;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    parent_id: 1, // Default to Hardware (ID: 1)
    category_type: "hardware",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Fixed main categories - these are the 4 core categories that cannot be changed
  const mainCategories = [
    { id: 1, name: 'Hardware', category_type: 'hardware' as const },
    { id: 2, name: 'Software', category_type: 'software' as const },
    { id: 3, name: 'Services', category_type: 'services' as const },
    { id: 4, name: 'Spare Parts', category_type: 'spare_parts' as const },
  ];

  // Mock data for initial display - corrected structure
  const mockCategories: Category[] = [
    // Main categories (no parent_id)
    {
      id: 1,
      name: "Hardware",
      description: "Computer Hardware and Equipment",
      category_type: "hardware",
      is_active: true,
      products_count: 8,
      created_at: "2024-01-10T14:20:00Z",
      updated_at: "2024-01-10T14:20:00Z",
    },
    {
      id: 2,
      name: "Software",
      description: "Software Licenses and Applications",
      category_type: "software",
      is_active: true,
      products_count: 12,
      created_at: "2024-01-08T09:15:00Z",
      updated_at: "2024-01-08T09:15:00Z",
    },
    {
      id: 3,
      name: "Services",
      description: "IT Support and Services",
      category_type: "services",
      is_active: true,
      products_count: 15,
      created_at: "2024-01-15T10:30:00Z",
      updated_at: "2024-01-15T10:30:00Z",
    },
    {
      id: 4,
      name: "Spare Parts",
      description: "Replacement Parts and Components",
      category_type: "spare_parts",
      is_active: true,
      products_count: 5,
      created_at: "2024-01-12T09:00:00Z",
      updated_at: "2024-01-12T09:00:00Z",
    },
    // Subcategories (with parent_id)
    {
      id: 5,
      name: "Oracle Workstations",
      description: "High-performance workstations for Oracle applications",
      parent_id: 3,
      category_type: "services",
      is_active: true,
      products_count: 3,
      created_at: "2024-01-20T14:30:00Z",
      updated_at: "2024-01-20T14:30:00Z",
    },
  ];

  useEffect(() => {
    fetchCategories();
    fetchParentCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesApi.getAll();
      setCategories(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to mock data if API fails
      setCategories(mockCategories);
      toast({
        title: "Warning",
        description: "Backend server is not available. Using sample data. Please check your API configuration.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchParentCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      const allCategories = response.data.data || response.data;
      // Filter only parent categories (those without parent_id)
      const parents = allCategories.filter((cat: Category) => !cat.parent_id);
      setParentCategories(parents);
    } catch (error) {
      console.error('Error fetching parent categories:', error);
      // Fallback to mock data
      const mockParents = mockCategories.filter(cat => !cat.parent_id);
      setParentCategories(mockParents);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.parent_id) {
      toast({
        title: "Validation Error",
        description: "Please select a main category.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await categoriesApi.create(formData);
      const newCategory = response.data;

      setCategories([...categories, newCategory]);
      
      // Also refresh the data from the server to ensure consistency
      await fetchCategories();
      
      setIsCreateDialogOpen(false);
      setFormData({ 
        name: "", 
        description: "", 
        parent_id: 1, // Reset to Hardware
        category_type: "hardware",
        is_active: true
      });
      fetchParentCategories(); // Refresh parent categories list
      toast({
        title: "Success",
        description: "Category created successfully.",
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Error",
        description: "Failed to create category.",
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
        description: "Category name is required.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category_type) {
      toast({
        title: "Validation Error",
        description: "Please select a category type.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await categoriesApi.update(selectedCategory.id.toString(), formData);
      const updatedCategory = response.data;

      setCategories(categories.map(c => c.id === selectedCategory.id ? updatedCategory : c));
      
      // Also refresh the data from the server to ensure consistency
      await fetchCategories();
      
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ 
        name: "", 
        description: "", 
        parent_id: 1,
        category_type: "hardware",
        is_active: true
      });
      fetchParentCategories(); // Refresh parent categories list
      toast({
        title: "Success",
        description: "Category updated successfully.",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      setSubmitting(true);
      await categoriesApi.delete(selectedCategory.id.toString());

      setCategories(categories.filter(c => c.id !== selectedCategory.id));
      setIsDeleteDialogOpen(false);
      setSelectedCategory(null);
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      parent_id: category.parent_id || 1,
      category_type: category.category_type,
      is_active: category.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    return categories
      .filter(
        (category) =>
          // Only show subcategories (categories with a parent_id)
          category.parent_id !== null &&
          (category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, searchTerm]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCategories.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subcategories</h1>
          <p className="text-muted-foreground">
            Create and manage subcategories under the 4 main categories (Hardware, Software, Services, Spare Parts)
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Subcategory</DialogTitle>
              <DialogDescription>
                Add a new subcategory under one of the main categories
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Category Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter category name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label>Select Main Category *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {mainCategories.map((category) => (
                    <div
                      key={category.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        formData.parent_id === category.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          parent_id: category.id,
                          category_type: category.category_type
                        });
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          formData.parent_id === category.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.parent_id === category.id && (
                            <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{category.name}</div>
                          <div className="text-xs text-gray-500 capitalize">
                            {category.category_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Click on a main category to create a subcategory under it.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  placeholder="Enter category description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setFormData({ 
                    name: "", 
                    description: "", 
                    parent_id: 1,
                    category_type: "services",
                    is_active: true
                  });
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create Subcategory"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Subcategories</CardTitle>
          <CardDescription>Find subcategories by name or description</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>


      {/* Categories Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subcategories</CardTitle>
          <CardDescription>
            {filteredCategories.length} subcategories found • Showing {startIndex + 1}-{Math.min(endIndex, filteredCategories.length)} of {filteredCategories.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-muted-foreground">Loading categories...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategory Name</TableHead>
                  <TableHead>Main Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No categories found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{category.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`capitalize ${
                            category.category_type === 'hardware' 
                              ? 'border-blue-500 text-blue-700 bg-blue-50' 
                              : category.category_type === 'services' 
                              ? 'border-green-500 text-green-700 bg-green-50' 
                              : category.category_type === 'software'
                              ? 'border-purple-500 text-purple-700 bg-purple-50'
                              : 'border-orange-500 text-orange-700 bg-orange-50'
                          }`}
                        >
                          {category.category_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {category.parent ? category.parent.name : 
                            mainCategories.find(mc => mc.id === category.parent_id)?.name || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {category.description || "No description"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(category)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(category)}
                            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
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
          )}
        </CardContent>
        
        {/* Pagination Controls */}
        {filteredCategories.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border rounded text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredCategories.length)} of {filteredCategories.length}
              </span>
              
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">First page</span>
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Previous page</span>
                  ‹
                </Button>
                
                <span className="text-sm px-2">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Next page</span>
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Last page</span>
                  »
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subcategory</DialogTitle>
            <DialogDescription>
              Update the subcategory information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter category name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <Label>Select Main Category *</Label>
              <div className="grid grid-cols-2 gap-3">
                {mainCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      formData.parent_id === category.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        parent_id: category.id,
                        category_type: category.category_type
                      });
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        formData.parent_id === category.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.parent_id === category.id && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{category.name}</div>
                        <div className="text-xs text-gray-500 capitalize">
                          {category.category_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Click on a main category to move this subcategory under it.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter category description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedCategory(null);
                setFormData({
                  name: "", 
                  description: "", 
                  parent_id: 1, // Reset to Hardware
                  category_type: "hardware",
                  is_active: true
                });
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Updating..." : "Update Subcategory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the category
              &ldquo;{selectedCategory?.name}&rdquo; and may affect associated products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedCategory(null);
              }}
              disabled={submitting}
            >
              Cancel
            </AlertDialogCancel>
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