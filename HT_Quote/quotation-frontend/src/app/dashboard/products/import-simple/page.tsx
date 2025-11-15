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
  ArrowLeft,
  RefreshCw,
  HelpCircle,
  Lightbulb,
  Play,
  FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { productsApi, categoriesApi, amcApi } from "@/lib/api";

interface ImportStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
}

interface SimpleMapping {
  [csvColumn: string]: string;
}

export default function SimpleImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<Array<{ id: number; name: string; category_type: string }>>([]);
  const [amcDescriptions, setAmcDescriptions] = useState<Array<{ id: number; description: string }>>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [simpleMapping, setSimpleMapping] = useState<SimpleMapping>({});
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const steps: ImportStep[] = [
    {
      id: 'upload',
      title: 'Upload File',
      description: 'Choose your Excel or CSV file',
      completed: false,
      current: true
    },
    {
      id: 'map',
      title: 'Map Columns',
      description: 'Match your columns to our fields',
      completed: false,
      current: false
    },
    {
      id: 'preview',
      title: 'Preview & Import',
      description: 'Review and import your data',
      completed: false,
      current: false
    }
  ];

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      parseFile(file);
    }
  };

  const parseFile = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let data: any;

      if (fileExtension === 'csv') {
        data = await parseCSV(file);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        data = await parseExcel(file);
      } else {
        throw new Error('Please use CSV or Excel files only.');
      }

      setParsedData(data);
      autoMapColumns(data.headers);
      setCurrentStep(1);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = async (file: File): Promise<any> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV error: ${results.errors[0].message}`));
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

  const parseExcel = async (file: File): Promise<any> => {
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

  const autoMapColumns = (headers: string[]) => {
    const mapping: SimpleMapping = {};
    
    // Simple auto-mapping based on common patterns
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (lowerHeader.includes('name') || lowerHeader.includes('title')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
        mapping[header] = 'description';
      } else if (lowerHeader.includes('sku') || lowerHeader.includes('code')) {
        mapping[header] = 'sku';
      } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
        mapping[header] = 'category_id';
      } else if (lowerHeader.includes('price') || lowerHeader.includes('cost')) {
        mapping[header] = 'unit_price';
      } else if (lowerHeader.includes('currency')) {
        mapping[header] = 'currency';
      } else if (lowerHeader.includes('brand')) {
        mapping[header] = 'brand';
      } else if (lowerHeader.includes('model')) {
        mapping[header] = 'model';
      }
    });
    
    setSimpleMapping(mapping);
  };

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    if (dbField === 'skip') {
      setSimpleMapping(prev => {
        const newMapping = { ...prev };
        delete newMapping[csvColumn];
        return newMapping;
      });
    } else {
      setSimpleMapping(prev => ({
        ...prev,
        [csvColumn]: dbField
      }));
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setLoading(true);
    let success = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < parsedData.rows.length; i++) {
        try {
          const row = parsedData.rows[i];
          const productData: any = {};

          // Map CSV columns to database fields
          Object.entries(simpleMapping).forEach(([csvColumn, dbField]) => {
            if (dbField === 'skip') return;
            
            const columnIndex = parsedData.headers.indexOf(csvColumn);
            if (columnIndex !== -1) {
              const value = row[columnIndex];
              
              // Handle special mappings
              if (dbField === 'category_id' && typeof value === 'string') {
                const category = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
                if (category) {
                  productData[dbField] = category.id;
                }
              } else if (dbField === 'unit_price') {
                productData[dbField] = value ? parseFloat(value.toString()) : 0;
              } else if (dbField === 'is_man_day_based' || dbField === 'has_amc_option' || dbField === 'is_discountable' || dbField === 'is_active') {
                productData[dbField] = value?.toString().toLowerCase() === 'true';
              } else {
                productData[dbField] = value?.toString() || '';
              }
            }
          });

          // Set defaults
          productData.is_active = productData.is_active !== false;
          productData.pricing_model = productData.is_man_day_based ? 'recurring' : 'one_time';

          // Call API
          const response = await fetch('http://127.0.0.1:8000/api/products', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'your-secret-api-key-here',
            },
            body: JSON.stringify(productData),
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          success++;
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      setImportResults({ success, errors });
      setCurrentStep(2);
      
      toast({
        title: "Import Complete",
        description: `Successfully imported ${success} products. ${errors.length} errors occurred.`,
      });

    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setParsedData(null);
    setSimpleMapping({});
    setImportResults(null);
    setCurrentStep(0);
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Product Name', 'Description', 'SKU', 'Category', 'Unit Price', 'Currency', 'Brand', 'Model'],
      ['Sample Product 1', 'This is a sample product', 'SKU001', 'Hardware', '100.00', 'USD', 'Brand A', 'Model X'],
      ['Sample Product 2', 'Another sample product', 'SKU002', 'Software', '200.00', 'USD', 'Brand B', 'Model Y']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'product_import_template.xlsx');
  };

  if (loading && currentStep === 0) {
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
          <h1 className="text-3xl font-bold tracking-tight">Simple Product Import</h1>
          <p className="text-muted-foreground">
            Easy step-by-step product import with guided mapping
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              index <= currentStep 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-gray-100 border-gray-300 text-gray-500'
            }`}>
              {index < currentStep ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                index <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {step.title}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {currentStep === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Step 1: Upload Your File</span>
              </CardTitle>
              <CardDescription>
                Choose an Excel (.xlsx, .xls) or CSV file to import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
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

              {/* Template Download */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Need a Template?</h3>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Download our sample template to see the correct format
                </p>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              {/* Help Section */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <HelpCircle className="h-5 w-5 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Supported Formats</h3>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Excel files (.xlsx, .xls)</li>
                  <li>• CSV files (.csv)</li>
                  <li>• First row should contain column headers</li>
                  <li>• Maximum 1000 rows per import</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 1 && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span>Step 2: Map Your Columns</span>
              </CardTitle>
              <CardDescription>
                Match your CSV columns to our database fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto-mapping Success */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  We've automatically mapped {Object.keys(simpleMapping).length} columns. 
                  Review and adjust as needed.
                </AlertDescription>
              </Alert>

              {/* Column Mapping */}
              <div className="space-y-4">
                {parsedData.headers.map((header: string, index: number) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">{header}</span>
                      </Label>
                      {parsedData.rows.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Sample: "{parsedData.rows[0][index] || 'Empty'}"
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex-1">
                      <Select
                        value={simpleMapping[header] || ''}
                        onValueChange={(value) => handleMappingChange(header, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip this column</SelectItem>
                          <SelectItem value="name">Product Name</SelectItem>
                          <SelectItem value="description">Description</SelectItem>
                          <SelectItem value="sku">SKU</SelectItem>
                          <SelectItem value="category_id">Category</SelectItem>
                          <SelectItem value="unit_price">Unit Price</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="brand">Brand</SelectItem>
                          <SelectItem value="model">Model</SelectItem>
                          <SelectItem value="is_man_day_based">Man Day Based</SelectItem>
                          <SelectItem value="has_amc_option">Has AMC Option</SelectItem>
                          <SelectItem value="is_discountable">Is Discountable</SelectItem>
                          <SelectItem value="is_active">Is Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setCurrentStep(2)}>
                  Preview & Import
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Step 3: Preview & Import</span>
              </CardTitle>
              <CardDescription>
                Review your data and import to the database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!importResults ? (
                <>
                  {/* Data Preview */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Data Preview (First 5 rows)</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {parsedData.headers.slice(0, 8).map((header: string, index: number) => (
                              <TableHead key={index} className="font-medium">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedData.rows.slice(0, 5).map((row: any[], rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {row.slice(0, 8).map((cell: any, cellIndex: number) => (
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
                      <p className="text-sm text-gray-500">
                        Showing first 5 rows of {parsedData.totalRows} total rows
                      </p>
                    )}
                  </div>

                  {/* Import Summary */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Import Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Rows:</span>
                        <span className="ml-2 font-medium">{parsedData.totalRows}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Mapped Columns:</span>
                        <span className="ml-2 font-medium text-green-600">{Object.keys(simpleMapping).length}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Required Fields:</span>
                        <span className="ml-2 font-medium text-blue-600">Name, Category, Price</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Estimated Time:</span>
                        <span className="ml-2 font-medium">{Math.ceil(parsedData.totalRows / 10)} seconds</span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Mapping
                    </Button>
                    <Button onClick={handleImport} disabled={loading}>
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Import {parsedData.totalRows} Products
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                /* Import Results */
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Import completed! {importResults.success} products imported successfully.
                    </AlertDescription>
                  </Alert>

                  {importResults.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {importResults.errors.length} errors occurred during import.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={resetImport}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Import Another File
                    </Button>
                    <Button onClick={() => router.push('/dashboard/products')}>
                      View Products
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
