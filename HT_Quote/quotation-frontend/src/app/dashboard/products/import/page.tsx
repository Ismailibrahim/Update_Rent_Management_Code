"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  ArrowLeft,
  Save,
  Eye,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { productsApi, categoriesApi, amcApi } from "@/lib/api";

interface ImportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  required: boolean;
  description?: string;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  totalRows: number;
}

interface ColumnMapping {
  [csvColumn: string]: string; // CSV column -> Database field
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
  value: any;
  type: 'required' | 'format' | 'mapping' | 'data_type' | 'reference';
  suggestion?: string;
}

interface ImportProgress {
  current: number;
  total: number;
  status: 'idle' | 'parsing' | 'mapping' | 'validating' | 'importing' | 'completed' | 'error';
  message: string;
}

const PRODUCT_FIELDS: ImportField[] = [
  { id: 'name', name: 'Product Name', type: 'text', required: true, description: 'Name of the product' },
  { id: 'description', name: 'Description', type: 'text', required: false, description: 'Product description' },
  { id: 'sku', name: 'SKU', type: 'text', required: false, description: 'Product SKU/Code' },
  { id: 'category_id', name: 'Category', type: 'text', required: true, description: 'Product category name' },
  { id: 'unit_price', name: 'Unit Price', type: 'number', required: true, description: 'Price per unit' },
  { id: 'landed_cost', name: 'Landed Cost', type: 'number', required: false, description: 'Cost to acquire product' },
  { id: 'total_man_days', name: 'Total Man Days', type: 'number', required: false, description: 'Number of man days required' },
  { id: 'currency', name: 'Currency', type: 'text', required: false, description: 'Currency code (USD, EUR, etc.)' },
  { id: 'is_man_day_based', name: 'Man Day Based', type: 'boolean', required: false, description: 'Is this a service product?' },
  { id: 'has_amc_option', name: 'Has AMC Option', type: 'boolean', required: false, description: 'Does this product have AMC?' },
  { id: 'amc_unit_price', name: 'AMC Unit Price', type: 'number', required: false, description: 'AMC price per unit' },
  { id: 'amc_description', name: 'AMC Description', type: 'text', required: false, description: 'AMC description text' },
  { id: 'brand', name: 'Brand', type: 'text', required: false, description: 'Product brand' },
  { id: 'model', name: 'Model', type: 'text', required: false, description: 'Product model' },
  { id: 'part_number', name: 'Part Number', type: 'text', required: false, description: 'Product part number' },
  { id: 'tax_rate', name: 'Tax Rate', type: 'number', required: false, description: 'Tax rate percentage' },
  { id: 'is_discountable', name: 'Is Discountable', type: 'boolean', required: false, description: 'Can this product be discounted?' },
  { id: 'is_refurbished', name: 'Is Refurbished', type: 'boolean', required: false, description: 'Is this a refurbished product?' },
  { id: 'is_active', name: 'Is Active', type: 'boolean', required: false, description: 'Is this product active?' },
  { id: 'sort_order', name: 'Sort Order', type: 'number', required: false, description: 'Display order' }
];

export default function AdvancedImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Array<{ id: number; name: string; category_type: string }>>([]);
  const [amcDescriptions, setAmcDescriptions] = useState<Array<{ id: number; description: string }>>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    message: ''
  });
  const [currentStep, setCurrentStep] = useState<'upload' | 'mapping' | 'preview' | 'import'>('upload');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, amcResponse] = await Promise.all([
        categoriesApi.getAll(),
        amcApi.getDescriptions()
      ]);
      
      setCategories(categoriesResponse.data);
      setAmcDescriptions(amcResponse.data);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load categories and AMC descriptions.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const parseFile = async (file: File) => {
    setImportProgress({ current: 0, total: 100, status: 'parsing', message: 'Parsing file...' });
    
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let data: ParsedData;

      if (fileExtension === 'csv') {
        data = await parseCSV(file);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        data = await parseExcel(file);
      } else {
        throw new Error('Unsupported file format. Please use CSV or Excel files.');
      }

      setParsedData(data);
      setCurrentStep('mapping');
      setImportProgress({ current: 100, total: 100, status: 'completed', message: 'File parsed successfully' });
    } catch (error) {
      setImportProgress({ 
        current: 0, 
        total: 100, 
        status: 'error', 
        message: `Error parsing file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  const parseCSV = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing error: ${results.errors[0].message}`));
            return;
          }
          
          const rows = results.data as string[][];
          if (rows.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          resolve({
            headers: rows[0],
            rows: rows.slice(1),
            totalRows: rows.length - 1
          });
        },
        error: (error) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  };

  const parseExcel = async (file: File): Promise<ParsedData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          resolve({
            headers: jsonData[0].map(String),
            rows: jsonData.slice(1),
            totalRows: jsonData.length - 1
          });
        } catch (error) {
          reject(new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read Excel file'));
      reader.readAsBinaryString(file);
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseFile(file);
    }
  };

  const handleColumnMapping = (csvColumn: string, dbField: string) => {
    if (dbField === '__skip__') {
      setColumnMapping(prev => {
        const newMapping = { ...prev };
        delete newMapping[csvColumn];
        return newMapping;
      });
    } else {
      setColumnMapping(prev => ({
        ...prev,
        [csvColumn]: dbField
      }));
    }
  };

  // Intelligent auto-mapping based on column names
  const autoMapColumns = () => {
    if (!parsedData) return;
    
    const autoMapping: ColumnMapping = {};
    
    parsedData.headers.forEach(csvColumn => {
      const lowerColumn = csvColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Smart matching based on common patterns
      const fieldMap: { [key: string]: string } = {
        // Product name variations
        'name': 'name',
        'productname': 'name',
        'product_name': 'name',
        'product': 'name',
        'title': 'name',
        
        // Description variations
        'description': 'description',
        'desc': 'description',
        'details': 'description',
        
        // SKU variations
        'sku': 'sku',
        'code': 'sku',
        'productcode': 'sku',
        'product_code': 'sku',
        'itemcode': 'sku',
        'item_code': 'sku',
        
        // Category variations
        'category': 'category_id',
        'cat': 'category_id',
        'type': 'category_id',
        'producttype': 'category_id',
        'product_type': 'category_id',
        
        // Price variations
        'price': 'unit_price',
        'unitprice': 'unit_price',
        'unit_price': 'unit_price',
        'cost': 'unit_price',
        'amount': 'unit_price',
        'rate': 'unit_price',
        
        // Currency variations
        'currency': 'currency',
        'curr': 'currency',
        'ccy': 'currency',
        
        // Boolean fields
        'manday': 'is_man_day_based',
        'mandaybased': 'is_man_day_based',
        'man_day_based': 'is_man_day_based',
        'service': 'is_man_day_based',
        'recurring': 'is_man_day_based',
        
        'amc': 'has_amc_option',
        'amcoption': 'has_amc_option',
        'amc_option': 'has_amc_option',
        'maintenance': 'has_amc_option',
        
        'discountable': 'is_discountable',
        'discount': 'is_discountable',
        'isdiscountable': 'is_discountable',
        
        'refurbished': 'is_refurbished',
        'refurb': 'is_refurbished',
        'used': 'is_refurbished',
        
        'active': 'is_active',
        'enabled': 'is_active',
        'status': 'is_active',
        
        // Brand/Model
        'brand': 'brand',
        'manufacturer': 'brand',
        'make': 'brand',
        
        'model': 'model',
        'modelnumber': 'model',
        'model_number': 'model',
        
        'partnumber': 'part_number',
        'part_number': 'part_number',
        'partno': 'part_number',
        
        // Tax
        'tax': 'tax_rate',
        'taxrate': 'tax_rate',
        'tax_rate': 'tax_rate',
        'vat': 'tax_rate',
        
        // Sort order
        'sort': 'sort_order',
        'order': 'sort_order',
        'sequence': 'sort_order',
        'priority': 'sort_order'
      };
      
      const matchedField = fieldMap[lowerColumn];
      if (matchedField) {
        autoMapping[csvColumn] = matchedField;
      }
    });
    
    setColumnMapping(autoMapping);
  };

  // Clear all mappings
  const clearMappings = () => {
    setColumnMapping({});
  };

  // Get mapping suggestions for a column
  const getMappingSuggestions = (csvColumn: string) => {
    const lowerColumn = csvColumn.toLowerCase().replace(/[^a-z0-9]/g, '');
    const suggestions: string[] = [];
    
    PRODUCT_FIELDS.forEach(field => {
      const fieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (fieldName.includes(lowerColumn) || lowerColumn.includes(fieldName)) {
        suggestions.push(field.id);
      }
    });
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  };

  // Mapping templates for common file formats
  const mappingTemplates = {
    'standard': {
      name: 'Standard Product Import',
      description: 'Common product fields with standard naming',
      mapping: {
        'Product Name': 'name',
        'Description': 'description',
        'SKU': 'sku',
        'Category': 'category_id',
        'Price': 'unit_price',
        'Currency': 'currency',
        'Brand': 'brand',
        'Model': 'model',
        'Active': 'is_active'
      }
    },
    'ecommerce': {
      name: 'E-commerce Platform',
      description: 'Common e-commerce export format',
      mapping: {
        'title': 'name',
        'description': 'description',
        'sku': 'sku',
        'category': 'category_id',
        'price': 'unit_price',
        'currency_code': 'currency',
        'brand': 'brand',
        'model': 'model',
        'status': 'is_active'
      }
    },
    'inventory': {
      name: 'Inventory Management',
      description: 'Inventory system export format',
      mapping: {
        'item_name': 'name',
        'item_description': 'description',
        'item_code': 'sku',
        'category_name': 'category_id',
        'unit_cost': 'unit_price',
        'currency': 'currency',
        'manufacturer': 'brand',
        'model_number': 'model',
        'is_active': 'is_active'
      }
    },
    'service': {
      name: 'Service Products',
      description: 'Service-based products with man-days',
      mapping: {
        'service_name': 'name',
        'description': 'description',
        'service_code': 'sku',
        'service_category': 'category_id',
        'daily_rate': 'unit_price',
        'currency': 'currency',
        'man_days': 'total_man_days',
        'is_man_day_based': 'is_man_day_based',
        'has_amc': 'has_amc_option'
      }
    }
  };

  // Apply mapping template
  const applyTemplate = (templateKey: keyof typeof mappingTemplates) => {
    const template = mappingTemplates[templateKey];
    const newMapping: ColumnMapping = {};
    
    // Match CSV headers to template mappings
    parsedData?.headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Find matching template field
      Object.entries(template.mapping).forEach(([templateField, dbField]) => {
        const lowerTemplate = templateField.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (lowerHeader.includes(lowerTemplate) || lowerTemplate.includes(lowerHeader)) {
          newMapping[header] = dbField;
        }
      });
    });
    
    setColumnMapping(newMapping);
  };

  // Save current mapping as template
  const saveAsTemplate = () => {
    const templateName = prompt('Enter template name:');
    if (templateName) {
      // In a real app, this would save to localStorage or backend
      console.log('Saving template:', templateName, columnMapping);
      toast({
        title: "Template Saved",
        description: `Template "${templateName}" saved successfully!`,
      });
    }
  };

  const validateData = () => {
    if (!parsedData) return;

    setImportProgress({ current: 0, total: 100, status: 'validating', message: 'Validating data...' });
    
    const errors: ValidationError[] = [];
    const requiredFields = PRODUCT_FIELDS.filter(f => f.required);
    
    // Step 1: Check column mapping for required fields
    requiredFields.forEach(field => {
      const csvColumn = Object.keys(columnMapping).find(key => columnMapping[key] === field.id);
      if (!csvColumn) {
        errors.push({
          row: 0,
          column: field.name,
          message: `Required field '${field.name}' is not mapped to any CSV column`,
          value: null,
          type: 'mapping',
          suggestion: `Please map a CSV column to '${field.name}' in the mapping step`
        });
      }
    });

    // Step 2: Validate each row
    parsedData.rows.forEach((row, rowIndex) => {
      const actualRowNumber = rowIndex + 2; // +2 because we skip header and 0-index
      
      // Check required fields
      requiredFields.forEach(field => {
        const csvColumn = Object.keys(columnMapping).find(key => columnMapping[key] === field.id);
        if (!csvColumn) return; // Already handled in step 1

        const columnIndex = parsedData.headers.indexOf(csvColumn);
        if (columnIndex === -1) {
          errors.push({
            row: actualRowNumber,
            column: field.name,
            message: `Column '${csvColumn}' not found in CSV headers`,
            value: null,
            type: 'mapping',
            suggestion: 'Please check your CSV file headers'
          });
          return;
        }

        const value = row[columnIndex];
        
        // Check if required field is empty
        if (!value || value.toString().trim() === '') {
          errors.push({
            row: actualRowNumber,
            column: field.name,
            message: `Required field '${field.name}' is empty in row ${actualRowNumber}`,
            value: value,
            type: 'required',
            suggestion: `Please provide a value for '${field.name}' in row ${actualRowNumber}`
          });
          return;
        }

        // Validate data types
        if (field.type === 'number') {
          const numValue = parseFloat(value.toString());
          if (isNaN(numValue)) {
            errors.push({
              row: actualRowNumber,
              column: field.name,
              message: `'${field.name}' must be a number, but got '${value}'`,
              value: value,
              type: 'data_type',
              suggestion: `Please enter a valid number for '${field.name}' in row ${actualRowNumber}`
            });
          } else if (numValue < 0) {
            errors.push({
              row: actualRowNumber,
              column: field.name,
              message: `'${field.name}' cannot be negative (${numValue})`,
              value: value,
              type: 'format',
              suggestion: `Please enter a positive number for '${field.name}' in row ${actualRowNumber}`
            });
          }
        }

        if (field.type === 'boolean') {
          const boolValue = value.toString().toLowerCase();
          if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
            errors.push({
              row: actualRowNumber,
              column: field.name,
              message: `'${field.name}' must be true/false, but got '${value}'`,
              value: value,
              type: 'data_type',
              suggestion: `Please use 'true' or 'false' for '${field.name}' in row ${actualRowNumber}`
            });
          }
        }
      });

      // Check category reference
      const categoryColumn = Object.keys(columnMapping).find(key => columnMapping[key] === 'category_id');
      if (categoryColumn) {
        const categoryIndex = parsedData.headers.indexOf(categoryColumn);
        if (categoryIndex !== -1) {
          const categoryValue = row[categoryIndex];
          if (categoryValue && typeof categoryValue === 'string') {
            const category = categories.find(c => c.name.toLowerCase() === categoryValue.toLowerCase());
            if (!category) {
              errors.push({
                row: actualRowNumber,
                column: 'Category',
                message: `Category '${categoryValue}' not found in system`,
                value: categoryValue,
                type: 'reference',
                suggestion: `Available categories: ${categories.map(c => c.name).join(', ')}`
              });
            }
          }
        }
      }

      // Check AMC description reference
      const amcDescColumn = Object.keys(columnMapping).find(key => columnMapping[key] === 'amc_description');
      if (amcDescColumn) {
        const amcDescIndex = parsedData.headers.indexOf(amcDescColumn);
        if (amcDescIndex !== -1) {
          const amcDescValue = row[amcDescIndex];
          if (amcDescValue && typeof amcDescValue === 'string') {
            const amcDesc = amcDescriptions.find(a => a.description.toLowerCase() === amcDescValue.toLowerCase());
            if (!amcDesc) {
              errors.push({
                row: actualRowNumber,
                column: 'AMC Description',
                message: `AMC Description '${amcDescValue}' not found in system`,
                value: amcDescValue,
                type: 'reference',
                suggestion: `Available AMC descriptions: ${amcDescriptions.map(a => a.description).join(', ')}`
              });
            }
          }
        }
      }

      // Check for duplicate SKUs
      const skuColumn = Object.keys(columnMapping).find(key => columnMapping[key] === 'sku');
      if (skuColumn) {
        const skuIndex = parsedData.headers.indexOf(skuColumn);
        if (skuIndex !== -1) {
          const skuValue = row[skuIndex];
          if (skuValue) {
            // Check for duplicates within the import data
            const duplicateRows = parsedData.rows
              .map((r, idx) => ({ row: r, index: idx }))
              .filter((r, idx) => idx !== rowIndex && r.row[skuIndex] === skuValue);
            
            if (duplicateRows.length > 0) {
              errors.push({
                row: actualRowNumber,
                column: 'SKU',
                message: `Duplicate SKU '${skuValue}' found in rows ${duplicateRows.map(r => r.index + 2).join(', ')}`,
                value: skuValue,
                type: 'format',
                suggestion: `Please ensure each product has a unique SKU`
              });
            }
          }
        }
      }
    });

    setValidationErrors(errors);
    setCurrentStep('preview');
    setImportProgress({ 
      current: 100, 
      total: 100, 
      status: 'completed', 
      message: `Validation complete. Found ${errors.length} errors.` 
    });
  };

  const handleImport = async () => {
    if (!parsedData || validationErrors.length > 0) return;

    setImportProgress({ current: 0, total: parsedData.totalRows, status: 'importing', message: 'Importing products...' });
    
    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedData.rows.length; i++) {
      try {
        const row = parsedData.rows[i];
        const productData: any = {};

        // Map CSV columns to database fields
        Object.entries(columnMapping).forEach(([csvColumn, dbField]) => {
          if (dbField === '__skip__') return; // Skip unmapped columns
          
          const columnIndex = parsedData.headers.indexOf(csvColumn);
          if (columnIndex !== -1) {
            const value = row[columnIndex];
            const field = PRODUCT_FIELDS.find(f => f.id === dbField);
            
            if (field) {
              switch (field.type) {
                case 'number':
                  productData[dbField] = value ? parseFloat(value.toString()) : null;
                  break;
                case 'boolean':
                  productData[dbField] = value?.toString().toLowerCase() === 'true';
                  break;
                default:
                  productData[dbField] = value?.toString() || '';
              }
            }
          }
        });

        // Handle special mappings
        if (productData.category_id && typeof productData.category_id === 'string') {
          const category = categories.find(c => c.name.toLowerCase() === productData.category_id.toLowerCase());
          if (category) {
            productData.category_id = category.id;
          }
        }

        if (productData.amc_description && typeof productData.amc_description === 'string') {
          const amcDesc = amcDescriptions.find(a => a.description.toLowerCase() === productData.amc_description.toLowerCase());
          if (amcDesc) {
            productData.amc_description_id = amcDesc.id;
          }
        }

        // Set pricing model based on is_man_day_based
        if (productData.is_man_day_based) {
          productData.pricing_model = 'recurring';
        } else {
          productData.pricing_model = 'one_time';
        }

        // Call API to create product
        const response = await fetch('http://127.0.0.1:8000/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'your-secret-api-key-here',
          },
          body: JSON.stringify(productData),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        success++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      setImportProgress(prev => ({
        ...prev,
        current: i + 1,
        message: `Imported ${i + 1} of ${parsedData.totalRows} products...`
      }));
    }

    setImportProgress({ 
      current: parsedData.totalRows, 
      total: parsedData.totalRows, 
      status: 'completed', 
      message: `Import complete! ${success} products imported successfully.` 
    });

    toast({
      title: "Import Complete",
      description: `Successfully imported ${success} products. ${errors.length} errors occurred.`,
    });

    // Navigate back to products page
    router.push('/dashboard/products');
  };

  const resetImport = () => {
    setImportFile(null);
    setParsedData(null);
    setColumnMapping({});
    setValidationErrors([]);
    setImportProgress({ current: 0, total: 0, status: 'idle', message: '' });
    setCurrentStep('upload');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading import data...</p>
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
          <h1 className="text-3xl font-bold tracking-tight">Advanced Product Import</h1>
          <p className="text-muted-foreground">
            Import products from Excel or CSV files with intelligent column mapping and validation
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={currentStep} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="mapping" disabled={!parsedData}>Mapping</TabsTrigger>
          <TabsTrigger value="preview" disabled={!parsedData}>Preview</TabsTrigger>
          <TabsTrigger value="import" disabled={validationErrors.length > 0}>Import</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload File</span>
              </CardTitle>
              <CardDescription>
                Select an Excel (.xlsx, .xls) or CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900">Choose file</span>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </Label>
                  <p className="text-sm text-gray-500 mt-2">
                    or drag and drop your file here
                  </p>
                </div>
              </div>
              
              {importFile && (
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{importFile.name}</span>
                  <Badge variant="outline">{importFile.size} bytes</Badge>
                </div>
              )}

              {importProgress.status === 'parsing' && (
                <div className="space-y-2">
                  <Progress value={importProgress.current} className="w-full" />
                  <p className="text-sm text-gray-600">{importProgress.message}</p>
                </div>
              )}

              {importProgress.status === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{importProgress.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Smart Column Mapping</span>
              </CardTitle>
              <CardDescription>
                Map your CSV columns to database fields with intelligent suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedData && (
                <div className="space-y-6">
                  {/* Smart Mapping Controls */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-blue-900">Smart Mapping Tools</h3>
                        <p className="text-sm text-blue-700">Use these tools to speed up the mapping process</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={autoMapColumns}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Auto-Map
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearMappings}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                    </div>

                    {/* Mapping Templates */}
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-900 mb-3">Mapping Templates</h4>
                      <p className="text-sm text-green-700 mb-3">Choose a pre-built template for common file formats</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {Object.entries(mappingTemplates).map(([key, template]) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplate(key as keyof typeof mappingTemplates)}
                            className="h-auto p-3 flex flex-col items-start text-left"
                          >
                            <span className="font-medium text-sm">{template.name}</span>
                            <span className="text-xs text-gray-500 mt-1">{template.description}</span>
                          </Button>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <Button variant="ghost" size="sm" onClick={saveAsTemplate}>
                          <Save className="h-4 w-4 mr-2" />
                          Save Current as Template
                        </Button>
                        <span className="text-xs text-gray-500">
                          Templates help speed up mapping for common file formats
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mapping Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Mapping Progress:</span>
                      <Badge variant="outline">
                        {Object.keys(columnMapping).length} of {parsedData.headers.length} mapped
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {Object.keys(columnMapping).length === parsedData.headers.length ? '✅ All columns mapped' : '⚠️ Some columns unmapped'}
                    </div>
                  </div>

                  {/* Visual Mapping Interface */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Column Mapping Interface</h4>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">Grid View</Badge>
                        <Button variant="ghost" size="sm">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Switch to Visual
                        </Button>
                      </div>
                    </div>
                    
                    {/* CSV Columns vs Database Fields Visual */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* CSV Columns */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-blue-700 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Your CSV Columns ({parsedData.headers.length})
                        </h5>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {parsedData.headers.map((header, index) => {
                            const isMapped = columnMapping[header] && columnMapping[header] !== '__skip__';
                            return (
                              <div
                                key={index}
                                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                  isMapped 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                      {header}
                                    </span>
                                    {isMapped && <CheckCircle className="h-4 w-4 text-green-600" />}
                                  </div>
                                  {isMapped && (
                                    <Badge variant="outline" className="text-xs">
                                      → {PRODUCT_FIELDS.find(f => f.id === columnMapping[header])?.name}
                                    </Badge>
                                  )}
                                </div>
                                {parsedData.rows.length > 0 && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Sample: "{parsedData.rows[0][index] || 'Empty'}"
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Database Fields */}
                      <div className="space-y-3">
                        <h5 className="font-medium text-green-700 flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          Database Fields ({PRODUCT_FIELDS.length})
                        </h5>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {PRODUCT_FIELDS.map((field) => {
                            const mappedFrom = Object.keys(columnMapping).find(
                              key => columnMapping[key] === field.id
                            );
                            return (
                              <div
                                key={field.id}
                                className={`p-3 border rounded-lg ${
                                  mappedFrom 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-sm">{field.name}</span>
                                    {field.required && (
                                      <Badge variant="destructive" className="text-xs">Required</Badge>
                                    )}
                                  </div>
                                  {mappedFrom && (
                                    <Badge variant="outline" className="text-xs">
                                      ← {mappedFrom}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {field.type} • {field.description}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Column Mapping Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {parsedData.headers.map((header, index) => {
                      const currentMapping = columnMapping[header];
                      const suggestions = getMappingSuggestions(header);
                      const isMapped = !!currentMapping && currentMapping !== '__skip__';
                      
                      return (
                        <div key={index} className={`p-4 border rounded-lg ${isMapped ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                          <div className="space-y-3">
                            {/* CSV Column Header */}
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium flex items-center space-x-2">
                                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">{header}</span>
                                {isMapped && <CheckCircle className="h-4 w-4 text-green-600" />}
                              </Label>
                              {suggestions.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {suggestions.length} suggestions
                                </Badge>
                              )}
                            </div>

                            {/* Mapping Select */}
                            <Select
                              value={currentMapping || ''}
                              onValueChange={(value) => handleColumnMapping(header, value)}
                            >
                              <SelectTrigger className={isMapped ? 'border-green-300' : ''}>
                                <SelectValue placeholder="Select database field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__skip__">-- Skip this column --</SelectItem>
                                {PRODUCT_FIELDS.map((field) => {
                                  const isSuggested = suggestions.includes(field.id);
                                  const isRequired = field.required;
                                  
                                  return (
                                    <SelectItem key={field.id} value={field.id}>
                                      <div className="flex flex-col">
                                        <div className="flex items-center space-x-2">
                                          <span className="font-medium">{field.name}</span>
                                          {isSuggested && <Badge variant="outline" className="text-xs">Suggested</Badge>}
                                          {isRequired && <Badge variant="destructive" className="text-xs">Required</Badge>}
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {field.type} • {field.description}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>

                            {/* Quick Suggestions */}
                            {suggestions.length > 0 && !isMapped && (
                              <div className="space-y-1">
                                <p className="text-xs text-gray-600">Quick suggestions:</p>
                                <div className="flex flex-wrap gap-1">
                                  {suggestions.map((suggestion) => {
                                    const field = PRODUCT_FIELDS.find(f => f.id === suggestion);
                                    return (
                                      <Button
                                        key={suggestion}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6"
                                        onClick={() => handleColumnMapping(header, suggestion)}
                                      >
                                        {field?.name}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Sample Data Preview */}
                            {parsedData.rows.length > 0 && (
                              <div className="text-xs text-gray-500">
                                <span className="font-medium">Sample:</span> "{parsedData.rows[0][index] || 'Empty'}"
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Mapping Summary */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">Mapping Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Columns:</span>
                        <span className="ml-2 font-medium">{parsedData.headers.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Mapped:</span>
                        <span className="ml-2 font-medium text-green-600">{Object.keys(columnMapping).filter(k => columnMapping[k] !== '__skip__').length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Skipped:</span>
                        <span className="ml-2 font-medium text-orange-600">{Object.values(columnMapping).filter(v => v === '__skip__').length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unmapped:</span>
                        <span className="ml-2 font-medium text-red-600">{parsedData.headers.length - Object.keys(columnMapping).length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetImport}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                    <Button onClick={validateData} disabled={Object.keys(columnMapping).length === 0}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Validate & Preview
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Data Preview</span>
              </CardTitle>
              <CardDescription>
                Review your data before importing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationErrors.length > 0 ? (
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Found {validationErrors.length} validation errors. Please fix them before importing.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="border rounded-lg p-4 max-h-96 overflow-auto">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-red-700">Detailed Error Report:</h4>
                      <div className="flex space-x-2">
                        {Object.entries(
                          validationErrors.reduce((acc, error) => {
                            acc[error.type] = (acc[error.type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type === 'required' && 'Required'}
                            {type === 'format' && 'Format'}
                            {type === 'mapping' && 'Mapping'}
                            {type === 'data_type' && 'Data Type'}
                            {type === 'reference' && 'Reference'}
                            : {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      {validationErrors.map((error, index) => (
                        <div key={index} className="border-l-4 border-red-500 pl-3 py-2 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {error.type === 'required' && 'Required Field'}
                                  {error.type === 'format' && 'Format Error'}
                                  {error.type === 'mapping' && 'Mapping Error'}
                                  {error.type === 'data_type' && 'Data Type Error'}
                                  {error.type === 'reference' && 'Reference Error'}
                                </Badge>
                                <span className="text-sm font-medium text-gray-700">
                                  Row {error.row} • {error.column}
                                </span>
                              </div>
                              <p className="text-sm text-gray-800 mb-1">{error.message}</p>
                              {error.value && (
                                <p className="text-xs text-gray-600 mb-1">
                                  <strong>Value:</strong> "{error.value}"
                                </p>
                              )}
                              {error.suggestion && (
                                <p className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                                  <strong>💡 Suggestion:</strong> {error.suggestion}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Data validation passed! Ready to import {parsedData?.totalRows} products.
                  </AlertDescription>
                </Alert>
              )}

              {parsedData && (
                <div className="mt-6">
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {parsedData.headers.slice(0, 10).map((header, index) => (
                            <TableHead key={index} className="font-medium">
                              {header}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {row.slice(0, 10).map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="text-sm">
                                {cell?.toString() || ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {parsedData.totalRows > 5 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Showing first 5 rows of {parsedData.totalRows} total rows
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Back to Mapping
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={validationErrors.length > 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Import Products
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Progress</CardTitle>
              <CardDescription>
                Importing your products...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={(importProgress.current / importProgress.total) * 100} className="w-full" />
                <p className="text-sm text-gray-600">{importProgress.message}</p>
                
                {importProgress.status === 'completed' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import completed successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
