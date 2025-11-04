'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Select } from '../../../components/UI/Select';
import { ArrowLeft, Upload, Download, CheckCircle, XCircle, Eye } from 'lucide-react';
import { assetsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/UI/Table';

const assetFields = [
  { value: '', label: '-- Skip Column --' },
  { value: 'name', label: 'Name *' },
  { value: 'brand', label: 'Brand' },
  { value: 'serial_no', label: 'Serial No' },
  { value: 'category', label: 'Category *' },
  { value: 'status', label: 'Status' },
];

export default function ImportAssetsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [fieldMapping, setFieldMapping] = useState<Record<number, string>>({});
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      
      // Parse headers - skip instruction row if present
      const lines = text.split('\n').filter(line => line.trim());
      let headerLineIndex = 0;
      
      // Check if first line is instructions
      if (lines.length > 0 && lines[0].toLowerCase().includes('instructions')) {
        headerLineIndex = 1;
      }
      
      if (lines.length > headerLineIndex) {
        const headerLine = lines[headerLineIndex];
        const headers = headerLine.split(',').map(h => {
          // Remove quotes and trim
          let header = h.trim().replace(/^"|"$/g, '');
          return header;
        });
        setCsvHeaders(headers);
        
        // Auto-map if header names match (strip [REQUIRED] for matching)
        const autoMapping: Record<number, string> = {};
        headers.forEach((header, index) => {
          const cleanHeader = header.replace(/\s*\[REQUIRED\]/i, '').trim();
          const field = assetFields.find(
            f => f.value && cleanHeader.toLowerCase().replace(/[^a-z0-9]/g, '') === f.value.toLowerCase().replace(/[^a-z0-9]/g, '')
          );
          if (field && field.value) {
            autoMapping[index] = field.value;
          }
        });
        setFieldMapping(autoMapping);
      }
      
      setStep('map');
      toast.success('CSV file uploaded successfully');
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      const response = await assetsAPI.getImportTemplate();
      const template = response.data.template;
      
      // Create download link
      const blob = new Blob([template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'assets_import_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!csvData) {
      toast.error('Please upload a CSV file first');
      return;
    }

    try {
      setLoading(true);
      const mapping: Record<number, string> = {};
      Object.keys(fieldMapping).forEach(key => {
        mapping[parseInt(key)] = fieldMapping[parseInt(key)];
      });

      const response = await assetsAPI.previewImport({
        csv_data: csvData,
        field_mapping: mapping,
        has_header: hasHeader,
      });

      setPreviewData(response.data.preview || []);
      setPreviewErrors(response.data.errors || []);
      setTotalRows(response.data.total_rows || 0);
      setStep('preview');
      
      if (response.data.errors && response.data.errors.length > 0) {
        toast.error(`Found ${response.data.errors.length} validation errors`);
      } else {
        toast.success(`Preview ready. ${response.data.preview?.length || 0} rows validated successfully`);
      }
    } catch (error: any) {
      console.error('Error previewing import:', error);
      toast.error(error.response?.data?.message || 'Failed to preview import');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (skipErrors = false) => {
    try {
      setLoading(true);
      const mapping: Record<number, string> = {};
      Object.keys(fieldMapping).forEach(key => {
        mapping[parseInt(key)] = fieldMapping[parseInt(key)];
      });

      const response = await assetsAPI.import({
        csv_data: csvData,
        field_mapping: mapping,
        has_header: hasHeader,
        skip_errors: skipErrors,
      });

      setImportResult({
        imported: response.data.imported || 0,
        failed: response.data.failed || 0,
        errors: response.data.errors || [],
      });

      if (response.data.imported > 0) {
        toast.success(`Successfully imported ${response.data.imported} assets`);
      }
      if (response.data.failed > 0) {
        toast.error(`Failed to import ${response.data.failed} assets`);
      }

      // Refresh and redirect after a delay
      setTimeout(() => {
        router.push('/assets');
      }, 2000);
    } catch (error: any) {
      console.error('Error importing:', error);
      toast.error(error.response?.data?.message || 'Failed to import assets');
      
      if (error.response?.data?.errors) {
        setPreviewErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateFieldMapping = (csvColumn: number, assetField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [csvColumn]: assetField,
    }));
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/assets')}
            className="flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Assets</h1>
            <p className="mt-2 text-gray-600">
              Import assets from CSV file
            </p>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Upload CSV File</CardTitle>
              <CardDescription>
                Upload your CSV file with asset data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button 
                  onClick={handleDownloadTemplate}
                  variant="outline"
                  className="flex items-center"
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-sm text-gray-600 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  CSV files only
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  Select File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Field Mapping */}
        {step === 'map' && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Map CSV Columns</CardTitle>
              <CardDescription>
                Map your CSV columns to asset fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Required Fields</h3>
                <p className="text-xs text-blue-800 mb-2">
                  The following fields are mandatory and must be filled in your CSV:
                </p>
                <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
                  <li>Name</li>
                  <li>Category (must be one of: furniture, appliance, electronics, plumbing, electrical, hvac, security, other)</li>
                </ul>
                <p className="text-xs text-blue-800 mt-2">
                  Optional fields: Brand, Serial No, Status (defaults to 'working' if not provided)
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="hasHeader"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="hasHeader" className="text-sm text-gray-700">
                  CSV file has header row
                </label>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>CSV Column</TableHead>
                      <TableHead>CSV Header</TableHead>
                      <TableHead>Map To Asset Field</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvHeaders.map((header, index) => {
                      const isRequired = /\[REQUIRED\]/i.test(header);
                      const cleanHeader = header.replace(/\s*\[REQUIRED\]/i, '').trim();
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">Column {index + 1}</TableCell>
                          <TableCell>
                            {isRequired ? (
                              <span>
                                {cleanHeader} <span className="text-red-600 font-semibold">[REQUIRED]</span>
                              </span>
                            ) : (
                              cleanHeader
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={fieldMapping[index] || ''}
                              onChange={(e) => updateFieldMapping(index, e.target.value)}
                            >
                              {assetFields.map(field => (
                                <option key={field.value} value={field.value}>
                                  {field.label}
                                </option>
                              ))}
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setStep('upload')}
                >
                  Back
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={loading}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Import
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Preview */}
        {step === 'preview' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Preview & Validate</CardTitle>
                <CardDescription>
                  Review your data before importing ({totalRows} total rows)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {previewErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-red-800 mb-2">
                      Validation Errors ({previewErrors.length})
                    </h3>
                    <ul className="list-disc list-inside text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                      {previewErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {previewErrors.length > 10 && (
                        <li>... and {previewErrors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}

                {previewData.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Brand</TableHead>
                          <TableHead>Serial No</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.slice(0, 10).map((row, index) => (
                          <TableRow key={index}>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.brand || 'N/A'}</TableCell>
                            <TableCell>{row.serial_no || 'N/A'}</TableCell>
                            <TableCell>
                              <span className="text-sm capitalize">{row.category}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                row.status === 'working' 
                                  ? 'bg-green-100 text-green-800' 
                                  : row.status === 'faulty'
                                  ? 'bg-red-100 text-red-800'
                                  : row.status === 'maintenance'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {row.status || 'working'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {previewData.length > 10 && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing first 10 rows of {previewData.length} preview rows
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setStep('map')}
                    >
                      Back
                    </Button>
                  </div>
                  <div className="flex space-x-2">
                    {previewErrors.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => handleImport(true)}
                        disabled={loading}
                        className="text-orange-600"
                      >
                        Import & Skip Errors
                      </Button>
                    )}
                    <Button
                      onClick={() => handleImport(false)}
                      disabled={loading || previewErrors.length > 0}
                    >
                      {loading ? 'Importing...' : 'Import Assets'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {importResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">
                        Successfully imported: <strong>{importResult.imported}</strong> assets
                      </span>
                    </div>
                    {importResult.failed > 0 && (
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm">
                          Failed: <strong>{importResult.failed}</strong> assets
                        </span>
                      </div>
                    )}
                    {importResult.errors.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">Errors:</h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                          {importResult.errors.slice(0, 10).map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

