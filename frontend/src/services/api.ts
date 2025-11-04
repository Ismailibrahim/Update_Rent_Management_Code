import axios, { AxiosInstance, AxiosError } from 'axios';

// API base URL - must be set in environment variables
// For development, set NEXT_PUBLIC_API_URL in .env.local
// For production, set NEXT_PUBLIC_API_URL in your deployment environment
function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000/api';
  }
  
  // Log warning if running in production without API URL
  if (typeof window !== 'undefined') {
    console.warn('NEXT_PUBLIC_API_URL is not set. Using fallback. This may cause API requests to fail.');
    console.warn('Current environment:', process.env.NODE_ENV);
    console.warn('Window location:', window.location.href);
  }
  
  // Try to infer from current host (for production deployments)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    // Try common backend ports
    const possiblePorts = ['8000', '8080', '80'];
    // Default to port 8000
    return `${protocol}//${host}:8000/api`;
  }
  
  throw new Error('NEXT_PUBLIC_API_URL environment variable is required in production');
}

const API_BASE_URL = getApiBaseUrl();

// Log API configuration (only in development or if explicitly enabled)
if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_API === 'true')) {
  console.log('API Configuration:', {
    baseURL: API_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'Not set'
  });
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased to 30 seconds for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: unknown) => {
    // Enhanced error logging for debugging
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_API === 'true') {
      const axiosError = error as AxiosError;
      // Only log if it's an actual error (not a normal rejection)
      if (axiosError.response || axiosError.request) {
        // eslint-disable-next-line no-console
        // @ts-ignore - console.error is intentionally used for debugging
        console.error('API Error:', {
          message: axiosError.message,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url,
          baseURL: axiosError.config?.baseURL,
          method: axiosError.config?.method,
          hasToken: !!axiosError.config?.headers?.Authorization
        });
      }
    }
    
    const axiosError = error as AxiosError;
    
    if (axiosError.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (axiosError.response?.status === 429) {
      console.warn('Rate limit exceeded. Please wait before making more requests.');
    } else if (!axiosError.response) {
      // Network error - backend not reachable
      console.error('Network Error: Unable to reach backend API', {
        baseURL: API_BASE_URL,
        url: axiosError.config?.url,
        message: axiosError.message
      });
    }
    
    return Promise.reject(error);
  }
);

// Types
interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role_id?: number;
  legacy_role?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  legacy_role: string;
  is_active: boolean;
}

interface Property {
  id: number;
  name: string;
  type: string;
  street: string;
  city: string;
  island: string;
  postal_code?: string;
  country: string;
  number_of_floors: number;
  number_of_rental_units: number;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  year_built?: number;
  description?: string;
  status: string;
  assigned_manager_id?: number;
}

interface RentalUnitType {
  id: number;
  name: string;
  description?: string;
  category?: 'property' | 'unit';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RentalUnit {
  id: number;
  property_id: number;
  unit_number: string;
  unit_type: string;
  floor_number: number;
  // New separate columns
  rent_amount: number;
  deposit_amount?: number;
  currency: string;
  number_of_rooms: number;
  number_of_toilets: number;
  square_feet?: number;
  // Utility meter information
  water_meter_number?: string;
  water_billing_account?: string;
  electricity_meter_number?: string;
  electricity_billing_account?: string;
  // Access card numbers
  access_card_numbers?: string;
  status: string;
  tenant_id?: number;
  move_in_date?: string;
  lease_end_date?: string;
  amenities?: string[];
  photos?: string[];
  notes?: string;
  is_active?: boolean;
  property?: {
    id: number;
    name: string;
    address: string;
  };
}

export interface Tenant {
  id: number;
  // Tenant type
  tenant_type?: 'individual' | 'company';
  // New separate columns
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  national_id?: string;
  nationality?: string;
  gender?: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  postal_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  employment_company?: string;
  employment_position?: string;
  employment_salary?: number;
  employment_phone?: string;
  bank_name?: string;
  account_number?: string;
  account_holder_name?: string;
  documents?: string[] | string;
  status: string;
  notes?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  rental_unit_ids?: number[];
  // Company-specific fields
  company_name?: string;
  company_address?: string;
  company_registration_number?: string;
  company_gst_tin?: string;
  company_telephone?: string;
  company_email?: string;
  created_at: string;
  updated_at: string;
  // Computed properties
  full_name?: string;
}


interface Asset {
  id: number;
  name: string;
  brand?: string;
  serial_no?: string;
  category: string;
  status: string;
  maintenance_notes?: string;
  created_at: string;
  updated_at: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_base: boolean;
  is_active: boolean;
  decimal_places: number;
  thousands_separator: string;
  decimal_separator: string;
}

export interface PaymentType {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  is_recurring: boolean;
  requires_approval: boolean;
  settings?: Record<string, unknown>;
}

export interface PaymentMode {
  id: number;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  requires_reference: boolean;
  settings?: Record<string, unknown>;
}

interface PaymentRecord {
  id: number;
  payment_id: number;
  tenant_id: number;
  property_id: number;
  rental_unit_id?: number;
  payment_type_id: number;
  payment_mode_id: number;
  currency_id: number;
  amount: number;
  exchange_rate: number;
  amount_in_base_currency: number;
  payment_date: string;
  due_date?: string;
  reference_number?: string;
  description?: string;
  status: string;
  processed_by?: string;
  processed_at?: string;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  property_id: number;
  rental_unit_id?: number;
  tenant_id?: number;
  priority: string;
  status: string;
  request_date: string;
  scheduled_date?: string;
  completed_date?: string;
  assigned_to?: string;
  estimated_cost?: number;
  actual_cost?: number;
  property?: {
    name: string;
  };
  rentalUnit?: {
    unit_number: string;
  };
  tenant?: {
    name: string;
  };
  created_at: string;
  updated_at: string;
}

// Auth API
export const authAPI = {
  login: (data: LoginData) => api.post('/auth/login', data),
  register: (data: RegisterData) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (profileData: Partial<User>) => api.post('/auth/update-profile', profileData),
  changePassword: (currentPassword: string, newPassword: string) => 
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword }),
};

// Properties API
export const propertiesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/properties', { params }),
  getById: (id: number) => api.get(`/properties/${id}`),
  create: (propertyData: Partial<Property>) => api.post('/properties', propertyData),
  update: (id: number, propertyData: Partial<Property>) => api.put(`/properties/${id}`, propertyData),
  delete: (id: number) => api.delete(`/properties/${id}`),
  getCapacity: (id: number) => api.get(`/properties/${id}/capacity`),
  getImportTemplate: () => api.get('/properties/import/template'),
  previewImport: (data: { csv_data: string; field_mapping: Record<number, string>; has_header: boolean }) => 
    api.post('/properties/import/preview', data),
  import: (data: { csv_data: string; field_mapping: Record<number, string>; has_header: boolean; skip_errors: boolean }) => 
    api.post('/properties/import', data),
};

// Tenants API
export const tenantsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/tenants', { params }),
  getById: (id: number) => api.get(`/tenants/${id}`),
  create: (tenantData: Partial<Tenant>, files?: File[]) => {
    const formData = new FormData();
    
    // Add tenant data as separate fields
    Object.keys(tenantData).forEach(key => {
      if (key !== 'rental_unit_ids' && tenantData[key as keyof Tenant] !== undefined && tenantData[key as keyof Tenant] !== null) {
        formData.append(key, String(tenantData[key as keyof Tenant]));
      }
    });
    
    // Add rental unit IDs
    if (tenantData.rental_unit_ids) {
      tenantData.rental_unit_ids.forEach(id => {
        formData.append('rental_unit_ids[]', String(id));
      });
    }
    
    // Add files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files[]', file);
      });
    }
    
    return api.post('/tenants', formData, {
      headers: {
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      transformRequest: [(data) => data], // Prevent axios from transforming FormData
    });
  },
  update: (id: number, tenantData: Partial<Tenant>, files?: File[]) => {
    console.log('API update called with:', { id, tenantData, files });
    const formData = new FormData();
    
    // Add tenant data as separate fields
    Object.keys(tenantData).forEach(key => {
      if (key !== 'rental_unit_ids' && tenantData[key as keyof Tenant] !== undefined && tenantData[key as keyof Tenant] !== null) {
        formData.append(key, String(tenantData[key as keyof Tenant]));
      }
    });
    
    // Add rental unit IDs
    if (tenantData.rental_unit_ids) {
      tenantData.rental_unit_ids.forEach(id => {
        formData.append('rental_unit_ids[]', String(id));
      });
    }
    
    // Add files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files[]', file);
      });
    }
    
    // Debug FormData contents
    console.log('FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    return api.post(`/tenants/${id}/update`, formData, {
      headers: {
        // Don't set Content-Type for FormData - let browser set it with boundary
      },
      transformRequest: [(data) => data], // Prevent axios from transforming FormData
    });
  },
  delete: (id: number) => api.delete(`/tenants/${id}`),
};

// Assets API
export const assetsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/assets', { params }),
  getById: (id: number) => api.get(`/assets/${id}`),
  create: (data: Partial<Asset>) => api.post('/assets', data),
  update: (id: number, data: Partial<Asset>) => api.put(`/assets/${id}`, data),
  updateStatus: (id: number, data: { status: string; maintenance_notes?: string; quantity?: number }) => api.patch(`/assets/${id}/status`, data),
  delete: (id: number) => api.delete(`/assets/${id}`),
  getImportTemplate: () => api.get('/assets/import/template'),
  previewImport: (data: { csv_data: string; field_mapping: Record<number, string>; has_header: boolean }) => 
    api.post('/assets/import/preview', data),
  import: (data: { csv_data: string; field_mapping: Record<number, string>; has_header: boolean; skip_errors: boolean }) => 
    api.post('/assets/import', data),
};

        // Rental Units API
        export const rentalUnitsAPI = {
          getAll: (params?: Record<string, unknown>) => api.get('/rental-units', { params }),
          getById: (id: number) => api.get(`/rental-units/${id}`),
          create: (unitData: Partial<RentalUnit>) => api.post('/rental-units', unitData),
          update: (id: number, unitData: Partial<RentalUnit>) => api.put(`/rental-units/${id}`, unitData),
          delete: (id: number) => api.delete(`/rental-units/${id}`),
          getByProperty: (propertyId: number) => api.get(`/rental-units/property/${propertyId}`),
          addAssets: (unitId: number, assets: Array<{asset_id: number, quantity: number}>) => api.post(`/rental-units/${unitId}/assets`, { assets }),
          removeAsset: (unitId: number, assetId: number) => api.delete(`/rental-units/${unitId}/assets/${assetId}`),
          getAssets: (unitId: number) => api.get(`/rental-units/${unitId}/assets`),
          updateAssetStatus: (unitId: number, assetId: number, data: { status: string; maintenance_notes?: string; quantity?: number }) => api.patch(`/rental-units/${unitId}/assets/${assetId}/status`, data),
          getMaintenanceAssets: () => api.get('/rental-units/maintenance-assets'),
        };

// Settings API
export const currenciesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/currencies', { params }),
  getById: (id: number) => api.get(`/currencies/${id}`),
  create: (currencyData: Partial<Currency>) => api.post('/currencies', currencyData),
  update: (id: number, currencyData: Partial<Currency>) => api.put(`/currencies/${id}`, currencyData),
  delete: (id: number) => api.delete(`/currencies/${id}`),
  getBase: () => api.get('/currencies/base'),
  convert: (amount: number, fromCurrency: string, toCurrency: string) => 
    api.post('/currencies/convert', { amount, from_currency: fromCurrency, to_currency: toCurrency }),
};

export const usersAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (userData: Partial<User>) => api.post('/users', userData),
  update: (id: number, userData: Partial<User>) => api.put(`/users/${id}`, userData),
  delete: (id: number) => api.delete(`/users/${id}`),
};

export const paymentTypesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/payment-types', { params }),
  getById: (id: number) => api.get(`/payment-types/${id}`),
  create: (typeData: Partial<PaymentType>) => api.post('/payment-types', typeData),
  update: (id: number, typeData: Partial<PaymentType>) => api.put(`/payment-types/${id}`, typeData),
  delete: (id: number) => api.delete(`/payment-types/${id}`),
};

export const paymentModesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/payment-modes', { params }),
  getById: (id: number) => api.get(`/payment-modes/${id}`),
  create: (modeData: Partial<PaymentMode>) => api.post('/payment-modes', modeData),
  update: (id: number, modeData: Partial<PaymentMode>) => api.put(`/payment-modes/${id}`, modeData),
  delete: (id: number) => api.delete(`/payment-modes/${id}`),
};

export const paymentRecordsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/payment-records', { params }),
  getById: (id: number) => api.get(`/payment-records/${id}`),
  create: (recordData: Partial<PaymentRecord>) => api.post('/payment-records', recordData),
  update: (id: number, recordData: Partial<PaymentRecord>) => api.put(`/payment-records/${id}`, recordData),
  delete: (id: number) => api.delete(`/payment-records/${id}`),
};

export const maintenanceAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/maintenance', { params }),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (requestData: Partial<MaintenanceRequest>) => api.post('/maintenance', requestData),
  update: (id: number, requestData: Partial<MaintenanceRequest>) => api.put(`/maintenance/${id}`, requestData),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
};

export interface MaintenanceCost {
  id: number;
  rental_unit_asset_id: number;
  maintenance_request_id?: number;
  repair_cost: number;
  currency: string;
  description?: string;
  attached_bills?: string[];
  repair_date?: string;
  repair_provider?: string;
  status: string;
  notes?: string;
  rental_unit_asset?: {
    id: number;
    asset: {
      id: number;
      name: string;
      brand?: string;
      category: string;
    };
    rental_unit: {
      id: number;
      unit_number: string;
      property: {
        id: number;
        name: string;
      };
    };
  };
  created_at: string;
  updated_at: string;
}

export interface RentInvoice {
  id: number;
  tenant_id: number;
  rental_unit_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  late_fee?: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  payment_notes?: string;
  payment_bank?: string;
  payment_account?: string;
  payment_slip_paths?: string[];
  payment_slip_files?: string;
  payment_details?: {
    payment_method?: string;
    payment_reference?: string;
    payment_notes?: string;
    payment_bank?: string;
    payment_account?: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
  };
  rental_unit?: {
    id: number;
    unit_number: string;
    property?: {
      id: number;
      name: string;
    };
  };
  property?: {
    id: number;
    name: string;
  };
}

export interface TenantLedger {
  ledger_id: number;
  tenant_id: number;
  payment_type_id: number;
  transaction_date: string;
  description: string;
  reference_no?: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  payment_method?: string;
  transfer_reference_no?: string;
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  tenant?: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    rentalUnits?: RentalUnit[];
  };
  payment_type?: {
    id: number;
    name: string;
    description?: string;
  };
  rental_unit?: {
    unit_number: string;
    property?: {
      name: string;
    };
  };
}

export const maintenanceCostsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/maintenance-costs', { params }),
  getById: (id: number) => api.get(`/maintenance-costs/${id}`),
  delete: (id: number) => api.delete(`/maintenance-costs/${id}`),
  create: (data: Partial<MaintenanceCost>, files?: File[]) => {
    const formData = new FormData();
    
    // Add maintenance cost data
    formData.append('rental_unit_asset_id', data.rental_unit_asset_id?.toString() || '');
    formData.append('repair_cost', data.repair_cost?.toString() || '');
    formData.append('currency', data.currency || 'USD');
    formData.append('description', data.description || '');
    formData.append('repair_date', data.repair_date || '');
    formData.append('repair_provider', data.repair_provider || '');
    formData.append('notes', data.notes || '');
    
    // Add files
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('bills[]', file);
      });
    }
    
    return api.post('/maintenance-costs', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  update: (id: number, data: Partial<MaintenanceCost>, files?: File[]) => {
    console.log('🔍 API DEBUG: Update data received:', data);
    console.log('🔍 API DEBUG: Files received:', files);
    
    // If there are files, use FormData, otherwise use JSON
    if (files && files.length > 0) {
      const formData = new FormData();
      
      // Add maintenance cost data
      if (data.repair_cost !== undefined) {
        console.log('🔍 API DEBUG: Adding repair_cost:', data.repair_cost);
        formData.append('repair_cost', data.repair_cost.toString());
      }
      if (data.currency) {
        console.log('🔍 API DEBUG: Adding currency:', data.currency);
        formData.append('currency', data.currency);
      }
      if (data.description) {
        console.log('🔍 API DEBUG: Adding description:', data.description);
        formData.append('description', data.description);
      }
      if (data.repair_date) {
        console.log('🔍 API DEBUG: Adding repair_date:', data.repair_date);
        formData.append('repair_date', data.repair_date);
      }
      if (data.repair_provider) {
        console.log('🔍 API DEBUG: Adding repair_provider:', data.repair_provider);
        formData.append('repair_provider', data.repair_provider);
      }
      if (data.status) {
        console.log('🔍 API DEBUG: Adding status:', data.status);
        formData.append('status', data.status);
      }
      if (data.notes) {
        console.log('🔍 API DEBUG: Adding notes:', data.notes);
        formData.append('notes', data.notes);
      }
      
      // Add files
      files.forEach(file => {
        console.log('🔍 API DEBUG: Adding file:', file.name);
        formData.append('bills[]', file);
      });
      
      console.log('🔍 API DEBUG: FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }
      
      return api.put(`/maintenance-costs/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } else {
      // No files, use JSON
      console.log('🔍 API DEBUG: Using JSON for update (no files)');
      return api.put(`/maintenance-costs/${id}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  },
  getByRentalUnitAsset: (rentalUnitAssetId: number) => api.get(`/maintenance-costs/rental-unit-asset/${rentalUnitAssetId}`),
};

export const rentInvoicesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/rent-invoices', { params }),
  getById: (id: number) => api.get(`/rent-invoices/${id}`),
  create: (data: Record<string, unknown>) => api.post('/rent-invoices', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/rent-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/rent-invoices/${id}`),
  generateMonthly: (data: { month: number; year: number; due_date_offset?: number }) => 
    api.post('/rent-invoices/generate-monthly', data),
  markAsPaid: (id: number, data?: Record<string, unknown> | FormData) => {
    return api.post(`/rent-invoices/${id}/mark-paid`, data);
  },
  getStatistics: () => api.get('/rent-invoices/statistics'),
};

export const settingsAPI = {
  getDropdowns: () => api.get('/settings/dropdowns'),
};

export const rentalUnitTypesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/rental-unit-types', { params }),
  getById: (id: number) => api.get(`/rental-unit-types/${id}`),
  getPropertyTypes: (params?: Record<string, unknown>) => api.get('/rental-unit-types', { params: { ...params, category: 'property' } }),
  getUnitTypes: (params?: Record<string, unknown>) => api.get('/rental-unit-types', { params: { ...params, category: 'unit' } }),
  create: (data: Partial<RentalUnitType>) => api.post('/rental-unit-types', data),
  update: (id: number, data: Partial<RentalUnitType>) => api.put(`/rental-unit-types/${id}`, data),
  delete: (id: number) => api.delete(`/rental-unit-types/${id}`),
};

export const dashboardAPI = {
  getStatistics: () => api.get('/dashboard/statistics'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

export const tenantLedgerAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/tenant-ledgers', { params }),
  getById: (id: number) => api.get(`/tenant-ledgers/${id}`),
  create: (data: Partial<TenantLedger>) => api.post('/tenant-ledgers', data),
  update: (id: number, data: Partial<TenantLedger>) => api.put(`/tenant-ledgers/${id}`, data),
  delete: (id: number) => api.delete(`/tenant-ledgers/${id}`),
  getTenantBalance: (tenantId: number) => api.get(`/tenant-ledgers/tenant/${tenantId}/balance`),
  getTenantSummary: (tenantId: number, params?: Record<string, unknown>) => api.get(`/tenant-ledgers/tenant/${tenantId}/summary`, { params }),
  getAllTenantBalances: (params?: Record<string, unknown>) => api.get('/tenant-ledgers/balances/all', { params }),
};

export interface Island {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const islandsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/islands', { params }),
  getById: (id: number) => api.get(`/islands/${id}`),
  create: (data: Partial<Island>) => api.post('/islands', data),
  update: (id: number, data: Partial<Island>) => api.put(`/islands/${id}`, data),
  delete: (id: number) => api.delete(`/islands/${id}`),
};

export const maintenanceRequestsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/maintenance', { params }),
  getById: (id: number) => api.get(`/maintenance/${id}`),
  create: (data: Partial<MaintenanceRequest>) => api.post('/maintenance', data),
  update: (id: number, data: Partial<MaintenanceRequest>) => api.put(`/maintenance/${id}`, data),
  delete: (id: number) => api.delete(`/maintenance/${id}`),
};

export interface RentalUnitAsset {
  id: number;
  rental_unit_id: number;
  asset_id: number;
  quantity: number;
  status: string;
  asset?: {
    id: number;
    name: string;
    brand?: string;
    category: string;
  };
  rental_unit?: RentalUnit;
}

export interface MaintenanceInvoice {
  id: number;
  invoice_number: string;
  maintenance_cost_id: number;
  tenant_id: number;
  property_id: number;
  rental_unit_id: number;
  rental_unit_asset_id: number;
  invoice_date: string;
  due_date: string;
  maintenance_amount: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paid_date?: string;
  description?: string;
  notes?: string;
  repair_provider?: string;
  repair_date?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  property?: Property;
  rental_unit?: RentalUnit;
  rental_unit_asset?: RentalUnitAsset;
  maintenance_cost?: MaintenanceCost;
}

export const maintenanceInvoicesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/maintenance-invoices', { params }),
  getById: (id: number) => api.get(`/maintenance-invoices/${id}`),
  update: (id: number, data: Partial<MaintenanceInvoice>) => api.put(`/maintenance-invoices/${id}`, data),
  delete: (id: number) => api.delete(`/maintenance-invoices/${id}`),
};

// SMS Interfaces
export interface SmsTemplate {
  id: number;
  name: string;
  type: 'rent_reminder' | 'payment_confirmation' | 'lease_expiry' | 'custom';
  content: string;
  variables?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmsSetting {
  id: number;
  setting_key: string;
  setting_value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmsLog {
  id: number;
  tenant_id?: number;
  rental_unit_id?: number;
  template_id?: number;
  phone_number: string;
  message_content: string;
  status: 'pending' | 'sent' | 'failed';
  api_response?: Record<string, unknown>;
  error_message?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
  rental_unit?: RentalUnit;
  template?: SmsTemplate;
}

// SMS APIs
export const smsTemplatesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/sms-templates', { params }),
  getById: (id: number) => api.get(`/sms-templates/${id}`),
  create: (data: Partial<SmsTemplate>) => api.post('/sms-templates', data),
  update: (id: number, data: Partial<SmsTemplate>) => api.put(`/sms-templates/${id}`, data),
  delete: (id: number) => api.delete(`/sms-templates/${id}`),
};

export const smsSettingsAPI = {
  getAll: () => api.get('/sms-settings'),
  update: (settings: Array<{ key: string; value: string; description?: string }>) => 
    api.post('/sms-settings', { settings }),
  getByKey: (key: string) => api.get(`/sms-settings/${key}`),
};

export const smsLogsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/sms-logs', { params }),
  getById: (id: number) => api.get(`/sms-logs/${id}`),
};

export const smsNotificationsAPI = {
  sendManual: (data: {
    tenant_ids: number[];
    template_id?: number;
    message?: string;
    custom_data?: Record<string, unknown>;
  }) => api.post('/sms-notifications/send', data),
  previewTemplate: (data: {
    template_id: number;
    tenant_id?: number;
    custom_data?: Record<string, unknown>;
  }) => api.post('/sms-notifications/preview', data),
  testConnection: () => api.get('/sms-notifications/test-connection'),
};

export interface InvoiceTemplate {
  id: number;
  name: string;
  description?: string;
  type: 'rent' | 'maintenance' | 'both';
  template_data: Record<string, unknown>;
  html_content?: string;
  styles?: Record<string, unknown>;
  logo_path?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const invoiceTemplatesAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/invoice-templates', { params }),
  getById: (id: number) => api.get(`/invoice-templates/${id}`),
  create: (data: Partial<InvoiceTemplate>) => api.post('/invoice-templates', data),
  update: (id: number, data: Partial<InvoiceTemplate>) => api.put(`/invoice-templates/${id}`, data),
  delete: (id: number) => api.delete(`/invoice-templates/${id}`),
  setDefault: (id: number) => api.post(`/invoice-templates/${id}/set-default`),
  duplicate: (id: number) => api.post(`/invoice-templates/${id}/duplicate`),
};

// Email Reminder Interfaces
export interface EmailSetting {
  id?: number;
  provider: 'smtp' | 'office365';
  host?: string;
  port: number;
  encryption: 'tls' | 'ssl' | 'none';
  username: string;
  password?: string;
  from_address: string;
  from_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReminderConfiguration {
  id?: number;
  reminder_type: 'rent_due' | 'rent_overdue' | 'payment_due' | 'payment_overdue' | 'maintenance_due' | 'maintenance_overdue';
  timing_type: 'before' | 'on_date' | 'after';
  days_offset: number;
  frequency: 'daily' | 'weekly' | 'once';
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmailTemplate {
  id?: number;
  reminder_type: 'rent_due' | 'rent_overdue' | 'payment_due' | 'payment_overdue' | 'maintenance_due' | 'maintenance_overdue' | 'default';
  name: string;
  subject: string;
  body_html: string;
  body_text?: string;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TenantNotificationPreference {
  id?: number;
  tenant_id: number;
  email_enabled: boolean;
  sms_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReminderLog {
  id: number;
  tenant_id: number;
  reminder_type: string;
  notification_type: 'email' | 'sms' | 'both';
  recipient_email?: string;
  recipient_phone?: string;
  subject?: string;
  message?: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  metadata?: Record<string, unknown>;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  tenant?: Tenant;
}

// Email Reminder APIs
export const emailSettingsAPI = {
  get: () => api.get('/email-settings'),
  save: (data: Partial<EmailSetting>) => api.post('/email-settings', data),
  test: (data: { email: string; name?: string }) => api.post('/email-settings/test', data),
};

export const reminderConfigurationsAPI = {
  getAll: () => api.get('/reminder-configurations'),
  create: (data: Partial<ReminderConfiguration>) => api.post('/reminder-configurations', data),
  update: (id: number, data: Partial<ReminderConfiguration>) => api.put(`/reminder-configurations/${id}`, data),
  delete: (id: number) => api.delete(`/reminder-configurations/${id}`),
};

export const emailTemplatesAPI = {
  getAll: () => api.get('/email-templates'),
  getById: (id: number) => api.get(`/email-templates/${id}`),
  getByType: (reminderType: string) => api.get(`/email-templates/type/${reminderType}`),
  create: (data: Partial<EmailTemplate>) => api.post('/email-templates', data),
  update: (id: number, data: Partial<EmailTemplate>) => api.put(`/email-templates/${id}`, data),
  delete: (id: number) => api.delete(`/email-templates/${id}`),
};

export const tenantNotificationPreferencesAPI = {
  get: (tenantId: number) => api.get(`/tenants/${tenantId}/notification-preferences`),
  update: (tenantId: number, data: Partial<TenantNotificationPreference>) => 
    api.put(`/tenants/${tenantId}/notification-preferences`, data),
};

export const reminderLogsAPI = {
  getAll: (params?: Record<string, unknown>) => api.get('/reminder-logs', { params }),
  getStatistics: () => api.get('/reminder-logs/statistics'),
};

export default api;
