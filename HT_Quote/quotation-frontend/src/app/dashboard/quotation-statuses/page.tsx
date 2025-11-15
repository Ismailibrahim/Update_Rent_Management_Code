"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { Plus, Edit, Trash2, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface QuotationStatus {
  id: number;
  status_name: string;
  status_key: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function QuotationStatusesPage() {
  const [statuses, setStatuses] = useState<QuotationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<QuotationStatus | null>(null);
  const [formData, setFormData] = useState({
    status_name: '',
    status_key: '',
    color: 'gray',
    sort_order: 0,
    is_active: true
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const colorOptions = [
    { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' },
    { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
    { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800' },
  ];

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/quotation-statuses');
      setStatuses(response.data);
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load statuses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedStatus(null);
    setFormData({
      status_name: '',
      status_key: '',
      color: 'gray',
      sort_order: statuses.length,
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (status: QuotationStatus) => {
    setSelectedStatus(status);
    setFormData({
      status_name: status.status_name,
      status_key: status.status_key,
      color: status.color || 'gray',
      sort_order: status.sort_order,
      is_active: status.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (status: QuotationStatus) => {
    setSelectedStatus(status);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedStatus) return;

    try {
      setSubmitting(true);
      await api.delete(`/quotation-statuses/${selectedStatus.id}`);
      await loadStatuses();
      setIsDeleteDialogOpen(false);
      setSelectedStatus(null);
      toast({
        title: "Success",
        description: "Status deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting status:', error);
      toast({
        title: "Error",
        description: "Failed to delete status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      if (selectedStatus) {
        await api.put(`/quotation-statuses/${selectedStatus.id}`, formData);
        toast({
          title: "Success",
          description: "Status updated successfully",
        });
      } else {
        await api.post('/quotation-statuses', formData);
        toast({
          title: "Success",
          description: "Status created successfully",
        });
      }

      await loadStatuses();
      setIsDialogOpen(false);
      setSelectedStatus(null);
      setFormData({
        status_name: '',
        status_key: '',
        color: 'gray',
        sort_order: 0,
        is_active: true
      });
    } catch (error: any) {
      console.error('Error saving status:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save status",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getColorClass = (color: string) => {
    const option = colorOptions.find(c => c.value === color);
    return option?.class || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotation Statuses</h1>
          <p className="text-muted-foreground">
            Manage quotation status options
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Status
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status List</CardTitle>
          <CardDescription>
            Configure the available status options for quotations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading statuses...</div>
            </div>
          ) : statuses.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-2">No statuses found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first status
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Status
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Status Name</TableHead>
                  <TableHead>Status Key</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                    </TableCell>
                    <TableCell className="font-medium">{status.status_name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {status.status_key}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge className={getColorClass(status.color)}>
                        {status.status_name}
                      </Badge>
                    </TableCell>
                    <TableCell>{status.sort_order}</TableCell>
                    <TableCell>
                      {status.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(status)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(status)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedStatus ? 'Edit Status' : 'Add New Status'}
            </DialogTitle>
            <DialogDescription>
              {selectedStatus ? 'Update status details' : 'Create a new quotation status'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status_name">Status Name *</Label>
              <Input
                id="status_name"
                value={formData.status_name}
                onChange={(e) => setFormData({ ...formData, status_name: e.target.value })}
                placeholder="e.g., Draft, Sent, Accepted"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_key">Status Key *</Label>
              <Input
                id="status_key"
                value={formData.status_key}
                onChange={(e) => setFormData({ ...formData, status_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., draft, sent, accepted"
                required
              />
              <p className="text-xs text-gray-500">
                Internal key used in code (lowercase, no spaces)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center space-x-2">
                        <Badge className={color.class}>{color.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order *</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                required
              />
              <p className="text-xs text-gray-500">
                Lower numbers appear first in dropdowns
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : selectedStatus ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Status</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedStatus?.status_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
