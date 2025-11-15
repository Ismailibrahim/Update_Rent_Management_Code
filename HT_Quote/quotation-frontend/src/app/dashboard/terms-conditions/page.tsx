"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Edit,
  MoreHorizontal,
  Eye,
  Trash2,
  Star,
  FileText,
  Settings,
} from "lucide-react";
import { termsConditionsApi, categoriesApi } from "@/lib/api";
import { TermsConditionsData } from "@/lib/types";

interface TermsConditionsTemplate {
  id: number;
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  category_type: string;
}

interface TermsConditionsFormData {
  title: string;
  content: string;
  category_type: 'general' | 'hardware' | 'service' | 'amc';
  is_default: boolean;
  is_active: boolean;
}

export default function TermsConditionsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TermsConditionsTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<TermsConditionsTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TermsConditionsFormData>({
    title: "",
    content: "",
    category_type: "general",
    sub_category_id: undefined,
    is_default: false,
    is_active: true,
  });

  // Load data on component mount
  useEffect(() => {
    loadTemplates();
    loadCategories();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await termsConditionsApi.getAll();
      setTemplates(response.data.data || response.data);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      alert('Failed to load templates: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data.data || response.data);
    } catch (error: any) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (field: keyof TermsConditionsFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      await termsConditionsApi.create(formData);
      
      alert('Template created successfully!');
      
      // Reset form and close dialog
      setFormData({
        title: "",
        content: "",
        category_type: "general",
        sub_category_id: undefined,
        is_default: false,
        is_active: true,
      });
      setIsCreateDialogOpen(false);
      
      // Reload templates
      await loadTemplates();
    } catch (error: any) {
      console.error('Error creating template:', error);
      alert('Failed to create template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      await termsConditionsApi.update(selectedTemplate.id.toString(), formData);
      
      alert('Template updated successfully!');
      
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      
      // Reload templates
      await loadTemplates();
    } catch (error: any) {
      console.error('Error updating template:', error);
      alert('Failed to update template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      setLoading(true);
      await termsConditionsApi.delete(id.toString());
      
      alert('Template deleted successfully!');
      
      // Reload templates
      await loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      
      // Handle specific validation errors
      if (error.response?.status === 422) {
        const message = error.response?.data?.message || 'Cannot delete this template';
        alert(`Cannot delete template: ${message}\n\nTo delete a default template, first set another template as default for the same category.`);
      } else {
        alert('Failed to delete template: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      setLoading(true);
      await termsConditionsApi.setDefault(id.toString());
      
      alert('Default template updated successfully!');
      
      // Reload templates
      await loadTemplates();
    } catch (error: any) {
      console.error('Error setting default template:', error);
      alert('Failed to set default template: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (template: TermsConditionsTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      title: template.title,
      content: template.content,
      category_type: template.category_type,
      sub_category_id: template.sub_category_id,
      is_default: template.is_default,
      is_active: template.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (template: TermsConditionsTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const getCategoryTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800';
      case 'hardware': return 'bg-green-100 text-green-800';
      case 'service': return 'bg-purple-100 text-purple-800';
      case 'amc': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.category_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || template.category_type === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Terms & Conditions</h1>
          <p className="text-muted-foreground">
            Manage terms and conditions templates for different product categories
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/terms-conditions/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Template
        </Button>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a new terms and conditions template
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input 
                    id="title" 
                    placeholder="Enter template title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_type">Category Type *</Label>
                  <Select 
                    value={formData.category_type} 
                    onValueChange={(value) => handleInputChange('category_type', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="hardware">Hardware</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="amc">AMC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sub_category_id">Sub Category</Label>
                <Select 
                  value={formData.sub_category_id?.toString() || "none"} 
                  onValueChange={(value) => handleInputChange('sub_category_id', value === "none" ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No sub category</SelectItem>
                    {categories
                      .filter(cat => cat.category_type === formData.category_type)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea 
                  id="content" 
                  placeholder="Enter terms and conditions content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  className="min-h-[200px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => handleInputChange('is_default', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_default">Set as default template</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setFormData({
                    title: "",
                    content: "",
                    category_type: "general",
                    sub_category_id: undefined,
                    is_default: false,
                    is_active: true,
                  });
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateTemplate}
                disabled={loading || !formData.title.trim() || !formData.content.trim()}
              >
                {loading ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="category-filter">Category Type</Label>
              <Select value={categoryFilter || "all"} onValueChange={(value) => setCategoryFilter(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="hardware">Hardware</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="amc">AMC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates ({filteredTemplates.length})</CardTitle>
          <CardDescription>
            Manage your terms and conditions templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      <span>Loading templates...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No templates found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{template.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryTypeColor(template.category_type)}>
                        {template.category_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? "default" : "secondary"}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {template.is_default ? (
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm text-yellow-600">Default</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/terms-conditions/${template.id}/view`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/dashboard/terms-conditions/${template.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {!template.is_default && (
                            <DropdownMenuItem onClick={() => handleSetDefault(template.id)}>
                              <Star className="mr-2 h-4 w-4" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          {!template.is_default ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the template
                                  "{template.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          ) : (
                            <DropdownMenuItem 
                              disabled
                              className="text-gray-400 cursor-not-allowed"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete (Default Template)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update the terms and conditions template
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input 
                  id="edit-title" 
                  placeholder="Enter template title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category_type">Category Type *</Label>
                <Select 
                  value={formData.category_type} 
                  onValueChange={(value) => handleInputChange('category_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="amc">AMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-sub_category_id">Sub Category</Label>
              <Select 
                value={formData.sub_category_id?.toString() || "none"} 
                onValueChange={(value) => handleInputChange('sub_category_id', value === "none" ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No sub category</SelectItem>
                  {categories
                    .filter(cat => cat.category_type === formData.category_type)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content *</Label>
              <Textarea 
                id="edit-content" 
                placeholder="Enter terms and conditions content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="min-h-[200px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_default"
                  checked={formData.is_default}
                  onChange={(e) => handleInputChange('is_default', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-is_default">Set as default template</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTemplate}
              disabled={loading || !formData.title.trim() || !formData.content.trim()}
            >
              {loading ? "Updating..." : "Update Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Details - {selectedTemplate?.title}</DialogTitle>
            <DialogDescription>
              View template content and details
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Template Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Title:</span>
                        <span className="font-medium">{selectedTemplate.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <Badge className={getCategoryTypeColor(selectedTemplate.category_type)}>
                          {selectedTemplate.category_type}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <Badge variant={selectedTemplate.is_active ? "default" : "secondary"}>
                          {selectedTemplate.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Default:</span>
                        <span>{selectedTemplate.is_default ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold">Content Preview</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-48 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
