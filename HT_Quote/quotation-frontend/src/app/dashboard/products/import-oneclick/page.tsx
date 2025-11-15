"use client";

import React, { useState } from 'react';
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
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  ArrowLeft,
  RefreshCw,
  Zap,
  FileSpreadsheet,
  Lightbulb
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function OneClickImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportResults(null);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Product Name', 'Category', 'Price', 'Currency', 'Brand', 'Model'],
      ['Laptop Computer', 'Hardware', '999.99', 'USD', 'Dell', 'Inspiron 15'],
      ['Office Chair', 'Furniture', '299.99', 'USD', 'Herman Miller', 'Aeron'],
      ['Software License', 'Software', '199.99', 'USD', 'Microsoft', 'Office 365']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'one_click_import_template.xlsx');
  };

  const handleOneClickImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportProgress(0);
    let success = 0;
    const errors: string[] = [];

    try {
      // Parse file
      const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
      let data: any;

      if (fileExtension === 'csv') {
        data = await parseCSV(importFile);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        data = await parseExcel(importFile);
      } else {
        throw new Error('Please use CSV or Excel files only.');
      }

      setImportProgress(25);

      // Auto-map columns using simple rules
      const mapping = autoMapColumns(data.headers);
      setImportProgress(50);

      // Import products
      for (let i = 0; i < data.rows.length; i++) {
        try {
          const row = data.rows[i];
          const productData: any = {};

          // Map data using auto-mapping
          Object.entries(mapping).forEach(([csvColumn, dbField]) => {
            const columnIndex = data.headers.indexOf(csvColumn);
            if (columnIndex !== -1) {
              const value = row[columnIndex];
              
              if (dbField === 'unit_price') {
                productData[dbField] = value ? parseFloat(value.toString()) : 0;
              } else if (dbField === 'category_id') {
                // For simplicity, we'll use category name as-is
                // In a real app, you'd look up the category ID
                productData[dbField] = 1; // Default category
              } else {
                productData[dbField] = value?.toString() || '';
              }
            }
          });

          // Set defaults
          productData.is_active = true;
          productData.pricing_model = 'one_time';
          productData.currency = productData.currency || 'USD';

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

        // Update progress
        setImportProgress(50 + ((i + 1) / data.rows.length) * 50);
      }

      setImportResults({ success, errors });
      setImportProgress(100);
      
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
      setImporting(false);
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
    const mapping: { [key: string]: string } = {};
    
    headers.forEach(header => {
      const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      if (lowerHeader.includes('name') || lowerHeader.includes('title') || lowerHeader.includes('product')) {
        mapping[header] = 'name';
      } else if (lowerHeader.includes('description') || lowerHeader.includes('desc')) {
        mapping[header] = 'description';
      } else if (lowerHeader.includes('sku') || lowerHeader.includes('code')) {
        mapping[header] = 'sku';
      } else if (lowerHeader.includes('category') || lowerHeader.includes('type')) {
        mapping[header] = 'category_id';
      } else if (lowerHeader.includes('price') || lowerHeader.includes('cost') || lowerHeader.includes('amount')) {
        mapping[header] = 'unit_price';
      } else if (lowerHeader.includes('currency')) {
        mapping[header] = 'currency';
      } else if (lowerHeader.includes('brand')) {
        mapping[header] = 'brand';
      } else if (lowerHeader.includes('model')) {
        mapping[header] = 'model';
      }
    });
    
    return mapping;
  };

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
          <h1 className="text-3xl font-bold tracking-tight">One-Click Import</h1>
          <p className="text-muted-foreground">
            The easiest way to import products - just upload and go!
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <span>One-Click Product Import</span>
            </CardTitle>
            <CardDescription>
              Upload your file and we'll automatically map and import your products
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!importResults ? (
              <>
                {/* File Upload */}
                <div className="space-y-4">
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
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">{importFile.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {importFile.size} bytes
                        </Badge>
                      </div>
                      <Button
                        onClick={handleOneClickImport}
                        disabled={importing}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {importing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4 mr-2" />
                            Import Now
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Progress Bar */}
                  {importing && (
                    <div className="space-y-2">
                      <Progress value={importProgress} className="w-full" />
                      <p className="text-sm text-gray-600 text-center">
                        Importing products... {Math.round(importProgress)}%
                      </p>
                    </div>
                  )}
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

                {/* How It Works */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">How It Works</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                      <span>Upload your Excel or CSV file</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                      <span>We automatically detect and map your columns</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                      <span>Products are imported instantly</span>
                    </div>
                  </div>
                </div>

                {/* Supported Formats */}
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">Supported Column Names</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm text-yellow-800">
                    <div>• Product Name, Name, Title</div>
                    <div>• Category, Type</div>
                    <div>• Price, Cost, Amount</div>
                    <div>• Currency</div>
                    <div>• Brand</div>
                    <div>• Model</div>
                    <div>• SKU, Code</div>
                    <div>• Description</div>
                  </div>
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
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {importResults.errors.length} errors occurred during import.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => {
                    setImportFile(null);
                    setImportResults(null);
                    setImportProgress(0);
                  }}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Import Another File
                  </Button>
                  <Button onClick={() => router.push('/dashboard/products')}>
                    View Products
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
