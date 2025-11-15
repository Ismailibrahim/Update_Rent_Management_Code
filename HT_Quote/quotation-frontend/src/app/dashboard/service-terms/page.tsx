"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { serviceTermsApi } from "@/lib/api";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface ServiceTerm {
  id: number;
  title: string;
  content: string;
  category_type: string;
  page_number: number;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ServiceTermsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [serviceTerms, setServiceTerms] = useState<ServiceTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [termToDelete, setTermToDelete] = useState<ServiceTerm | null>(null);

  useEffect(() => {
    fetchServiceTerms();
  }, []);

  const fetchServiceTerms = async () => {
    try {
      setLoading(true);
      const response = await serviceTermsApi.getAll();
      if (response.data.success) {
        setServiceTerms(response.data.data);
      } else {
        setServiceTerms([]);
      }
    } catch (error) {
      console.error('Error fetching service terms:', error);
      toast({
        title: "Error",
        description: "Failed to load service terms",
        variant: "destructive",
      });
      setServiceTerms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    router.push('/dashboard/service-terms/create');
  };

  const handleEdit = (term: ServiceTerm) => {
    router.push(`/dashboard/service-terms/${term.id}/edit`);
  };

  const handleView = (term: ServiceTerm) => {
    router.push(`/dashboard/service-terms/${term.id}/view`);
  };

  const handleDelete = (term: ServiceTerm) => {
    setTermToDelete(term);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!termToDelete) return;

    try {
      await serviceTermsApi.delete(termToDelete.id.toString());
      toast({
        title: "Success",
        description: "Service term deleted successfully",
      });
      fetchServiceTerms();
    } catch (error) {
      console.error('Error deleting service term:', error);
      toast({
        title: "Error",
        description: "Failed to delete service term",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setTermToDelete(null);
    }
  };


  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading service terms...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Service Terms Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your service terms templates for quotations
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Service Term
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Terms Templates</CardTitle>
          <CardDescription>
            These terms will be automatically included in quotation prints
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Page Number</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceTerms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      No service terms found. Create your first service term template.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                serviceTerms
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.title}</TableCell>
                      <TableCell>Page {term.page_number}</TableCell>
                      <TableCell>{term.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={term.is_active ? "default" : "secondary"}>
                          {term.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {term.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(term.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(term)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(term)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(term)}
                            title="Delete"
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
        </CardContent>
      </Card>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Term</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{termToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
