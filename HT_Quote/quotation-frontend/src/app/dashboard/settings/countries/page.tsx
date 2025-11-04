"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { countriesApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface Country {
  id: number;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

interface CountryFormData {
  name: string;
  is_active: boolean;
  sort_order: number;
}

export default function CountriesPage() {
  const { toast } = useToast();
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [deletingCountry, setDeletingCountry] = useState<Country | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [formData, setFormData] = useState<CountryFormData>({
    name: "",
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    loadCountries();
  }, []);

  // Reset to first page when search changes or countries reload
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, countries.length]);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const response = await countriesApi.getAll();
      setCountries(response.data.data || response.data);
    } catch (error) {
      console.error('Error loading countries:', error);
      toast({
        title: "Error",
        description: "Failed to load countries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CountryFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      is_active: true,
      sort_order: 0,
    });
  };

  const handleCreateCountry = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a country name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await countriesApi.create(formData);
      toast({
        title: "Success",
        description: "Country created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      loadCountries();
    } catch (error: any) {
      console.error("Error creating country:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create country",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditCountry = async () => {
    if (!editingCountry) return;
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a country name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      await countriesApi.update(editingCountry.id.toString(), formData);
      toast({
        title: "Success",
        description: "Country updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingCountry(null);
      resetForm();
      loadCountries();
    } catch (error: any) {
      console.error("Error updating country:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update country",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCountry = async () => {
    if (!deletingCountry) return;

    try {
      setSubmitting(true);
      await countriesApi.delete(deletingCountry.id.toString());
      toast({
        title: "Success",
        description: "Country deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setDeletingCountry(null);
      loadCountries();
    } catch (error: any) {
      console.error("Error deleting country:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete country",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (country: Country) => {
    try {
      await countriesApi.toggleStatus(country.id.toString());
      toast({
        title: "Success",
        description: `Country ${country.is_active ? 'deactivated' : 'activated'} successfully`,
      });
      loadCountries();
    } catch (error: any) {
      console.error("Error toggling country status:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update country status",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (country: Country) => {
    setEditingCountry(country);
    setFormData({
      name: country.name,
      is_active: country.is_active,
      sort_order: country.sort_order,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (country: Country) => {
    setDeletingCountry(country);
    setIsDeleteDialogOpen(true);
  };

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredCountries.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCountries = filteredCountries.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading countries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Countries Management</h1>
          <p className="text-gray-600 mt-1">
            Manage countries for customer addresses and locations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Country
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="h-5 w-5 mr-2" />
            Countries ({totalItems})
          </CardTitle>
          <CardDescription>
            Manage the list of countries available for customer selection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search countries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="page-size" className="whitespace-nowrap">Rows per page</Label>
              <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(parseInt(v) || 10)}>
                <SelectTrigger id="page-size" className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sort Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCountries.map((country) => (
                  <TableRow key={country.id}>
                    <TableCell className="font-medium">{country.name}</TableCell>
                    <TableCell>{country.sort_order}</TableCell>
                    <TableCell>
                      <Badge variant={country.is_active ? "default" : "secondary"}>
                        {country.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(country)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(country)}>
                            {country.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(country)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Showing {totalItems === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <span>Page {safePage} of {totalPages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Country Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Country</DialogTitle>
            <DialogDescription>
              Add a new country to the system for customer selection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Country Name *</Label>
              <Input
                id="name"
                placeholder="e.g., United States"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                placeholder="0"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCountry} disabled={submitting}>
              {submitting ? "Creating..." : "Create Country"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Country Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Country</DialogTitle>
            <DialogDescription>
              Update the country information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Country Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., United States"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-sort_order">Sort Order</Label>
              <Input
                id="edit-sort_order"
                type="number"
                placeholder="0"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditCountry} disabled={submitting}>
              {submitting ? "Updating..." : "Update Country"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Country Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Country</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCountry?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCountry} disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Country"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
