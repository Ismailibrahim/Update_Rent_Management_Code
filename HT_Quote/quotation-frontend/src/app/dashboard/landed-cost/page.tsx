"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Calculator, Save, DollarSign, Package, Truck, Search, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { productsApi, expenseCategoriesApi, landedCostApi, shipmentsApi } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: number;
  name: string;
  sku: string;
  unit_price: number;
  landed_cost?: number;
}

interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  allows_item_override?: boolean;
}

interface ShipmentItem {
  product_id: number;
  item_name: string;
  quantity: number;
  unit_cost: number;
  weight?: number;
}

interface SharedCost {
  expense_category_id: number;
  description: string;
  amount: number;
  allows_item_override?: boolean;
  is_expanded?: boolean;
  manual_allocations?: { [shipment_item_index: number]: number };
}

interface CalculationResult {
  shipment: any;
  calculation_summary: {
    total_shipment_base_cost: number;
    total_shared_costs: number;
    grand_total_landed_cost: number;
    calculation_method: string;
    base_currency: string;
    exchange_rate: number;
  };
}

export default function LandedCostCalculatorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form data
  const [shipmentName, setShipmentName] = useState("");
  const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [calculationMethod, setCalculationMethod] = useState<'proportional' | 'equal' | 'weight_based' | 'quantity_based'>('proportional');
  const [baseCurrency, setBaseCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1.0);

  // Dynamic arrays
  const [items, setItems] = useState<ShipmentItem[]>([
    { product_id: 0, item_name: "", quantity: 1, unit_cost: 0, weight: 0 }
  ]);
  const [sharedCosts, setSharedCosts] = useState<SharedCost[]>([
    { expense_category_id: 0, description: "", amount: 0 }
  ]);

  // Results
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);

  // Popover state for product selection
  const [openProductSelect, setOpenProductSelect] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // Helper function to get selected product name with SKU
  const getSelectedProductName = (productId: number) => {
    if (!productId || productId === 0) return "Select product...";
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} (${product.sku})` : "Select product...";
  };

  // Helper function to format currency with commas
  const formatCurrency = (amount: number, currency: string = baseCurrency) => {
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Helper function to convert amount to USD using exchange rate
  const convertToUSD = (amount: number, fromCurrency: string) => {
    if (fromCurrency === 'USD') return amount;
    return amount / exchangeRate;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [productsResponse, categoriesResponse] = await Promise.all([
        productsApi.getAll(),
        expenseCategoriesApi.getAll()
      ]);
      
      // Handle both paginated and non-paginated response for products
      const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : 
                          (productsResponse.data?.data ? productsResponse.data.data : []);
      const categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
      
      // console.log("Loaded products:", productsData.length, productsData);
      // console.log("Loaded categories:", categoriesData.length);
      
      setProducts(productsData);
      setExpenseCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
      // Set empty arrays as fallback
      setProducts([]);
      setExpenseCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { product_id: 0, item_name: "", quantity: 1, unit_cost: 0, weight: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ShipmentItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
      // Update all fields in a single state update to avoid React state issues
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: parseInt(productId),
        item_name: product.name,
        unit_cost: product.unit_price
      };
      setItems(updatedItems);
    }
    setOpenProductSelect(null);
  };

  const addSharedCost = () => {
    setSharedCosts([...sharedCosts, { expense_category_id: 0, description: "", amount: 0 }]);
  };

  const removeSharedCost = (index: number) => {
    if (sharedCosts.length > 1) {
      setSharedCosts(sharedCosts.filter((_, i) => i !== index));
    }
  };

  const updateSharedCost = (index: number, field: keyof SharedCost, value: any) => {
    const updatedCosts = [...sharedCosts];
    updatedCosts[index] = { ...updatedCosts[index], [field]: value };
    
    // Auto-populate allows_item_override and description from expense category
    if (field === 'expense_category_id') {
      const selectedCategory = expenseCategories.find(c => c.id === value);
      if (selectedCategory) {
        updatedCosts[index].allows_item_override = selectedCategory.allows_item_override;
        // Auto-fill description with category name if description is empty or was previously auto-filled
        const currentDescription = updatedCosts[index].description;
        const wasAutoFilled = expenseCategories.some(cat => cat.name === currentDescription);
        if (!currentDescription || wasAutoFilled) {
          updatedCosts[index].description = selectedCategory.name;
        }
      }
    }
    
    setSharedCosts(updatedCosts);
  };

  const toggleSharedCostExpand = (index: number) => {
    const updatedCosts = [...sharedCosts];
    updatedCosts[index].is_expanded = !updatedCosts[index].is_expanded;
    setSharedCosts(updatedCosts);
  };

  const updateManualAllocation = (costIndex: number, itemIndex: number, amount: number) => {
    const updatedCosts = [...sharedCosts];
    if (!updatedCosts[costIndex].manual_allocations) {
      updatedCosts[costIndex].manual_allocations = {};
    }
    updatedCosts[costIndex].manual_allocations![itemIndex] = amount;
    setSharedCosts(updatedCosts);
  };

  const getManualAllocationTotal = (costIndex: number): number => {
    const cost = sharedCosts[costIndex];
    if (!cost.manual_allocations) return 0;
    return Object.values(cost.manual_allocations).reduce((sum, val) => sum + val, 0);
  };

  const validateManualAllocations = (costIndex: number): boolean => {
    const cost = sharedCosts[costIndex];
    if (!cost.manual_allocations || Object.keys(cost.manual_allocations).length === 0) {
      return true; // No manual allocations, use auto
    }
    const total = getManualAllocationTotal(costIndex);
    return Math.abs(total - cost.amount) < 0.01; // Allow 1 cent tolerance
  };

  const generateShipmentName = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);
    return `Shipment ${dateStr} ${timeStr}`;
  };

  const handleCalculate = async () => {
    if (!shipmentName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a shipment name",
        variant: "destructive",
      });
      return;
    }

    // Validate items
    const validItems = items.filter(item => 
      item.product_id > 0 && 
      item.item_name.trim() && 
      item.quantity > 0 && 
      item.unit_cost > 0
    );

    if (validItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one valid item",
        variant: "destructive",
      });
      return;
    }

    // Validate shared costs
    const validSharedCosts = sharedCosts.filter(cost => 
      cost.expense_category_id > 0 && 
      cost.description.trim() && 
      cost.amount > 0
    );

    if (validSharedCosts.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one shared cost",
        variant: "destructive",
      });
      return;
    }

    // Validate manual allocations for costs that allow overrides
    for (let i = 0; i < validSharedCosts.length; i++) {
      const cost = validSharedCosts[i];
      const selectedCategory = expenseCategories.find(c => c.id === cost.expense_category_id);
      
      if (selectedCategory?.allows_item_override && cost.manual_allocations && Object.keys(cost.manual_allocations).length > 0) {
        if (!validateManualAllocations(i)) {
          const manualTotal = getManualAllocationTotal(i);
          toast({
            title: "Validation Error",
            description: `Manual allocations for "${selectedCategory.name}" must sum to ${cost.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Current total: ${manualTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    try {
      setCalculating(true);
      
      const response = await landedCostApi.calculate({
        shipment_name: shipmentName,
        shipment_date: shipmentDate,
        calculation_method: calculationMethod,
        base_currency: baseCurrency,
        exchange_rate: exchangeRate,
        items: validItems,
        shared_costs: validSharedCosts,
      });

      setCalculationResult(response.data);
      
      // Debug: Log the calculation result structure
      console.log("Calculation Result:", response.data);
      console.log("Items:", response.data.items);
      console.log("Shipment:", response.data.shipment);
      
      toast({
        title: "Calculation Complete",
        description: "Landed cost calculated successfully! ⚠️ This data is NOT saved to the database yet. Please click 'Save Shipment' to store this data for future reference.",
        variant: "default",
        duration: 8000,
      });

    } catch (error: any) {
      console.error("Error calculating landed cost:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to calculate landed cost",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateProductPrices = async () => {
    if (!calculationResult || !calculationResult.shipment?.id) return;

    try {
      await landedCostApi.updateProductPrices(calculationResult.shipment.id.toString());
      
      toast({
        title: "Success",
        description: "Product prices updated successfully!",
      });

      // Reload products to get updated prices
      await loadData();

    } catch (error: any) {
      console.error("Error updating product prices:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update product prices",
        variant: "destructive",
      });
    }
  };

  const handleSaveShipment = async () => {
    if (!calculationResult) {
      toast({
        title: "Error",
        description: "Please calculate the landed cost first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const shipmentData = {
        name: shipmentName || generateShipmentName(),
        shipment_date: shipmentDate,
        calculation_method: calculationMethod,
        base_currency: baseCurrency,
        exchange_rate: exchangeRate,
        items: items.filter(item => item.product_id > 0).map(item => ({
          product_id: item.product_id,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          weight: item.weight || 0,
        })),
        shared_costs: sharedCosts.filter(cost => cost.expense_category_id > 0).map(cost => ({
          expense_category_id: cost.expense_category_id,
          description: cost.description,
          amount: cost.amount,
        })),
      };

      const response = await landedCostApi.createShipment(shipmentData);
      
      toast({
        title: "Shipment Saved",
        description: "✅ Shipment data has been permanently saved to the database for future reference.",
        variant: "default",
      });

      // Optionally redirect to shipment list or show success message
      console.log("Shipment saved:", response.data);

    } catch (error: any) {
      console.error("Error saving shipment:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to save shipment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landed Cost Calculator</h1>
          <p className="text-gray-600">Calculate landed costs for imported shipments</p>
        </div>
        <Button
          onClick={() => setShipmentName(generateShipmentName())}
          variant="outline"
          className="flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Auto Name</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-7xl">
        {/* Input Form */}
        <div className="space-y-6">
          {/* Shipment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Shipment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipment-name">Shipment Name *</Label>
                  <Input
                    id="shipment-name"
                    value={shipmentName}
                    onChange={(e) => setShipmentName(e.target.value)}
                    placeholder="Enter shipment name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shipment-date">Shipment Date *</Label>
                  <Input
                    id="shipment-date"
                    type="date"
                    value={shipmentDate}
                    onChange={(e) => setShipmentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculation-method">Calculation Method *</Label>
                  <Select value={calculationMethod} onValueChange={(value: any) => setCalculationMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="proportional">Proportional (by value)</SelectItem>
                      <SelectItem value="equal">Equal distribution</SelectItem>
                      <SelectItem value="weight_based">Weight-based</SelectItem>
                      <SelectItem value="quantity_based">Quantity-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base-currency">Base Currency *</Label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="MVR">MVR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exchange-rate">Exchange Rate *</Label>
                  <Input
                    id="exchange-rate"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1.0)}
                  />
                </div>

                <div></div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Shipment Items</span>
                <Button onClick={addItem} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Product</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="w-[100px]">Unit Cost ({baseCurrency})</TableHead>
                      {calculationMethod === 'weight_based' && (
                        <TableHead className="w-[100px]">Weight (kg)</TableHead>
                      )}
                      <TableHead className="w-[100px] text-right">Total ({baseCurrency})</TableHead>
                      {/* Dynamic allocation columns for shared costs that allow override */}
                      {sharedCosts.map((cost, costIndex) => {
                        const selectedCategory = expenseCategories.find(c => c.id === cost.expense_category_id);
                        if (selectedCategory?.allows_item_override && cost.expense_category_id > 0) {
                          return (
                            <TableHead key={costIndex} className="w-[120px] text-right">
                              {selectedCategory.name} Allocation ({baseCurrency})
                            </TableHead>
                          );
                        }
                        return null;
                      })}
                      <TableHead className="w-[60px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Popover open={openProductSelect === index} onOpenChange={(open) => setOpenProductSelect(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                            >
                              <span className="truncate">{getSelectedProductName(item.product_id)}</span>
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search products..." />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                  {Array.isArray(products) && products.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={`${product.name} ${product.sku}`}
                                      onSelect={() => handleProductSelect(index, product.id.toString())}
                                    >
                                      <div className="flex justify-between items-center w-full">
                                        <div className="flex flex-col">
                                          <span className="font-medium">{product.name}</span>
                                          <span className="text-sm text-muted-foreground">
                                            SKU: {product.sku} | {formatCurrency(product.unit_price)}
                                          </span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      {calculationMethod === 'weight_based' && (
                      <TableCell>
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.weight || ''}
                          onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      )}
                      <TableCell>
                        <div className="text-right font-medium">
                          {formatCurrency(item.quantity * item.unit_cost)}
                        </div>
                      </TableCell>
                      {/* Dynamic allocation input cells for shared costs that allow override */}
                      {sharedCosts.map((cost, costIndex) => {
                        const selectedCategory = expenseCategories.find(c => c.id === cost.expense_category_id);
                        if (selectedCategory?.allows_item_override && cost.expense_category_id > 0) {
                          // Calculate auto allocation based on method
                          const totalBaseCost = items.reduce((sum, i) => sum + (i.quantity * i.unit_cost), 0);
                          let autoAmount = 0;
                          
                          if (calculationMethod === 'proportional') {
                            const itemCost = item.quantity * item.unit_cost;
                            autoAmount = totalBaseCost > 0 ? (itemCost / totalBaseCost) * cost.amount : 0;
                          } else if (calculationMethod === 'equal') {
                            autoAmount = cost.amount / items.length;
                          } else if (calculationMethod === 'weight_based') {
                            const totalWeight = items.reduce((sum, i) => sum + (i.weight || 0), 0);
                            autoAmount = totalWeight > 0 ? ((item.weight || 0) / totalWeight) * cost.amount : 0;
                          } else if (calculationMethod === 'quantity_based') {
                            const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
                            autoAmount = totalQty > 0 ? (item.quantity / totalQty) * cost.amount : 0;
                          }
                          
                          const manualAmount = cost.manual_allocations?.[index] ?? autoAmount;
                          const manualTotal = getManualAllocationTotal(costIndex);
                          const isValid = validateManualAllocations(costIndex);
                          
                          return (
                            <TableCell key={costIndex}>
                              <div className="space-y-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={manualAmount}
                                  onChange={(e) => updateManualAllocation(costIndex, index, parseFloat(e.target.value) || 0)}
                                  className={`text-sm text-right ${!isValid ? 'border-red-300 bg-red-50' : ''}`}
                                  placeholder="0.00"
                                />
                                <div className="text-xs text-gray-500 text-right">
                                  Auto: {formatCurrency(autoAmount)}
                                </div>
                                {!isValid && (
                                  <div className="text-xs text-red-600 text-right">
                                    Total: {formatCurrency(manualTotal)} / {formatCurrency(cost.amount)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          );
                        }
                        return null;
                      })}
                      <TableCell>
                        <Button
                          onClick={() => removeItem(index)}
                          variant="outline"
                          size="sm"
                          disabled={items.length === 1}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Shared Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                <span>Shared Costs</span>
                  <Badge variant="outline" className="text-xs">{baseCurrency}</Badge>
                </div>
                <Button onClick={addSharedCost} size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sharedCosts.map((cost, index) => {
                const selectedCategory = expenseCategories.find(c => c.id === cost.expense_category_id);
                const allowsOverride = selectedCategory?.allows_item_override || false;
                const manualTotal = getManualAllocationTotal(index);
                const isValid = validateManualAllocations(index);
                
                return (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-4 gap-2 items-end">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={cost.expense_category_id.toString()} 
                      onValueChange={(value) => updateSharedCost(index, 'expense_category_id', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(expenseCategories) && expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                                <div className="flex items-center justify-between w-full">
                                  <span>{category.name}</span>
                                  {category.allows_item_override && (
                                    <Badge variant="outline" className="ml-2 text-xs">✏️</Badge>
                                  )}
                                </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={cost.description}
                      onChange={(e) => updateSharedCost(index, 'description', e.target.value)}
                      placeholder="Enter description"
                      className={(() => {
                        const selectedCategory = expenseCategories.find(c => c.id === cost.expense_category_id);
                        const isAutoFilled = selectedCategory && cost.description === selectedCategory.name;
                        return isAutoFilled ? "bg-blue-50 border-blue-200" : "";
                      })()}
                    />
                  </div>
                  
                  <div className="space-y-2">
                        <Label>Total Amount ({baseCurrency})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost.amount}
                      onChange={(e) => updateSharedCost(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  
                      <div className="flex items-center space-x-2">
                        {allowsOverride && (
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            ✏️ Use allocation columns in Shipment Items table
                          </div>
                        )}
                  <Button
                    onClick={() => removeSharedCost(index)}
                    variant="outline"
                    size="sm"
                    disabled={sharedCosts.length === 1}
                          className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                    </div>

                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={calculating}
            className="w-full"
            size="lg"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? "Calculating..." : "Calculate Landed Cost"}
          </Button>

          {/* Save Shipment Button */}
          {calculationResult && (
            <Button
              onClick={handleSaveShipment}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-700 text-white border-green-600"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Shipment to Database"}
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          {calculationResult && (
            <>
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Calculation Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Total Base Cost</Label>
                      <div className="text-lg font-semibold">
                        {formatCurrency(Number(calculationResult.calculation_summary.total_shipment_base_cost), calculationResult.calculation_summary.base_currency)}
                        {calculationResult.calculation_summary.base_currency !== 'USD' && (
                          <span className="text-gray-500 ml-2">
                            ({formatCurrency(convertToUSD(Number(calculationResult.calculation_summary.total_shipment_base_cost), calculationResult.calculation_summary.base_currency), 'USD')})
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Total Shared Costs</Label>
                      <div className="text-lg font-semibold">
                        {formatCurrency(Number(calculationResult.calculation_summary.total_shared_costs), calculationResult.calculation_summary.base_currency)}
                        {calculationResult.calculation_summary.base_currency !== 'USD' && (
                          <span className="text-gray-500 ml-2">
                            ({formatCurrency(convertToUSD(Number(calculationResult.calculation_summary.total_shared_costs), calculationResult.calculation_summary.base_currency), 'USD')})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <Label className="text-sm text-gray-600">Grand Total Landed Cost</Label>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(Number(calculationResult.calculation_summary.grand_total_landed_cost), calculationResult.calculation_summary.base_currency)}
                      {calculationResult.calculation_summary.base_currency !== 'USD' && (
                        <span className="text-green-500 ml-2 text-lg">
                          ({formatCurrency(convertToUSD(Number(calculationResult.calculation_summary.grand_total_landed_cost), calculationResult.calculation_summary.base_currency), 'USD')})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Method: <Badge variant="outline">{calculationResult.calculation_summary.calculation_method}</Badge></span>
                    <span>Rate: {calculationResult.calculation_summary.exchange_rate}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Calculation Results</CardTitle>
                  <CardDescription>
                    Landed cost breakdown for each item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total Item Cost</TableHead>
                          <TableHead className="text-right">% Share</TableHead>
                          <TableHead className="text-right">Allocated Cost</TableHead>
                          <TableHead className="text-right">Total Landed</TableHead>
                          <TableHead className="text-right">Landed/Unit</TableHead>
                          <TableHead className="text-right">USD Landed/Unit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const items = (calculationResult as any).items || calculationResult.shipment?.items || [];
                          if (items.length === 0) {
                            return (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                                  No items found in calculation result
                                </TableCell>
                              </TableRow>
                            );
                          }
                          return items.map((item: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.unit_cost), calculationResult.calculation_summary.base_currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.total_item_cost), calculationResult.calculation_summary.base_currency)}</TableCell>
                            <TableCell className="text-right">
                              {(() => {
                                const share = Number(item.percentage_share);
                                // If share is already a percentage (>= 1), display as is
                                // If share is a decimal (< 1), convert to percentage
                                return share >= 1 ? share.toFixed(2) : (share * 100).toFixed(2);
                              })()}%
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(item.allocated_shared_cost), calculationResult.calculation_summary.base_currency)}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(Number(item.total_landed_cost), calculationResult.calculation_summary.base_currency)}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">{formatCurrency(Number(item.landed_cost_per_unit), calculationResult.calculation_summary.base_currency)}</TableCell>
                            <TableCell className="text-right font-bold text-blue-600">{formatCurrency(convertToUSD(Number(item.landed_cost_per_unit), calculationResult.calculation_summary.base_currency), 'USD')}</TableCell>
                          </TableRow>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Update Product Prices - Only show for saved shipments */}
              {calculationResult.shipment?.id && !calculationResult.shipment.is_finalized && (
                <Card>
                  <CardContent className="pt-6">
                    <Button
                      onClick={handleUpdateProductPrices}
                      className="w-full"
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Update Product Prices
                    </Button>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                      This will update the landed_cost field for all products in this shipment
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
