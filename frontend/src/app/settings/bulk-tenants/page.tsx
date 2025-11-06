'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Select } from '../../../components/UI/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/UI/Tabs';
import { 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Save, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Users,
  Copy,
  RotateCcw
} from 'lucide-react';
import { tenantsAPI, type Tenant } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';

interface TenantRow {
  id: string;
  tenant_type: 'individual' | 'company';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  national_id: string;
  nationality: string;
  gender: string;
  address: string;
  city: string;
  postal_code: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  employment_company: string;
  employment_position: string;
  employment_salary: string;
  employment_phone: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  status: string;
  notes: string;
  company_name: string;
  company_address: string;
  company_registration_number: string;
  company_gst_tin: string;
  company_telephone: string;
  company_email: string;
}

interface BulkResult {
  success: number;
  failed: number;
  skipped: number;
  tenants: Array<{ row: number; tenant?: Tenant; data?: Partial<Tenant>; status: string }>;
  errors: Array<{ row: number; data: Partial<Tenant>; error: string }>;
  skipped: Array<{ row: number; data: Partial<Tenant>; reason: string }>;
}

export default function BulkTenantsPage() {
  const [activeTab, setActiveTab] = useState('import');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importedData, setImportedData] = useState<TenantRow[]>([]);
  const [manualRows, setManualRows] = useState<TenantRow[]>([
    {
      id: Date.now().toString(),
      tenant_type: 'individual',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      national_id: '',
      nationality: '',
      gender: '',
      address: '',
      city: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      employment_company: '',
      employment_position: '',
      employment_salary: '',
      employment_phone: '',
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      status: 'active',
      notes: '',
      company_name: '',
      company_address: '',
      company_registration_number: '',
      company_gst_tin: '',
      company_telephone: '',
      company_email: ''
    }
  ]);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]> | null>(null);
  const [options, setOptions] = useState({
    skip_duplicates: false,
    skip_errors: false
  });

  const handleDownloadTemplate = async () => {
    try {
      const response = await tenantsAPI.getBulkTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bulk_tenant_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error('Failed to download template');
    }
  };

  // Improved CSV parser that handles quoted fields and commas inside fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    return result;
  };

  // Helper to parse various date formats to YYYY-MM-DD
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    const trimmed = dateStr.trim();
    
    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // Try to parse common date formats
    // Check for YYYY-MM-DD or YYYY/MM/DD format first
    const yyyyFormat = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyyFormat) {
      const year = yyyyFormat[1];
      const month = yyyyFormat[2].padStart(2, '0');
      const day = yyyyFormat[3].padStart(2, '0');
      
      // Validate the date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        if (date.getFullYear() == parseInt(year) && 
            date.getMonth() + 1 == parseInt(month) && 
            date.getDate() == parseInt(day)) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Check for MM/DD/YYYY or DD/MM/YYYY format
    const mmddyyyyFormat = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mmddyyyyFormat) {
      const first = parseInt(mmddyyyyFormat[1]);
      const second = parseInt(mmddyyyyFormat[2]);
      let month, day, year;
      
      // Heuristic: if first > 12, it's likely DD/MM/YYYY
      if (first > 12) {
        day = mmddyyyyFormat[1].padStart(2, '0');
        month = mmddyyyyFormat[2].padStart(2, '0');
        year = mmddyyyyFormat[3];
      } else if (second > 12) {
        // If second > 12, it's definitely MM/DD/YYYY
        month = mmddyyyyFormat[1].padStart(2, '0');
        day = mmddyyyyFormat[2].padStart(2, '0');
        year = mmddyyyyFormat[3];
      } else {
        // Ambiguous - try MM/DD/YYYY first (US format)
        month = mmddyyyyFormat[1].padStart(2, '0');
        day = mmddyyyyFormat[2].padStart(2, '0');
        year = mmddyyyyFormat[3];
        
        // Validate
        const date = new Date(`${year}-${month}-${day}`);
        if (isNaN(date.getTime()) || 
            date.getFullYear() != parseInt(year) || 
            date.getMonth() + 1 != parseInt(month) || 
            date.getDate() != parseInt(day)) {
          // Try DD/MM/YYYY instead
          day = mmddyyyyFormat[1].padStart(2, '0');
          month = mmddyyyyFormat[2].padStart(2, '0');
        }
      }
      
      // Validate the date
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        if (date.getFullYear() == parseInt(year) && 
            date.getMonth() + 1 == parseInt(month) && 
            date.getDate() == parseInt(day)) {
          return `${year}-${month}-${day}`;
        }
      }
    }
    
    // Try native Date parsing as fallback
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    return null; // Invalid date
  };

  const parseCSV = (text: string): TenantRow[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: TenantRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]).map(v => v.trim().replace(/^"|"$/g, ''));
      const row: Partial<TenantRow> = { id: Date.now().toString() + i };
      
      headers.forEach((header, index) => {
        const value = values[index] || '';
        (row as Record<string, string>)[header] = value;
      });

      // Parse date_of_birth if present
      let dateOfBirth = row.date_of_birth || '';
      if (dateOfBirth) {
        const originalDate = dateOfBirth;
        const parsedDate = parseDate(dateOfBirth);
        if (parsedDate) {
          dateOfBirth = parsedDate;
          if (process.env.NODE_ENV === 'development' && originalDate !== parsedDate) {
            console.log(`Date converted: "${originalDate}" -> "${parsedDate}"`);
          }
        } else {
          // If parsing failed, log it for debugging
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Could not parse date: "${dateOfBirth}"`);
          }
          // Keep original value (will be validated later and omitted if invalid)
        }
      }

      rows.push({
        id: row.id || Date.now().toString() + i,
        tenant_type: (row.tenant_type as 'individual' | 'company') || 'individual',
        first_name: row.first_name || '',
        last_name: row.last_name || '',
        email: row.email || '',
        phone: row.phone || '',
        date_of_birth: dateOfBirth,
        national_id: row.national_id || '',
        nationality: row.nationality || '',
        gender: row.gender || '',
        address: row.address || '',
        city: row.city || '',
        postal_code: row.postal_code || '',
        emergency_contact_name: row.emergency_contact_name || '',
        emergency_contact_phone: row.emergency_contact_phone || '',
        emergency_contact_relationship: row.emergency_contact_relationship || '',
        employment_company: row.employment_company || '',
        employment_position: row.employment_position || '',
        employment_salary: row.employment_salary || '',
        employment_phone: row.employment_phone || '',
        bank_name: row.bank_name || '',
        account_number: row.account_number || '',
        account_holder_name: row.account_holder_name || '',
        status: row.status || 'active',
        notes: row.notes || '',
        company_name: row.company_name || '',
        company_address: row.company_address || '',
        company_registration_number: row.company_registration_number || '',
        company_gst_tin: row.company_gst_tin || '',
        company_telephone: row.company_telephone || '',
        company_email: row.company_email || ''
      });
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          toast.error('No data found in CSV file');
          return;
        }
        setImportedData(parsed);
        toast.success(`Imported ${parsed.length} tenant(s) from CSV`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleAddRow = () => {
    setManualRows([...manualRows, {
      id: Date.now().toString(),
      tenant_type: 'individual',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      national_id: '',
      nationality: '',
      gender: '',
      address: '',
      city: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      employment_company: '',
      employment_position: '',
      employment_salary: '',
      employment_phone: '',
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      status: 'active',
      notes: '',
      company_name: '',
      company_address: '',
      company_registration_number: '',
      company_gst_tin: '',
      company_telephone: '',
      company_email: ''
    }]);
  };

  const handleRemoveRow = (id: string) => {
    setManualRows(manualRows.filter(row => row.id !== id));
  };

  const handleCopyRow = (id: string) => {
    const row = manualRows.find(r => r.id === id);
    if (row) {
      setManualRows([...manualRows, { ...row, id: Date.now().toString() }]);
    }
  };

  const handleRowChange = (id: string, field: keyof TenantRow, value: string) => {
    setManualRows(manualRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const validateAndPrepareData = (rows: TenantRow[]): { tenants: Partial<Tenant>[], errors: string[] } => {
    const tenants: Partial<Tenant>[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      // Helper function to convert empty strings to null
      const cleanValue = (value: string | null | undefined): string | null => {
        if (value === null || value === undefined) {
          return null;
        }
        // Handle empty strings and whitespace-only strings
        const trimmed = String(value).trim();
        if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
          return null;
        }
        return trimmed;
      };

      // Build tenant object - send all fields, using null for empty values
      // This ensures Laravel validation works correctly
      const tenant: Record<string, any> = {
        tenant_type: row.tenant_type || 'individual',
        status: row.status || 'active',
      };

      // Add all fields, converting empty strings to null
      const fields = [
        'first_name', 'last_name', 'email', 'phone', 'date_of_birth',
        'national_id', 'nationality', 'gender', 'address', 'city', 'postal_code',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'employment_company', 'employment_position', 'employment_phone',
        'bank_name', 'account_number', 'account_holder_name', 'notes',
        'company_name', 'company_address', 'company_registration_number',
        'company_gst_tin', 'company_telephone', 'company_email'
      ];

      fields.forEach(field => {
        let value = cleanValue((row as any)[field]);
        
        // Special handling for enum fields
        if (field === 'gender' && value) {
          // Ensure gender is one of the valid values
          const validGenders = ['male', 'female', 'other'];
          if (!validGenders.includes(value.toLowerCase())) {
            value = null; // Invalid gender, set to null
          } else {
            value = value.toLowerCase();
          }
        }
        
        // Special handling for date fields - ensure proper format or omit if null
        if (field === 'date_of_birth') {
          if (value) {
            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
              // Try to parse and reformat the date
              const parsedDate = new Date(value);
              if (!isNaN(parsedDate.getTime())) {
                // Valid date, format as YYYY-MM-DD
                const year = parsedDate.getFullYear();
                const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                const day = String(parsedDate.getDate()).padStart(2, '0');
                value = `${year}-${month}-${day}`;
                tenant[field] = value;
              }
              // Invalid date - don't include the field (Laravel nullable will handle it)
            } else {
              // Valid format, include it
              tenant[field] = value;
            }
          }
          // If value is null/empty, don't include the field (Laravel nullable will handle it)
        } else {
          // For non-date fields, only include if value is not null/empty
          // This prevents sending empty strings which can cause validation issues
          if (value !== null && value !== undefined && value !== '') {
            tenant[field] = value;
          }
        }
      });

      // Handle employment_salary separately (numeric)
      if (row.employment_salary && row.employment_salary.trim() !== '') {
        const salary = parseFloat(row.employment_salary);
        if (!isNaN(salary)) {
          tenant.employment_salary = salary;
        } else {
          tenant.employment_salary = null;
        }
      } else {
        tenant.employment_salary = null;
      }

      // Basic validation
      if (row.tenant_type === 'individual') {
        if (!row.first_name || !row.last_name) {
          errors.push(`Row ${index + 1}: First name and last name required for individual tenants`);
        }
        if (!row.email || !row.phone) {
          errors.push(`Row ${index + 1}: Email and phone required for individual tenants`);
        }
      } else if (row.tenant_type === 'company') {
        if (!row.company_name || !row.company_address || !row.company_registration_number || !row.company_telephone || !row.company_email) {
          errors.push(`Row ${index + 1}: All company fields required for company tenants`);
        }
      }

      tenants.push(tenant as Partial<Tenant>);
    });

    return { tenants, errors };
  };

  const handleSubmit = async () => {
    const data = activeTab === 'import' ? importedData : manualRows;
    
    if (data.length === 0) {
      toast.error('No tenants to create');
      return;
    }

    const { tenants, errors } = validateAndPrepareData(data);
    
    if (errors.length > 0 && !options.skip_errors) {
      toast.error(`Validation errors found:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tenants,
        options: {
          skip_duplicates: options.skip_duplicates,
          skip_errors: options.skip_errors
        }
      };
      
      // Debug log (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('Bulk create payload:', JSON.stringify(payload, null, 2));
      }
      
      const response = await tenantsAPI.bulkCreate(payload);

      setResult(response.data);
      toast.success(`Created ${response.data.success} tenant(s) successfully`);
      
      if (response.data.failed > 0) {
        toast.error(`${response.data.failed} tenant(s) failed to create`);
      }
      if (response.data.skipped > 0) {
        toast(`Skipped ${response.data.skipped} tenant(s)`, { icon: '⚠️' });
      }

      // Clear data after successful creation
      if (activeTab === 'import') {
        setImportedData([]);
        setFile(null);
      } else {
        setManualRows([{
          id: Date.now().toString(),
          tenant_type: 'individual',
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          national_id: '',
          nationality: '',
          gender: '',
          address: '',
          city: '',
          postal_code: '',
          emergency_contact_name: '',
          emergency_contact_phone: '',
          emergency_contact_relationship: '',
          employment_company: '',
          employment_position: '',
          employment_salary: '',
          employment_phone: '',
          bank_name: '',
          account_number: '',
          account_holder_name: '',
          status: 'active',
          notes: '',
          company_name: '',
          company_address: '',
          company_registration_number: '',
          company_gst_tin: '',
          company_telephone: '',
          company_email: ''
        }]);
      }
    } catch (error: any) {
      console.error('Error creating tenants:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      // Show detailed validation errors if available
      if (error.response?.data?.errors) {
        const validationErrorsData = error.response.data.errors;
        setValidationErrors(validationErrorsData);
        
        let errorMessage = 'Validation failed:\n';
        
        // Format Laravel validation errors (MessageBag format)
        if (typeof validationErrorsData === 'object') {
          const errorList: string[] = [];
          
          // Handle Laravel's MessageBag format
          Object.keys(validationErrorsData).forEach(key => {
            const messages = Array.isArray(validationErrorsData[key]) 
              ? validationErrorsData[key] 
              : [validationErrorsData[key]];
            messages.forEach((msg: string) => {
              // Format: "tenants.0.email" -> "Row 1, Email field"
              const fieldMatch = key.match(/tenants\.(\d+)\.(.+)/);
              if (fieldMatch) {
                const rowNum = parseInt(fieldMatch[1]) + 1;
                const fieldName = fieldMatch[2].replace(/_/g, ' ');
                errorList.push(`Row ${rowNum}, ${fieldName}: ${msg}`);
              } else {
                errorList.push(`${key}: ${msg}`);
              }
            });
          });
          
          errorMessage += errorList.slice(0, 10).join('\n');
          if (errorList.length > 10) {
            errorMessage += `\n... and ${errorList.length - 10} more errors`;
          }
        } else {
          errorMessage += JSON.stringify(validationErrorsData, null, 2);
        }
        
        toast.error(errorMessage, { duration: 10000 });
        
        // Convert Laravel validation errors to our format
        const formattedErrors = Object.keys(validationErrorsData).map((key, index) => {
          const fieldMatch = key.match(/tenants\.(\d+)\.(.+)/);
          const rowNum = fieldMatch ? parseInt(fieldMatch[1]) + 1 : index + 1;
          const messages = Array.isArray(validationErrorsData[key])
            ? validationErrorsData[key]
            : [validationErrorsData[key]];
          return {
            row: rowNum,
            data: {},
            error: messages.join(', ')
          };
        });
        
        setResult({
          success: 0,
          failed: formattedErrors.length,
          skipped: 0,
          tenants: [],
          errors: formattedErrors,
          skipped: []
        });
      } else {
        // No validation errors, show general error
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create tenants';
        toast.error(errorMessage);
        
        // Try to show the full error response
        if (error.response?.data) {
          console.error('Full error response data:', JSON.stringify(error.response.data, null, 2));
          toast.error(`Error: ${JSON.stringify(error.response.data)}`, { duration: 15000 });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    // Clear all data and reset to initial state
    setImportedData([]);
    setFile(null);
    setManualRows([{
      id: Date.now().toString(),
      tenant_type: 'individual',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      national_id: '',
      nationality: '',
      gender: '',
      address: '',
      city: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      employment_company: '',
      employment_position: '',
      employment_salary: '',
      employment_phone: '',
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      status: 'active',
      notes: '',
      company_name: '',
      company_address: '',
      company_registration_number: '',
      company_gst_tin: '',
      company_telephone: '',
      company_email: ''
    }]);
    setResult(null);
    setValidationErrors(null);
    setOptions({
      skip_duplicates: false,
      skip_errors: false
    });
    // Reset file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast.success('All data cleared. Ready for new upload.');
  };

  const handleClearImport = () => {
    setImportedData([]);
    setFile(null);
    setResult(null);
    setValidationErrors(null);
    // Reset file input
    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    toast.success('Import data cleared.');
  };

  const handleClearManual = () => {
    setManualRows([{
      id: Date.now().toString(),
      tenant_type: 'individual',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      national_id: '',
      nationality: '',
      gender: '',
      address: '',
      city: '',
      postal_code: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      employment_company: '',
      employment_position: '',
      employment_salary: '',
      employment_phone: '',
      bank_name: '',
      account_number: '',
      account_holder_name: '',
      status: 'active',
      notes: '',
      company_name: '',
      company_address: '',
      company_registration_number: '',
      company_gst_tin: '',
      company_telephone: '',
      company_email: ''
    }]);
    setResult(null);
    setValidationErrors(null);
    toast.success('Manual entry cleared.');
  };

  const handleValidate = async () => {
    const data = activeTab === 'import' ? importedData : manualRows;
    
    if (data.length === 0) {
      toast.error('No tenants to validate');
      return;
    }

    const { tenants } = validateAndPrepareData(data);
    
    setValidating(true);
    try {
      const response = await tenantsAPI.bulkCreate({
        tenants,
        options: {
          validate_only: true,
          skip_duplicates: options.skip_duplicates,
          skip_errors: options.skip_errors
        }
      });

      setResult(response.data);
      toast.success(`Validation complete: ${response.data.success} valid tenant(s)`);
      
      if (response.data.failed > 0) {
        toast.error(`${response.data.failed} tenant(s) have errors`);
      }
    } catch (error: any) {
      console.error('Error validating tenants:', error);
      
      // Show detailed validation errors if available
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        let errorMessage = 'Validation failed:\n';
        
        if (typeof validationErrors === 'object') {
          const errorList: string[] = [];
          Object.keys(validationErrors).forEach(key => {
            const messages = Array.isArray(validationErrors[key]) 
              ? validationErrors[key] 
              : [validationErrors[key]];
            messages.forEach((msg: string) => {
              errorList.push(`${key}: ${msg}`);
            });
          });
          errorMessage += errorList.slice(0, 5).join('\n');
          if (errorList.length > 5) {
            errorMessage += `\n... and ${errorList.length - 5} more errors`;
          }
        }
        
        toast.error(errorMessage, { duration: 8000 });
      } else {
        toast.error(error.response?.data?.message || 'Failed to validate tenants');
      }
      
      if (error.response?.data) {
        setResult(error.response.data);
      }
    } finally {
      setValidating(false);
    }
  };

  const displayData = activeTab === 'import' ? importedData : manualRows;

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-8 w-8" />
              Bulk Tenant Creation
            </h1>
            <p className="mt-2 text-gray-600">
              Create multiple tenants at once for pre-installations. Tenants can be assigned to rental units later.
            </p>
          </div>
          {(importedData.length > 0 || manualRows.length > 1 || result || validationErrors) && (
            <Button
              variant="outline"
              onClick={handleClearAll}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              CSV Import
            </TabsTrigger>
            <TabsTrigger value="manual">
              <FileText className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Import from CSV</CardTitle>
                <CardDescription>Upload a CSV file with tenant data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Template
                  </Button>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="csv-file-input"
                    />
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-2"
                      onClick={() => document.getElementById('csv-file-input')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Upload CSV
                    </Button>
                  </div>
                  {file && (
                    <>
                      <span className="text-sm text-gray-600">{file.name}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearImport}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                      >
                        <XCircle className="h-4 w-4" />
                        Clear
                      </Button>
                    </>
                  )}
                </div>

                {importedData.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Imported {importedData.length} tenant(s)
                    </p>
                    <div className="max-h-96 overflow-y-auto border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200 text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-2 text-left">Type</th>
                            <th className="px-2 py-2 text-left">Name</th>
                            <th className="px-2 py-2 text-left">Email</th>
                            <th className="px-2 py-2 text-left">Phone</th>
                            <th className="px-2 py-2 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {importedData.map((row, index) => (
                            <tr key={index}>
                              <td className="px-2 py-2">{row.tenant_type}</td>
                              <td className="px-2 py-2">
                                {row.tenant_type === 'individual' 
                                  ? `${row.first_name} ${row.last_name}`.trim()
                                  : row.company_name}
                              </td>
                              <td className="px-2 py-2">{row.email || row.company_email}</td>
                              <td className="px-2 py-2">{row.phone || row.company_telephone}</td>
                              <td className="px-2 py-2">{row.status || 'active'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
                <CardDescription>Enter tenant data manually in the table below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4 gap-2">
                  {manualRows.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearManual}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <XCircle className="h-4 w-4" />
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">First Name*</th>
                        <th className="px-3 py-2 text-left">Last Name*</th>
                        <th className="px-3 py-2 text-left">Email*</th>
                        <th className="px-3 py-2 text-left">Phone*</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {manualRows.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <Select
                              value={row.tenant_type}
                              onChange={(e) => handleRowChange(row.id, 'tenant_type', e.target.value)}
                              className="text-xs"
                            >
                              <option value="individual">Individual</option>
                              <option value="company">Company</option>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.first_name}
                              onChange={(e) => handleRowChange(row.id, 'first_name', e.target.value)}
                              placeholder="First Name"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.last_name}
                              onChange={(e) => handleRowChange(row.id, 'last_name', e.target.value)}
                              placeholder="Last Name"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="email"
                              value={row.email}
                              onChange={(e) => handleRowChange(row.id, 'email', e.target.value)}
                              placeholder="Email"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={row.phone}
                              onChange={(e) => handleRowChange(row.id, 'phone', e.target.value)}
                              placeholder="Phone"
                              className="text-xs"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={row.status}
                              onChange={(e) => handleRowChange(row.id, 'status', e.target.value)}
                              className="text-xs"
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                              <option value="suspended">Suspended</option>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyRow(row.id)}
                                className="h-7 w-7 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRow(row.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {displayData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.skip_duplicates}
                    onChange={(e) => setOptions({ ...options, skip_duplicates: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Skip duplicates (don't create if email/phone exists)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.skip_errors}
                    onChange={(e) => setOptions({ ...options, skip_errors: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Skip errors (continue on validation errors)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleValidate}
                  disabled={validating || loading}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {validating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      Validating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Validate Only
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || validating}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Tenants ({displayData.length})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {validationErrors && (
          <Card className="border-red-300 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-700">Validation Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.keys(validationErrors).map((key) => {
                  const messages = Array.isArray(validationErrors[key])
                    ? validationErrors[key]
                    : [validationErrors[key]];
                  const fieldMatch = key.match(/tenants\.(\d+)\.(.+)/);
                  const rowNum = fieldMatch ? parseInt(fieldMatch[1]) + 1 : '?';
                  const fieldName = fieldMatch ? fieldMatch[2].replace(/_/g, ' ') : key;
                  
                  return (
                    <div key={key} className="p-3 bg-white rounded border border-red-200">
                      <div className="font-semibold text-red-800">
                        Row {rowNum} - {fieldName}:
                      </div>
                      {messages.map((msg, idx) => (
                        <div key={idx} className="text-sm text-red-700 mt-1">
                          {msg}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">Success</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700 mt-1">{result.success}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <XCircle className="h-5 w-5" />
                    <span className="font-semibold">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700 mt-1">{result.failed}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Skipped</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-700 mt-1">{result.skipped}</p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Errors ({result.errors.length}):</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-red-50">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700 mb-2 p-2 bg-white rounded border border-red-200">
                        <div className="font-semibold">Row {error.row}:</div>
                        <div className="mt-1">{error.error}</div>
                        {error.data && (
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-red-600 hover:text-red-800">View data</summary>
                            <pre className="mt-1 p-2 bg-gray-50 rounded overflow-auto max-h-32">
                              {JSON.stringify(error.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.skipped && result.skipped.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Skipped:</h4>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-yellow-50">
                    {result.skipped.map((skip, index) => (
                      <div key={index} className="text-sm text-yellow-700 mb-2">
                        <strong>Row {skip.row}:</strong> {skip.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

