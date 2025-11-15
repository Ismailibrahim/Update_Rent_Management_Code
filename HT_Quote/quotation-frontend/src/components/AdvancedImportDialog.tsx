"use client";

import React, { useState, useCallback } from 'react';
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
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from "@/components/ui/dialog";
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
  RefreshCw
} from "lucide-react";

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

interface AdvancedImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (results: { success: number; errors: string[] }) => void;
  categories: Array<{ id: number; name: string; category_type: string }>;
  amcDescriptions: Array<{ id: number; description: string }>;
}

export default function AdvancedImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  categories,
  amcDescriptions
}: AdvancedImportDialogProps) {
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

  const parseFile = useCallback(async (file: File) => {
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
  }, []);

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

  const validateData = useCallback(() => {
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
  }, [parsedData, columnMapping, categories, amcDescriptions]);

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

    onImportComplete({ success, errors });
  };

  const resetImport = () => {
    setImportFile(null);
    setParsedData(null);
    setColumnMapping({});
    setValidationErrors([]);
    setImportProgress({ current: 0, total: 0, status: 'idle', message: '' });
    setCurrentStep('upload');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Advanced Product Import</span>
          </DialogTitle>
          <DialogDescription>
            Upload Excel or CSV files with intelligent column mapping and validation
          </DialogDescription>
        </DialogHeader>

        <Tabs value={currentStep} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="mapping" disabled={!parsedData}>Mapping</TabsTrigger>
            <TabsTrigger value="preview" disabled={!parsedData}>Preview</TabsTrigger>
            <TabsTrigger value="import" disabled={validationErrors.length > 0}>Import</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload File</CardTitle>
                <CardDescription>
                  Select an Excel (.xlsx, .xls) or CSV file to import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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

          <TabsContent value="mapping" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Column Mapping</CardTitle>
                <CardDescription>
                  Map your CSV columns to database fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                {parsedData && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {parsedData.headers.map((header, index) => (
                        <div key={index} className="space-y-2">
                          <Label className="text-sm font-medium">
                            CSV Column: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{header}</span>
                          </Label>
                          <Select
                            value={columnMapping[header] || ''}
                            onValueChange={(value) => handleColumnMapping(header, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select database field" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">-- Skip this column --</SelectItem>
                              {PRODUCT_FIELDS.map((field) => (
                                <SelectItem key={field.id} value={field.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{field.name}</span>
                                    <span className="text-xs text-gray-500">
                                      {field.type} {field.required && '(required)'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={resetImport}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Start Over
                      </Button>
                      <Button onClick={validateData}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Validate & Preview
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
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
                  <div className="mt-4">
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

                <div className="flex justify-between mt-4">
                  <Button variant="outline" onClick={() => setCurrentStep('mapping')}>
                    <ArrowDown className="h-4 w-4 mr-2" />
                    Back to Mapping
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={validationErrors.length > 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Products
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
