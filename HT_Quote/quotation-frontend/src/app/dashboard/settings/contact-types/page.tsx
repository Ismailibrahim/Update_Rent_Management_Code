"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { contactTypesApi } from "@/lib/api";
import { Plus, MoreHorizontal, Edit, Trash2, Search } from "lucide-react";

interface ContactType {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface ContactTypeFormData {
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  sort_order: number;
}

export default function ContactTypesPage() {
  const [contactTypes, setContactTypes] = useState<ContactType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingContactType, setEditingContactType] = useState<ContactType | null>(null);
  const [deletingContactType, setDeletingContactType] = useState<ContactType | null>(null);

  const [formData, setFormData] = useState<ContactTypeFormData>({
    name: "",
    description: "",
    color: "#6B7280",
    is_active: true,
    sort_order: 0,
  });

  const { toast } = useToast();

  // Load contact types
  const loadContactTypes = async () => {
    try {
      setLoading(true);
      const response = await contactTypesApi.getAll();
      setContactTypes(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading contact types:", error);
      toast({
        title: "Error",
        description: "Failed to load contact types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactTypes();
  }, []);

  // Form handlers
  const handleInputChange = (field: keyof ContactTypeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      color: "#6B7280",
      is_active: true,
      sort_order: 0,
    });
  };

  // Dialog handlers
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (contactType: ContactType) => {
    setEditingContactType(contactType);
    setFormData({
      name: contactType.name,
      description: contactType.description || "",
      color: contactType.color,
      is_active: contactType.is_active,
      sort_order: contactType.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (contactType: ContactType) => {
    setDeletingContactType(contactType);
    setIsDeleteDialogOpen(true);
  };

  // CRUD operations
  const handleCreateContactType = async () => {
    try {
      setLoading(true);
      await contactTypesApi.create(formData);
      toast({
        title: "Success",
        description: "Contact type created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadContactTypes();
    } catch (error: any) {
      console.error("Error creating contact type:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create contact type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContactType = async () => {
    if (!editingContactType) return;

    try {
      setLoading(true);
      await contactTypesApi.update(editingContactType.id.toString(), formData);
      toast({
        title: "Success",
        description: "Contact type updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingContactType(null);
      resetForm();
      loadContactTypes();
    } catch (error: any) {
      console.error("Error updating contact type:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update contact type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContactType = async () => {
    if (!deletingContactType) return;

    try {
      setLoading(true);
      await contactTypesApi.delete(deletingContactType.id.toString());
      toast({
        title: "Success",
        description: "Contact type deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingContactType(null);
      loadContactTypes();
    } catch (error: any) {
      console.error("Error deleting contact type:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete contact type",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter contact types
  const filteredContactTypes = contactTypes.filter(contactType =>
    contactType.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contactType.description && contactType.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Contact Types</h1>
          <p className="text-muted-foreground">
            Manage contact types for customer contacts
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Contact Type
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Types</CardTitle>
          <CardDescription>
            Manage the different types of contacts you can assign to customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contact types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContactTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No contact types found matching your search" : "No contact types found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredContactTypes.map((contactType) => (
                  <TableRow key={contactType.id}>
                    <TableCell className="font-medium">{contactType.name}</TableCell>
                    <TableCell>{contactType.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: contactType.color }}
                        />
                        <span className="text-sm text-muted-foreground">{contactType.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={contactType.is_active ? "default" : "secondary"}>
                        {contactType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{contactType.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(contactType)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(contactType)}
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact Type</DialogTitle>
            <DialogDescription>
              Create a new contact type for customer contacts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Primary, Manager, Technical"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this contact type"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateContactType}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Creating..." : "Create Contact Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Type</DialogTitle>
            <DialogDescription>
              Update contact type information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Primary, Manager, Technical"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of this contact type"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sortOrder">Sort Order</Label>
                <Input
                  id="edit-sortOrder"
                  type="number"
                  min="0"
                  value={formData.sort_order}
                  onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingContactType(null);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateContactType}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Updating..." : "Update Contact Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingContactType?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingContactType(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteContactType}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
