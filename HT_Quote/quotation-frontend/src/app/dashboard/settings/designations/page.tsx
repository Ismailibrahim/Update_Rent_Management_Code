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
import { designationsApi } from "@/lib/api";
import { Plus, MoreHorizontal, Edit, Trash2, Search } from "lucide-react";

interface Designation {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface DesignationFormData {
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

export default function DesignationsPage() {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [deletingDesignation, setDeletingDesignation] = useState<Designation | null>(null);

  const [formData, setFormData] = useState<DesignationFormData>({
    name: "",
    description: "",
    is_active: true,
    sort_order: 0,
  });

  const { toast } = useToast();

  // Load designations
  const loadDesignations = async () => {
    try {
      setLoading(true);
      const response = await designationsApi.getAll();
      setDesignations(response.data.data || response.data);
    } catch (error) {
      console.error("Error loading designations:", error);
      toast({
        title: "Error",
        description: "Failed to load designations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDesignations();
  }, []);

  // Form handlers
  const handleInputChange = (field: keyof DesignationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
      sort_order: 0,
    });
  };

  // Dialog handlers
  const openCreateDialog = () => {
    resetForm();
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = (designation: Designation) => {
    setEditingDesignation(designation);
    setFormData({
      name: designation.name,
      description: designation.description || "",
      is_active: designation.is_active,
      sort_order: designation.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (designation: Designation) => {
    setDeletingDesignation(designation);
    setIsDeleteDialogOpen(true);
  };

  // CRUD operations
  const handleCreateDesignation = async () => {
    try {
      setLoading(true);
      await designationsApi.create(formData);
      toast({
        title: "Success",
        description: "Designation created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadDesignations();
    } catch (error: any) {
      console.error("Error creating designation:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create designation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDesignation = async () => {
    if (!editingDesignation) return;

    try {
      setLoading(true);
      await designationsApi.update(editingDesignation.id.toString(), formData);
      toast({
        title: "Success",
        description: "Designation updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingDesignation(null);
      resetForm();
      loadDesignations();
    } catch (error: any) {
      console.error("Error updating designation:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update designation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDesignation = async () => {
    if (!deletingDesignation) return;

    try {
      setLoading(true);
      await designationsApi.delete(deletingDesignation.id.toString());
      toast({
        title: "Success",
        description: "Designation deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingDesignation(null);
      loadDesignations();
    } catch (error: any) {
      console.error("Error deleting designation:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete designation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter designations
  const filteredDesignations = designations.filter(designation =>
    designation.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Designations</h1>
          <p className="text-muted-foreground">
            Manage designations for customer contacts
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Designation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Designations</CardTitle>
          <CardDescription>
            Manage the different designations you can assign to customer contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
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
                <TableHead>Status</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDesignations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No designations found matching your search" : "No designations found"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDesignations.map((designation) => (
                  <TableRow key={designation.id}>
                    <TableCell className="font-medium">{designation.name}</TableCell>
                    <TableCell>
                      <Badge variant={designation.is_active ? "default" : "secondary"}>
                        {designation.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{designation.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(designation)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(designation)}
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
            <DialogTitle>Add New Designation</DialogTitle>
            <DialogDescription>
              Create a new designation for customer contacts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="e.g., General Manager, IT Manager, Director"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of this designation (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
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
              onClick={handleCreateDesignation}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Creating..." : "Create Designation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Designation</DialogTitle>
            <DialogDescription>
              Update designation information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., General Manager, IT Manager, Director"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of this designation (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
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
                setEditingDesignation(null);
                resetForm();
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDesignation}
              disabled={loading || !formData.name.trim()}
            >
              {loading ? "Updating..." : "Update Designation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDesignation?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingDesignation(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDesignation}
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
