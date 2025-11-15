"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { shipmentsApi } from "@/lib/api";
import { 
  Eye, 
  Trash2, 
  Calendar, 
  DollarSign, 
  Package, 
  Truck,
  Search,
  Plus,
  Edit
} from "lucide-react";
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

interface Shipment {
  id: number;
  name: string;
  shipment_date: string;
  calculation_method: string;
  base_currency: string;
  exchange_rate: number | string;
  total_base_cost: number | string;
  total_shared_cost: number | string;
  total_landed_cost: number | string;
  is_finalized: boolean;
  created_at: string;
  created_by: {
    id: number;
    name: string;
  };
  items_count: number;
  shared_costs_count: number;
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shipmentToDelete, setShipmentToDelete] = useState<Shipment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const response = await shipmentsApi.getAll();
      setShipments(response.data);
    } catch (error: any) {
      console.error("Error loading shipments:", error);
      toast({
        title: "Error",
        description: "Failed to load shipments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewShipment = (shipment: Shipment) => {
    router.push(`/dashboard/shipments/${shipment.id}`);
  };

  const handleDeleteShipment = (shipment: Shipment) => {
    setShipmentToDelete(shipment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!shipmentToDelete) return;

    try {
      setDeleting(true);
      await shipmentsApi.delete(shipmentToDelete.id.toString());
      
      toast({
        title: "Success",
        description: "Shipment deleted successfully",
      });

      // Reload shipments
      await loadShipments();
    } catch (error: any) {
      console.error("Error deleting shipment:", error);
      toast({
        title: "Error",
        description: "Failed to delete shipment",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setShipmentToDelete(null);
    }
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol} ${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCalculationMethodLabel = (method: string) => {
    const methods = {
      proportional: "Proportional",
      equal: "Equal Distribution",
      weight_based: "Weight Based",
      quantity_based: "Quantity Based"
    };
    return methods[method as keyof typeof methods] || method;
  };

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch = 
      shipment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.base_currency.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.created_by.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading shipments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shipment History</h1>
          <p className="text-gray-600">View and manage your landed cost calculations</p>
        </div>
        <Button onClick={() => router.push('/dashboard/landed-cost')}>
          <Plus className="h-4 w-4 mr-2" />
          New Calculation
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search shipments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <CardDescription>
            {filteredShipments.length} shipment{filteredShipments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? "Try adjusting your search terms" : "Create your first shipment calculation"}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/dashboard/landed-cost')}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Calculation
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shipment Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShipments.map((shipment) => (
                  <TableRow key={shipment.id}>
                    <TableCell className="font-medium">{shipment.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(shipment.shipment_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCalculationMethodLabel(shipment.calculation_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        {shipment.base_currency}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(shipment.total_landed_cost, shipment.base_currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1 text-gray-400" />
                        {shipment.items_count} items
                      </div>
                    </TableCell>
                    <TableCell>{shipment.created_by.name}</TableCell>
                    <TableCell>
                      <Badge variant={shipment.is_finalized ? "default" : "secondary"}>
                        {shipment.is_finalized ? "Finalized" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewShipment(shipment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteShipment(shipment)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{shipmentToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
