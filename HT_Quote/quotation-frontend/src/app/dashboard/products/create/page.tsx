"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { productsApi, categoriesApi, amcApi } from "@/lib/api";
import { ArrowLeft, Save, Package } from "lucide-react";

interface Category {
  id: number;
  name: string;
  category_type: 'services' | 'hardware' | 'software' | 'spare_parts';
  parent_id: number | null;
}

interface AmcDescription {
  id: number;
  description: string;
  product_type?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  category_id?: number;
  unit_price: number;
  total_man_days?: number;
  pricing_model: 'one_time' | 'recurring';
  is_man_day_based: boolean;
  has_amc_option: boolean;
  amc_unit_price?: number;
  amc_description_id?: number;
  brand: string;
  model: string;
  part_number: string;
  is_discountable: boolean;
  is_refurbished: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amcDescriptions, setAmcDescriptions] = useState<AmcDescription[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('services');
  const { toast } = useToast();

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    description: "",
    sku: "",
    category_id: undefined,
    unit_price: 0,
    total_man_days: undefined,
    pricing_model: 'one_time',
    is_man_day_based: false,
    has_amc_option: false,
    amc_unit_price: undefined,
    amc_description_id: undefined,
    brand: "",
    model: "",
    part_number: "",
    is_discountable: false,
    is_refurbished: false,
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    loadCategories();
    loadAmcDescriptions();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await categoriesApi.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  const loadAmcDescriptions = async () => {
    try {
      const response = await amcApi.getDescriptions();
      setAmcDescriptions(response.data);
    } catch (error) {
      console.error("Error loading AMC descriptions:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category_id || formData.unit_price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await productsApi.create(formData);
      
      toast({
        title: "Success",
        description: "Product created successfully.",
      });
      
      // Redirect back to products page
      router.push("/dashboard/products");
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/products");
  };

  // Filter categories: only show child categories (not root) for all types
  const filteredCategories = categories.filter(cat => 
    cat.category_type === selectedCategoryType && cat.parent_id !== null
  );

  const handleRefurbishedChange = (checked: boolean) => {
    const refurbishedText = "- Refurbished";
    
    setFormData(prev => {
      let newName = prev.name;
      let newDescription = prev.description;
      
      if (checked) {
        // Add "- Refurbished" if not already present
        if (!newName.includes(refurbishedText)) {
          newName = newName + refurbishedText;
        }
        if (!newDescription.includes(refurbishedText)) {
          newDescription = newDescription + refurbishedText;
        }
      } else {
        // Remove "- Refurbished" if present
        newName = newName.replace(refurbishedText, "");
        newDescription = newDescription.replace(refurbishedText, "");
      }
      
      return {
        ...prev,
        is_refurbished: checked,
        name: newName,
        description: newDescription
      };
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
            <p className="text-gray-600 mt-1">Add a new product to your inventory</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
              <CardDescription>
                Essential product details and identification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Enter SKU (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="category">Category *</Label>
                  <RadioGroup
                    value={selectedCategoryType}
                    onValueChange={setSelectedCategoryType}
                    className="flex items-center space-x-3"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="services" id="filter-services" />
                      <Label htmlFor="filter-services" className="text-xs font-normal cursor-pointer">Services</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="hardware" id="filter-hardware" />
                      <Label htmlFor="filter-hardware" className="text-xs font-normal cursor-pointer">Hardware</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="software" id="filter-software" />
                      <Label htmlFor="filter-software" className="text-xs font-normal cursor-pointer">Software</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="spare_parts" id="filter-spare-parts" />
                      <Label htmlFor="filter-spare-parts" className="text-xs font-normal cursor-pointer">Spare Parts</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Select
                  value={formData.category_id?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, category_id: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <span className="capitalize">{category.name}</span>
                          <span className="text-xs text-gray-500">({category.category_type})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-order">Sort Order</Label>
                <Input
                  id="sort-order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
              <CardDescription>
                Set pricing and financial details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unit-price">Unit Price (Per Day Rate for Services) *</Label>
                <Input
                  id="unit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price === 0 ? "" : formData.unit_price}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      setFormData({ ...formData, unit_price: 0 });
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData({ ...formData, unit_price: numValue });
                      }
                    }
                  }}
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500">For service products, enter the per-day rate. Total lot price = Per day rate × Total man days</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amc-price">AMC Price</Label>
                <Input
                  id="amc-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amc_unit_price || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      setFormData({ ...formData, amc_unit_price: undefined });
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData({ ...formData, amc_unit_price: numValue });
                      }
                    }
                  }}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="man-days">Total Man Days (Lot)</Label>
                <Input
                  id="man-days"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_man_days || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "0") {
                      setFormData({ ...formData, total_man_days: undefined });
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue)) {
                        setFormData({ ...formData, total_man_days: numValue });
                      }
                    }
                  }}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">Total man days for the entire service (lot-based pricing)</p>
              </div>

              <div className="space-y-3">
                <Label>Product Options</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="man-day-based" 
                      checked={formData.is_man_day_based}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_man_day_based: !!checked })}
                    />
                    <Label htmlFor="man-day-based" className="text-sm font-normal">Man Day Based</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="amc-option" 
                      checked={formData.has_amc_option}
                      onCheckedChange={(checked) => setFormData({ ...formData, has_amc_option: !!checked })}
                    />
                    <Label htmlFor="amc-option" className="text-sm font-normal">Has AMC Option</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="refurbished" 
                      checked={formData.is_refurbished}
                      onCheckedChange={handleRefurbishedChange}
                    />
                    <Label htmlFor="refurbished" className="text-sm font-normal">Refurbished</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="discountable" 
                      checked={formData.is_discountable}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_discountable: !!checked })}
                    />
                    <Label htmlFor="discountable" className="text-sm font-normal">Can be Discounted</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="active" 
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                    />
                    <Label htmlFor="active" className="text-sm font-normal">Is Active</Label>
                  </div>
                </div>
              </div>

              {formData.has_amc_option && (
                <div className="space-y-2">
                  <Label htmlFor="amc-desc">AMC Description</Label>
                  <Select
                    value={formData.amc_description_id?.toString()}
                    onValueChange={(value) => setFormData({ ...formData, amc_description_id: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AMC description" />
                    </SelectTrigger>
                    <SelectContent>
                      {amcDescriptions.map((amc) => (
                        <SelectItem key={amc.id} value={amc.id.toString()}>
                          {amc.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
            <CardDescription>
              Additional product specifications and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  placeholder="Enter brand name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Enter model number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="part-number">Part Number</Label>
                <Input
                  id="part-number"
                  value={formData.part_number}
                  onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                  placeholder="Enter part number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? "Creating..." : "Create Product"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
