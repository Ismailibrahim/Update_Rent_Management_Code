"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ArrowLeft,
  Plus,
  Save,
  Download,
  Upload,
  Trash2,
  Copy,
  Clipboard,
  Undo,
  Redo,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Edit,
  Eye,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { productsApi, categoriesApi, amcApi } from "@/lib/api";

interface ProductRow {
  id?: number;
  name: string;
  description: string;
  sku: string;
  category_id: number;
  category_name: string;
  unit_price: number;
  landed_cost?: number;
  total_man_days?: number;
  currency: string;
  is_man_day_based: boolean;
  has_amc_option: boolean;
  amc_unit_price?: number;
  amc_description_id?: number;
  amc_description?: string;
  brand?: string;
  model?: string;
  part_number?: string;
  tax_rate: number;
  is_discountable: boolean;
  is_refurbished: boolean;
  is_active: boolean;
  sort_order?: number;
  pricing_model: string;
  isNew?: boolean;
  isModified?: boolean;
}

export default function SpreadsheetPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Array<{ id: number; name: string; category_type: string }>>([]);
  const [amcDescriptions, setAmcDescriptions] = useState<Array<{ id: number; description: string }>>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ProductRow[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<ProductRow[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const tableRef = useRef<HTMLTableElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      let categoriesData = [];
      try {
        const categoriesResponse = await categoriesApi.getAll();
        categoriesData = Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [];
      } catch (error) {
        console.warn('Failed to load categories:', error);
        categoriesData = [];
      }
      
      // Load AMC descriptions
      let amcData = [];
      try {
        const amcResponse = await amcApi.getDescriptions();
        amcData = Array.isArray(amcResponse.data) ? amcResponse.data : [];
      } catch (error) {
        console.warn('Failed to load AMC descriptions:', error);
        amcData = [];
      }
      
      // Load products
      let productsResponse = { data: [] };
      try {
        productsResponse = await productsApi.getAll();
      } catch (error) {
        console.warn('Failed to load products:', error);
        productsResponse = { data: [] };
      }
      
      setCategories(categoriesData);
      setAmcDescriptions(amcData);
      
      // Convert products to spreadsheet format
      let productsData = [];
      
      // Handle different response structures
      if (Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data;
      } else if (Array.isArray(productsResponse)) {
        productsData = productsResponse;
      } else if (productsResponse && typeof productsResponse === 'object') {
        // If it's an object, try to find the array
        if (Array.isArray(productsResponse.products)) {
          productsData = productsResponse.products;
        } else if (Array.isArray(productsResponse.items)) {
          productsData = productsResponse.items;
        } else {
          console.warn('Unexpected products response structure:', productsResponse);
          productsData = [];
        }
      } else {
        console.warn('Products response is not an array:', productsResponse);
        productsData = [];
      }
      
      const spreadsheetProducts: ProductRow[] = productsData.map((product: any) => ({
        id: product.id,
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        category_id: product.category_id || 1,
        category_name: product.category?.name || '',
        unit_price: product.unit_price || 0,
        landed_cost: product.landed_cost || 0,
        total_man_days: product.total_man_days || 0,
        currency: product.currency || 'USD',
        is_man_day_based: product.is_man_day_based || false,
        has_amc_option: product.has_amc_option || false,
        amc_unit_price: product.amc_unit_price || 0,
        amc_description_id: product.amc_description_id,
        amc_description: product.amcDescription?.description || '',
        brand: product.brand || '',
        model: product.model || '',
        part_number: product.part_number || '',
        tax_rate: product.tax_rate || 0,
        is_discountable: product.is_discountable || false,
        is_refurbished: product.is_refurbished || false,
        is_active: product.is_active !== false,
        sort_order: product.sort_order || 0,
        pricing_model: product.pricing_model || 'one_time',
        isNew: false,
        isModified: false
      }));
      
      setProducts(spreadsheetProducts);
      saveToHistory(spreadsheetProducts);
      
      // Show success message
      if (spreadsheetProducts.length > 0) {
        toast({
          title: "Data Loaded",
          description: `Loaded ${spreadsheetProducts.length} products into spreadsheet.`,
        });
      } else {
        toast({
          title: "Empty Spreadsheet",
          description: "No products found. You can add new products using the 'Add Row' button.",
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load data. You can still use the spreadsheet to add new products.",
        variant: "destructive",
      });
      
      // Set empty data so spreadsheet still works
      setProducts([]);
      saveToHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = (newProducts: ProductRow[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newProducts]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProducts([...history[historyIndex - 1]]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProducts([...history[historyIndex + 1]]);
    }
  };

  const addNewRow = () => {
    const newRow: ProductRow = {
      name: '',
      description: '',
      sku: '',
      category_id: 1,
      category_name: categories[0]?.name || '',
      unit_price: 0,
      currency: 'USD',
      is_man_day_based: false,
      has_amc_option: false,
      amc_unit_price: 0,
      brand: '',
      model: '',
      part_number: '',
      tax_rate: 0,
      is_discountable: false,
      is_refurbished: false,
      is_active: true,
      sort_order: 0,
      pricing_model: 'one_time',
      isNew: true,
      isModified: false
    };
    
    const newProducts = [...products, newRow];
    setProducts(newProducts);
    saveToHistory(newProducts);
  };

  const deleteRows = () => {
    const newProducts = products.filter((_, index) => !selectedRows.has(index));
    setProducts(newProducts);
    setSelectedRows(new Set());
    saveToHistory(newProducts);
  };

  const handleCellEdit = (rowIndex: number, field: string, value: any) => {
    const newProducts = [...products];
    newProducts[rowIndex] = {
      ...newProducts[rowIndex],
      [field]: value,
      isModified: true
    };
    
    // Handle special field updates
    if (field === 'category_id') {
      const category = categories.find(c => c.id === value);
      newProducts[rowIndex].category_name = category?.name || '';
    }
    
    if (field === 'is_man_day_based') {
      newProducts[rowIndex].pricing_model = value ? 'recurring' : 'one_time';
    }
    
    // Handle AMC option changes
    if (field === 'has_amc_option') {
      if (!value) {
        // If AMC option is unchecked, clear AMC price and description
        newProducts[rowIndex].amc_unit_price = 0;
        newProducts[rowIndex].amc_description_id = null;
        newProducts[rowIndex].amc_description = '';
      }
    }
    
    // Handle AMC description changes
    if (field === 'amc_description_id') {
      const amcDesc = amcDescriptions.find(a => a.id === value);
      newProducts[rowIndex].amc_description = amcDesc?.description || '';
    }
    
    setProducts(newProducts);
    setEditingCell(null);
  };

  const handleCellClick = (rowIndex: number, field: string) => {
    setEditingCell({ row: rowIndex, field });
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    if (e.key === 'Enter') {
      setEditingCell(null);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Move to next cell
      const fields = ['name', 'description', 'sku', 'category_id', 'unit_price', 'currency', 'brand', 'model'];
      const currentIndex = fields.indexOf(field);
      if (currentIndex < fields.length - 1) {
        setEditingCell({ row: rowIndex, field: fields[currentIndex + 1] });
      }
    }
  };

  const handleCellBlur = () => {
    setEditingCell(null);
  };

  const copyRows = () => {
    const selectedProducts = products.filter((_, index) => selectedRows.has(index));
    setClipboard(selectedProducts);
    toast({
      title: "Copied",
      description: `Copied ${selectedProducts.length} rows to clipboard.`,
    });
  };

  const pasteRows = () => {
    if (clipboard.length === 0) return;
    
    const newProducts = [...products, ...clipboard.map(item => ({ ...item, isNew: true, isModified: false }))];
    setProducts(newProducts);
    saveToHistory(newProducts);
    toast({
      title: "Pasted",
      description: `Pasted ${clipboard.length} rows.`,
    });
  };

  const saveAll = async () => {
    setSaving(true);
    let success = 0;
    let errors = 0;
    
    try {
      for (const product of products) {
        try {
          if (product.isNew || product.isModified) {
            const productData = {
              name: product.name,
              description: product.description,
              sku: product.sku,
              category_id: product.category_id,
              unit_price: product.unit_price,
              landed_cost: product.landed_cost,
              total_man_days: product.total_man_days,
              currency: product.currency,
              is_man_day_based: product.is_man_day_based,
              has_amc_option: product.has_amc_option,
              amc_unit_price: product.amc_unit_price,
              amc_description_id: product.amc_description_id,
              brand: product.brand,
              model: product.model,
              part_number: product.part_number,
              tax_rate: product.tax_rate,
              is_discountable: product.is_discountable,
              is_refurbished: product.is_refurbished,
              is_active: product.is_active,
              sort_order: product.sort_order,
              pricing_model: product.pricing_model
            };
            
            console.log('Saving product data:', productData);
            
            if (product.id) {
              // Update existing product
              await productsApi.update(product.id, productData);
            } else {
              // Create new product
              await productsApi.create(productData);
            }
            
            success++;
          }
        } catch (error) {
          console.error(`Error saving product ${product.name}:`, error);
          errors++;
        }
      }
      
      toast({
        title: "Save Complete",
        description: `Successfully saved ${success} products. ${errors} errors occurred.`,
      });
      
      // Reload data to get updated IDs
      await loadData();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save products.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Name', 'Description', 'SKU', 'Category', 'Unit Price', 'Currency', 
      'Brand', 'Model', 'Part Number', 'Tax Rate', 'Has AMC', 'AMC Price', 
      'AMC Description', 'Is Discountable', 'Is Refurbished', 'Is Active', 'Sort Order'
    ];
    
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        `"${product.name}"`,
        `"${product.description}"`,
        `"${product.sku}"`,
        `"${product.category_name}"`,
        product.unit_price,
        `"${product.currency}"`,
        `"${product.brand}"`,
        `"${product.model}"`,
        `"${product.part_number}"`,
        product.tax_rate,
        product.has_amc_option,
        product.amc_unit_price,
        `"${product.amc_description}"`,
        product.is_discountable,
        product.is_refurbished,
        product.is_active,
        product.sort_order
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_spreadsheet.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseCSVFile(file);
    }
  };

  const parseCSVFile = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({
          title: "Invalid CSV",
          description: "CSV file must have at least a header row and one data row.",
          variant: "destructive",
        });
        return;
      }

      // Improved CSV parsing function that handles quoted fields with commas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        
        result.push(current.trim());
        return result.map(field => field.replace(/^"(.*)"$/, '$1')); // Remove surrounding quotes
      };

      const headers = parseCSVLine(lines[0]);
      const dataRows = lines.slice(1);

      console.log('CSV Headers found:', headers);
      console.log('Sample data row:', parseCSVLine(dataRows[0] || ''));
      console.log('Sample data row with index numbers:');
      const sampleValues = parseCSVLine(dataRows[0] || '');
      sampleValues.forEach((value, index) => {
        console.log(`  ${index}: "${value}"`);
      });
      
      // Show which AMC-related headers were found
      const amcHeaders = headers.filter(h => 
        h.toLowerCase().includes('amc') || 
        h.toLowerCase().includes('maintenance') || 
        h.toLowerCase().includes('support')
      );
      console.log('AMC-related headers found:', amcHeaders);
      console.log('All headers in your CSV:', headers);
      console.log('Headers with index numbers:');
      headers.forEach((header, index) => {
        console.log(`  ${index}: "${header}"`);
      });

      // Create a mapping function to get value by header name with flexible matching
      const getValueByHeader = (values: string[], headerName: string): string => {
        // Try exact match first
        let headerIndex = headers.findIndex(h => h.toLowerCase() === headerName.toLowerCase());
        
        // If not found, try common variations
        if (headerIndex < 0) {
          const variations = {
            'Unit Price': ['price', 'unit price', 'unit_price', 'cost', 'amount', 'value'],
            'Name': ['name', 'product name', 'product_name', 'title'],
            'Description': ['description', 'desc', 'details'],
            'SKU': ['sku', 'product sku', 'product_sku', 'code', 'id'],
            'Category': ['category', 'cat', 'type', 'category_name'],
            'Currency': ['currency', 'curr', 'unit'],
            'Brand': ['brand', 'manufacturer', 'make'],
            'Model': ['model', 'model number', 'model_number'],
            'Part Number': ['part number', 'part_number', 'part no', 'part_no'],
            'Tax Rate': ['tax rate', 'tax_rate', 'tax', 'vat'],
            'Has AMC': ['has amc', 'has_amc', 'amc option', 'amc_option', 'amc', 'maintenance', 'support'],
            'AMC Price': ['amc price', 'amc_price', 'amc cost', 'amc_cost', 'amc amount', 'amc_amount', 'amc unit price', 'amc_unit_price', 'maintenance price', 'maintenance_price', 'support price', 'support_price'],
            'AMC Description': ['amc description', 'amc_description', 'amc desc', 'amc_desc', 'maintenance description', 'maintenance_description', 'support description', 'support_description'],
            'Is Discountable': ['is discountable', 'is_discountable', 'discountable', 'can discount'],
            'Is Refurbished': ['is refurbished', 'is_refurbished', 'refurbished'],
            'Is Active': ['is active', 'is_active', 'active', 'status'],
            'Is Man Day Based': ['is man day based', 'is_man_day_based', 'man day based', 'man_day_based'],
            'Sort Order': ['sort order', 'sort_order', 'order', 'sequence']
          };
          
          const variationsList = variations[headerName as keyof typeof variations] || [];
          for (const variation of variationsList) {
            headerIndex = headers.findIndex(h => h.toLowerCase() === variation.toLowerCase());
            if (headerIndex >= 0) break;
          }
        }
        
        if (headerIndex < 0) {
          console.warn(`Header "${headerName}" not found in CSV. Available headers:`, headers);
        } else {
          console.log(`✅ Found header "${headerName}" at index ${headerIndex}: "${headers[headerIndex]}"`);
        }
        return headerIndex >= 0 ? values[headerIndex] || '' : '';
      };

      // Helper function to parse price values (remove currency symbols, commas, etc.)
      const parsePrice = (priceStr: string): number => {
        if (!priceStr) return 0;
        // Remove currency symbols, commas, and whitespace
        const cleaned = priceStr.toString().replace(/[$€£¥₹,\s]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const newProducts: ProductRow[] = dataRows.map((line, index) => {
        const values = parseCSVLine(line);
        
        // Debug logging for first row
        if (index === 0) {
          console.log('Parsing first row:');
          console.log('Raw values:', values);
          console.log('Headers:', headers);
          console.log('Name:', getValueByHeader(values, 'Name'));
          const unitPriceRaw = getValueByHeader(values, 'Unit Price');
          console.log('Unit Price (raw):', unitPriceRaw);
          console.log('Unit Price (parsed):', parsePrice(unitPriceRaw));
          console.log('Currency:', getValueByHeader(values, 'Currency'));
          console.log('Brand:', getValueByHeader(values, 'Brand'));
          console.log('Model:', getValueByHeader(values, 'Model'));
          console.log('Part Number:', getValueByHeader(values, 'Part Number'));
          const taxRateRaw = getValueByHeader(values, 'Tax Rate');
          console.log('Tax Rate (raw):', taxRateRaw);
          console.log('Tax Rate (parsed):', parsePrice(taxRateRaw));
          const hasAmcRaw = getValueByHeader(values, 'Has AMC');
          console.log('Has AMC (raw):', hasAmcRaw);
          console.log('Has AMC (parsed):', hasAmcRaw?.toLowerCase().trim() === 'true' || hasAmcRaw?.toLowerCase().trim() === 'yes' || hasAmcRaw?.toLowerCase().trim() === '1');
          const amcPriceRaw = getValueByHeader(values, 'AMC Price');
          console.log('AMC Price (raw):', amcPriceRaw);
          console.log('AMC Price (parsed):', parsePrice(amcPriceRaw));
          console.log('AMC Price (type):', typeof amcPriceRaw);
          console.log('AMC Price (length):', amcPriceRaw?.length);
          const amcDescRaw = getValueByHeader(values, 'AMC Description');
          console.log('AMC Description (raw):', amcDescRaw);
          console.log('Available AMC Descriptions in DB:', amcDescriptions.map(a => a.description));
        }

        const product: ProductRow = {
          name: getValueByHeader(values, 'Name'),
          description: getValueByHeader(values, 'Description'),
          sku: getValueByHeader(values, 'SKU'),
          category_id: 1, // Default category
          category_name: getValueByHeader(values, 'Category'),
          unit_price: parsePrice(getValueByHeader(values, 'Unit Price')),
          currency: getValueByHeader(values, 'Currency') || 'USD',
          brand: getValueByHeader(values, 'Brand'),
          model: getValueByHeader(values, 'Model'),
          part_number: getValueByHeader(values, 'Part Number'),
          tax_rate: parsePrice(getValueByHeader(values, 'Tax Rate')),
          has_amc_option: (() => {
            const hasAmcValue = getValueByHeader(values, 'Has AMC')?.toLowerCase().trim();
            const amcPrice = parsePrice(getValueByHeader(values, 'AMC Price'));
            const amcDesc = getValueByHeader(values, 'AMC Description')?.trim();
            
            // Set to true if explicitly set, or if AMC price > 0, or if AMC description is provided
            return hasAmcValue === 'true' || hasAmcValue === 'yes' || hasAmcValue === '1' || 
                   amcPrice > 0 || (amcDesc && amcDesc.length > 0);
          })(),
          amc_unit_price: (() => {
            // Try to find AMC amount in various possible columns
            const possibleAmcColumns = [
              'AMC Price', 'AMC Amount', 'AMC Cost', 'AMC Unit Price',
              'Maintenance Price', 'Maintenance Cost', 'Maintenance Amount',
              'Support Price', 'Support Cost', 'Support Amount',
              'Annual Price', 'Annual Cost', 'Annual Amount'
            ];
            
            for (const column of possibleAmcColumns) {
              const value = getValueByHeader(values, column);
              if (value && value.trim() && parsePrice(value) > 0) {
                console.log(`Found AMC amount in column "${column}": ${value} -> ${parsePrice(value)}`);
                return parsePrice(value);
              }
            }
            
            // If no AMC amount found in expected columns, search all columns for potential AMC amounts
            // This is a fallback to find AMC amounts in unexpected column names
            for (let i = 0; i < values.length; i++) {
              const value = values[i]?.trim();
              if (value && parsePrice(value) > 0 && parsePrice(value) < 10000) { // Reasonable AMC amount range
                const header = headers[i];
                // Skip if it's already a known price column
                if (!header.toLowerCase().includes('price') && 
                    !header.toLowerCase().includes('cost') && 
                    !header.toLowerCase().includes('amount') &&
                    !header.toLowerCase().includes('unit')) {
                  console.log(`Potential AMC amount found in column "${header}" (index ${i}): ${value} -> ${parsePrice(value)}`);
                  // Only use this if we have an AMC description (to avoid false positives)
                  const amcDesc = getValueByHeader(values, 'AMC Description');
                  if (amcDesc && amcDesc.trim() && amcDesc !== '-') {
                    console.log(`Using potential AMC amount from column "${header}": ${parsePrice(value)}`);
                    return parsePrice(value);
                  }
                }
              }
            }
            
            // If no AMC amount found, return 0
            return 0;
          })(),
          amc_description: getValueByHeader(values, 'AMC Description'),
          amc_description_id: null, // Will be set based on description match
          is_discountable: getValueByHeader(values, 'Is Discountable')?.toLowerCase() === 'true' || getValueByHeader(values, 'Is Discountable')?.toLowerCase() === 'yes',
          is_refurbished: getValueByHeader(values, 'Is Refurbished')?.toLowerCase() === 'true' || getValueByHeader(values, 'Is Refurbished')?.toLowerCase() === 'yes',
          is_active: getValueByHeader(values, 'Is Active')?.toLowerCase() !== 'false' && getValueByHeader(values, 'Is Active')?.toLowerCase() !== 'no',
          sort_order: parseInt(getValueByHeader(values, 'Sort Order')) || 0,
          pricing_model: 'one_time',
          isNew: true,
          isModified: false
        };

        // Try to match category by name
        const matchedCategory = categories.find(c => 
          c.name.toLowerCase() === product.category_name.toLowerCase()
        );
        if (matchedCategory) {
          product.category_id = matchedCategory.id;
        }

        // Try to match AMC description by name (with flexible matching)
        if (product.amc_description && product.amc_description.trim() && product.amc_description !== '-') {
          const amcDescLower = product.amc_description.toLowerCase().trim();
          
          // Try exact match first
          let matchedAmc = amcDescriptions.find(a => 
            a.description.toLowerCase() === amcDescLower
          );
          
          // If no exact match, try partial matching
          if (!matchedAmc) {
            matchedAmc = amcDescriptions.find(a => 
              a.description.toLowerCase().includes(amcDescLower) ||
              amcDescLower.includes(a.description.toLowerCase())
            );
          }
          
          // If still no match, try keyword matching
          if (!matchedAmc) {
            const keywords = amcDescLower.split(' ').filter(word => word.length > 2);
            matchedAmc = amcDescriptions.find(a => 
              keywords.some(keyword => a.description.toLowerCase().includes(keyword))
            );
          }
          
          if (matchedAmc) {
            product.amc_description_id = matchedAmc.id;
            product.amc_description = matchedAmc.description; // Use the exact description from DB
            console.log(`Matched AMC description: "${product.amc_description}" -> "${matchedAmc.description}"`);
          } else {
            console.warn(`AMC Description "${product.amc_description}" not found in database. Available AMC descriptions:`, amcDescriptions.map(a => a.description));
            // If no match found, clear the description to avoid confusion
            product.amc_description = '';
            product.amc_description_id = null;
          }
        }

        // Debug logging for first product
        if (index === 0) {
          console.log('=== AMC IMPORT DEBUG ===');
          console.log('Final parsed product:', product);
          console.log('AMC Details:');
          console.log('  - has_amc_option:', product.has_amc_option);
          console.log('  - amc_unit_price:', product.amc_unit_price);
          console.log('  - amc_description:', product.amc_description);
          console.log('  - amc_description_id:', product.amc_description_id);
          console.log('========================');
        }
        
        return product;
      });

      // Add imported products to existing products
      const updatedProducts = [...products, ...newProducts];
      setProducts(updatedProducts);
      saveToHistory(updatedProducts);
      
      // Debug: Show what was imported
      console.log('=== IMPORT COMPLETE ===');
      console.log('Total products after import:', updatedProducts.length);
      console.log('New products imported:', newProducts.length);
      if (newProducts.length > 0) {
        console.log('First imported product AMC details:');
        console.log('  - has_amc_option:', newProducts[0].has_amc_option);
        console.log('  - amc_unit_price:', newProducts[0].amc_unit_price);
        console.log('  - amc_description:', newProducts[0].amc_description);
      }
      console.log('========================');
      
      toast({
        title: "CSV Imported",
        description: `Successfully imported ${newProducts.length} products from CSV.`,
      });

    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Import Failed",
        description: "Failed to parse CSV file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['name', 'description', 'sku', 'category_name', 'unit_price', 'landed_cost', 'total_man_days', 'currency', 'is_man_day_based', 'has_amc_option', 'amc_unit_price', 'amc_description', 'brand', 'model', 'part_number', 'tax_rate', 'is_discountable', 'is_refurbished', 'is_active', 'sort_order'],
      ['Sample Product 1', 'This is a sample product', 'SKU001', 'Hardware', '100.00', '50.00', '5', 'USD', 'FALSE', 'TRUE', '50.00', 'Annual Software Maintenance and Support', 'Brand A', 'Model X', 'PART001', '0', 'TRUE', 'FALSE', 'TRUE', '1'],
      ['Sample Product 2', 'Another sample product', 'SKU002', 'Software', '200.00', '150.00', '', 'USD', 'FALSE', 'FALSE', '0.00', '', 'Brand B', 'Model Y', 'PART002', '10', 'FALSE', 'TRUE', 'TRUE', '2']
    ];

    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRowSelect = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const selectAll = () => {
    setSelectedRows(new Set(products.map((_, index) => index)));
  };

  const deselectAll = () => {
    setSelectedRows(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading spreadsheet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/products')}
              className="p-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Product Spreadsheet</h1>
          <p className="text-muted-foreground">
            Excel-like interface for editing and importing products
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5" />
            <span>Spreadsheet Tools</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button onClick={addNewRow} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button 
                onClick={deleteRows} 
                variant="destructive" 
                size="sm"
                disabled={selectedRows.size === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedRows.size})
              </Button>
              <Button onClick={copyRows} size="sm" disabled={selectedRows.size === 0}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button onClick={pasteRows} size="sm" disabled={clipboard.length === 0}>
                <Clipboard className="h-4 w-4 mr-2" />
                Paste
              </Button>
              <div className="border-l border-gray-300 h-6 mx-2"></div>
              <Button onClick={undo} size="sm" disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4 mr-2" />
                Undo
              </Button>
              <Button onClick={redo} size="sm" disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4 mr-2" />
                Redo
              </Button>
              <div className="border-l border-gray-300 h-6 mx-2"></div>
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={downloadTemplate} size="sm" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button onClick={selectAll} size="sm" variant="outline">
                Select All
              </Button>
              <Button onClick={deselectAll} size="sm" variant="outline">
                Deselect All
              </Button>
              <div className="border-l border-gray-300 h-6 mx-2"></div>
              <Button onClick={exportToCSV} size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={saveAll} size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Spreadsheet Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table ref={tableRef}>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="min-w-[200px]">Name</TableHead>
                  <TableHead className="min-w-[150px]">Description</TableHead>
                  <TableHead className="min-w-[100px]">SKU</TableHead>
                  <TableHead className="min-w-[120px]">Category</TableHead>
                  <TableHead className="min-w-[100px]">Price</TableHead>
                  <TableHead className="min-w-[80px]">Currency</TableHead>
                  <TableHead className="min-w-[100px]">Brand</TableHead>
                  <TableHead className="min-w-[100px]">Model</TableHead>
                  <TableHead className="min-w-[100px]">Part Number</TableHead>
                  <TableHead className="min-w-[80px]">Tax Rate</TableHead>
                  <TableHead className="min-w-[100px]">Has AMC</TableHead>
                  <TableHead className="min-w-[100px]">AMC Price</TableHead>
                  <TableHead className="min-w-[150px]">AMC Description</TableHead>
                  <TableHead className="min-w-[80px]">Discountable</TableHead>
                  <TableHead className="min-w-[80px]">Active</TableHead>
                  <TableHead className="min-w-[80px]">Sort Order</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow 
                    key={index}
                    className={`${selectedRows.has(index) ? 'bg-blue-50' : ''} ${
                      product.isNew ? 'bg-green-50' : product.isModified ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleRowSelect(index)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'name' ? (
                        <Input
                          value={product.name}
                          onChange={(e) => handleCellEdit(index, 'name', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'name')}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'name')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.name || 'Click to edit'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'description' ? (
                        <Input
                          value={product.description}
                          onChange={(e) => handleCellEdit(index, 'description', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'description')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.description || 'Click to edit'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'sku' ? (
                        <Input
                          value={product.sku}
                          onChange={(e) => handleCellEdit(index, 'sku', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'sku')}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'sku')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.sku || 'Click to edit'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={product.category_id.toString()}
                        onValueChange={(value) => handleCellEdit(index, 'category_id', parseInt(value))}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={product.unit_price}
                        onChange={(e) => handleCellEdit(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'currency' ? (
                        <Input
                          value={product.currency}
                          onChange={(e) => handleCellEdit(index, 'currency', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'currency')}
                          onBlur={handleCellBlur}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'currency')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.currency}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={product.brand || ''}
                        onChange={(e) => handleCellEdit(index, 'brand', e.target.value)}
                        className="h-8"
                        placeholder="Enter brand"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={product.model || ''}
                        onChange={(e) => handleCellEdit(index, 'model', e.target.value)}
                        className="h-8"
                        placeholder="Enter model"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={product.part_number || ''}
                        onChange={(e) => handleCellEdit(index, 'part_number', e.target.value)}
                        className="h-8"
                        placeholder="Enter part number"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={product.tax_rate}
                        onChange={(e) => handleCellEdit(index, 'tax_rate', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={product.has_amc_option}
                        onChange={(e) => handleCellEdit(index, 'has_amc_option', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        value={product.amc_unit_price}
                        onChange={(e) => handleCellEdit(index, 'amc_unit_price', parseFloat(e.target.value) || 0)}
                        className="h-8"
                        placeholder="0.00"
                        disabled={!product.has_amc_option}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={product.amc_description_id?.toString() || '__no_amc__'}
                        onValueChange={(value) => handleCellEdit(index, 'amc_description_id', value === '__no_amc__' ? null : parseInt(value))}
                        disabled={!product.has_amc_option}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select AMC" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__no_amc__">No AMC</SelectItem>
                          {amcDescriptions.map((amc) => (
                            <SelectItem key={amc.id} value={amc.id.toString()}>
                              {amc.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'is_discountable' ? (
                        <Select
                          value={product.is_discountable.toString()}
                          onValueChange={(value) => handleCellEdit(index, 'is_discountable', value === 'true')}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'is_discountable')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.is_discountable ? 'Yes' : 'No'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'is_active' ? (
                        <Select
                          value={product.is_active.toString()}
                          onValueChange={(value) => handleCellEdit(index, 'is_active', value === 'true')}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Yes</SelectItem>
                            <SelectItem value="false">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'is_active')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.is_active ? 'Yes' : 'No'}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingCell?.row === index && editingCell?.field === 'sort_order' ? (
                        <Input
                          type="number"
                          value={product.sort_order || 0}
                          onChange={(e) => handleCellEdit(index, 'sort_order', parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'sort_order')}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="h-8"
                        />
                      ) : (
                        <div 
                          onClick={() => handleCellClick(index, 'sort_order')}
                          className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[32px] flex items-center"
                        >
                          {product.sort_order}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {product.isNew && (
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                            New
                          </Badge>
                        )}
                        {product.isModified && (
                          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                            Modified
                          </Badge>
                        )}
                        {!product.isNew && !product.isModified && (
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800">
                            Saved
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Bar */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Total Rows: {products.length}</span>
              <span>Selected: {selectedRows.size}</span>
              <span>New: {products.filter(p => p.isNew).length}</span>
              <span>Modified: {products.filter(p => p.isModified).length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>History: {historyIndex + 1}/{history.length}</span>
              <span>Clipboard: {clipboard.length} items</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
