"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { shipmentsApi, landedCostApi } from "@/lib/api";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Package, 
  Truck,
  Calculator,
  Save,
  User,
  Clock
} from "lucide-react";

interface ShipmentItem {
  id: number;
  product_id: number;
  item_name: string;
  quantity: number | string;
  unit_cost: number | string;
  weight: number | string;
  total_item_cost: number | string;
  percentage_share: number | string;
  allocated_shared_cost: number | string;
  total_landed_cost: number | string;
  landed_cost_per_unit: number | string;
  product: {
    id: number;
    name: string;
    sku: string;
  };
}

interface SharedCost {
  id: number;
  expense_category_id: number;
  description: string;
  amount: number | string;
  expense_category: {
    id: number;
    name: string;
  };
}

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
  items: ShipmentItem[];
  shared_costs: SharedCost[];
}

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      loadShipment();
    }
  }, [params.id]);

  const loadShipment = async () => {
    try {
      setLoading(true);
      const response = await shipmentsApi.getById(params.id as string);
      setShipment(response.data);
    } catch (error: any) {
      console.error("Error loading shipment:", error);
      toast({
        title: "Error",
        description: "Failed to load shipment details",
        variant: "destructive",
      });
      router.push('/dashboard/shipments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProductPrices = async () => {
    if (!shipment) return;

    try {
      setUpdatingPrices(true);
      await landedCostApi.updateProductPrices(shipment.id.toString());
      
      toast({
        title: "Success",
        description: "Product prices updated successfully!",
      });
    } catch (error: any) {
      console.error("Error updating product prices:", error);
      toast({
        title: "Error",
        description: "Failed to update product prices",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrices(false);
    }
  };

  const formatCurrency = (amount: number | string, currency: string) => {
    const symbol = currency === 'USD' ? '$' : currency;
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${symbol} ${numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const convertToUSD = (amount: number | string, fromCurrency: string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (fromCurrency === 'USD') return numericAmount;
    const exchangeRate = typeof shipment?.exchange_rate === 'string' ? parseFloat(shipment.exchange_rate) : shipment?.exchange_rate || 1;
    return numericAmount / exchangeRate;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading shipment details...</div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Shipment Not Found</h1>
          <Button onClick={() => router.push('/dashboard/shipments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shipments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push('/dashboard/shipments')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shipment.name}</h1>
            <p className="text-gray-600">Shipment Details</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={shipment.is_finalized ? "default" : "secondary"}>
            {shipment.is_finalized ? "Finalized" : "Draft"}
          </Badge>
          {!shipment.is_finalized && (
            <Button onClick={handleUpdateProductPrices} disabled={updatingPrices}>
              <Save className="h-4 w-4 mr-2" />
              {updatingPrices ? "Updating..." : "Update Product Prices"}
            </Button>
          )}
        </div>
      </div>

      {/* Shipment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Landed Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shipment.total_landed_cost, shipment.base_currency)}
            </div>
            {shipment.base_currency !== 'USD' && (
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(convertToUSD(shipment.total_landed_cost, shipment.base_currency), 'USD')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base Cost</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shipment.total_base_cost, shipment.base_currency)}
            </div>
            {shipment.base_currency !== 'USD' && (
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(convertToUSD(shipment.total_base_cost, shipment.base_currency), 'USD')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Costs</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(shipment.total_shared_cost, shipment.base_currency)}
            </div>
            {shipment.base_currency !== 'USD' && (
              <div className="text-sm text-gray-600 mt-1">
                {formatCurrency(convertToUSD(shipment.total_shared_cost, shipment.base_currency), 'USD')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Count</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shipment.items.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shipment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Date:</span>
              <span className="ml-2">{formatDate(shipment.shipment_date)}</span>
            </div>
            <div className="flex items-center">
              <Calculator className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Method:</span>
              <Badge variant="outline" className="ml-2">
                {getCalculationMethodLabel(shipment.calculation_method)}
              </Badge>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Currency:</span>
              <span className="ml-2">{shipment.base_currency}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Exchange Rate:</span>
              <span className="ml-2">{parseFloat(shipment.exchange_rate.toString()).toFixed(4)}</span>
            </div>
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Created By:</span>
              <span className="ml-2">{shipment.created_by.name}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-400" />
              <span className="font-medium">Created:</span>
              <span className="ml-2">{formatDate(shipment.created_at)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shared Costs</CardTitle>
            <CardDescription>{shipment.shared_costs.length} cost categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shipment.shared_costs.map((cost) => (
                <div key={cost.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{cost.description}</div>
                    <div className="text-sm text-gray-500">{cost.expense_category.name}</div>
                  </div>
                  <div className="font-medium">
                    {formatCurrency(cost.amount, shipment.base_currency)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipment Items */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Items</CardTitle>
          <CardDescription>{shipment.items.length} items in this shipment</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total Cost</TableHead>
                <TableHead className="text-right">% Share</TableHead>
                <TableHead className="text-right">Allocated Cost</TableHead>
                <TableHead className="text-right">Landed Cost</TableHead>
                <TableHead className="text-right">Per Unit</TableHead>
                <TableHead className="text-right">USD Per Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipment.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.product.sku}</TableCell>
                  <TableCell className="text-center">{parseFloat(item.quantity.toString()).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_cost, shipment.base_currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.total_item_cost, shipment.base_currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(() => {
                      const share = parseFloat(item.percentage_share.toString());
                      // If share is already a percentage (>= 1), display as is
                      // If share is a decimal (< 1), convert to percentage
                      return share >= 1 ? share.toFixed(2) : (share * 100).toFixed(2);
                    })()}%
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.allocated_shared_cost, shipment.base_currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-green-600">
                    {formatCurrency(item.total_landed_cost, shipment.base_currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-blue-600">
                    {formatCurrency(item.landed_cost_per_unit, shipment.base_currency)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-purple-600">
                    {formatCurrency(convertToUSD(item.landed_cost_per_unit, shipment.base_currency), 'USD')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="font-bold bg-gray-50">
                <TableCell colSpan={2} className="text-right font-bold">SUBTOTALS:</TableCell>
                <TableCell className="text-center">
                  {shipment.items.reduce((sum, item) => sum + parseFloat(item.quantity.toString()), 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-gray-500">
                  — {/* Unit costs shouldn't be summed */}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    shipment.items.reduce((sum, item) => sum + parseFloat(item.total_item_cost.toString()), 0),
                    shipment.base_currency
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {shipment.items.reduce((sum, item) => {
                    const share = parseFloat(item.percentage_share.toString());
                    // If share is already a percentage (>= 1), add as is
                    // If share is a decimal (< 1), convert to percentage first
                    return sum + (share >= 1 ? share : share * 100);
                  }, 0).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    shipment.items.reduce((sum, item) => sum + parseFloat(item.allocated_shared_cost.toString()), 0),
                    shipment.base_currency
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(
                    shipment.items.reduce((sum, item) => sum + parseFloat(item.total_landed_cost.toString()), 0),
                    shipment.base_currency
                  )}
                </TableCell>
                <TableCell className="text-right text-gray-500">
                  — {/* Per-unit costs shouldn't be summed */}
                </TableCell>
                <TableCell className="text-right text-gray-500">
                  — {/* USD per-unit costs shouldn't be summed */}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
