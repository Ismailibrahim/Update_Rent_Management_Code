import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { QuotationData, CreateQuotationData, CustomerData, ProductData, CategoryData, ServiceTaskData, TermsConditionsData } from './types';
import { ErrorHandler } from './error-handler';
import { healthMonitor } from './health-monitor';

/**
 * API Base URL Configuration
 * Automatically switches based on environment:
 * - Development: localhost:8000/api
 * - Production: Uses NEXT_PUBLIC_API_URL or relative /api
 */
const getApiBaseUrl = (): string => {
  // Priority 1: Explicit environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 2: Production build - use relative path (works with reverse proxy)
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  
  // Priority 3: Development default
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Enhanced API configuration with retry logic
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for better responsiveness
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || 'your-secret-api-key-here',
  },
});

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second base delay
  retryDelayMultiplier: 2, // Exponential backoff
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return !error.response || 
           (error.response.status >= 500 && error.response.status < 600) ||
           error.code === 'ECONNABORTED' ||
           error.code === 'NETWORK_ERROR' ||
           error.message.includes('Network Error');
  }
};

// Enhanced retry logic
const retryRequest = async (config: AxiosRequestConfig, retryCount = 0): Promise<AxiosResponse> => {
  try {
    return await axios(config);
  } catch (error) {
    const axiosError = error as AxiosError;
    
    if (retryCount < RETRY_CONFIG.maxRetries && RETRY_CONFIG.retryCondition(axiosError)) {
      const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.retryDelayMultiplier, retryCount);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 API Retry ${retryCount + 1}/${RETRY_CONFIG.maxRetries} for ${config.url} (delay: ${delay}ms)`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(config, retryCount + 1);
    }
    
    throw error;
  }
};

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Debug: Log the request data for quotations
    if (config.url?.includes('/quotations') && config.method === 'post') {
      console.log('🚀 API REQUEST TO:', config.url);
      console.log('🚀 REQUEST DATA:', JSON.stringify(config.data, null, 2));
      console.log('🚀 REQUEST DATA TYPE:', typeof config.data);
      if (config.data?.items) {
        console.log('🚀 ITEMS IN REQUEST:', config.data.items);
        console.log('🚀 FIRST ITEM:', config.data.items[0]);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with comprehensive error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    
    // Analyze error for better handling
    const errorDetails = ErrorHandler.analyzeError(error);
    ErrorHandler.logError(error, originalRequest?.url);

    // Handle authentication errors
    if (error.response?.status === 401) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Authentication failed, clearing tokens');
      }
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect handled by frontend router in the component
    }

    // Enhanced retry logic with health monitoring
    if (!originalRequest._retry && ErrorHandler.isRetryable(error)) {
      originalRequest._retry = true;
      
      // Check backend health before retry (with error handling)
      try {
        const isHealthy = await Promise.race([
          healthMonitor.forceCheck(),
          new Promise<boolean>((resolve) => 
            setTimeout(() => resolve(true), 5000) // Timeout after 5 seconds
          )
        ]);
        
        if (!isHealthy) {
          if (process.env.NODE_ENV === 'development') {
            console.log('🚨 Backend is unhealthy, skipping retry');
          }
          return Promise.reject(error);
        }
      } catch (healthCheckError) {
        // If health check fails, proceed with retry anyway
        if (process.env.NODE_ENV === 'development') {
          console.warn('Health check failed, proceeding with retry:', healthCheckError);
        }
      }
      
      // Calculate retry delay
      const retryCount = originalRequest._retryCount || 0;
      const delay = ErrorHandler.getRetryDelay(error, retryCount);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Retrying request in ${Math.round(delay)}ms (attempt ${retryCount + 1})`);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      originalRequest._retryCount = retryCount + 1;
      
      return retryRequest(originalRequest);
    }

    // Notify user about persistent errors
    if (originalRequest._retry && !ErrorHandler.isRetryable(error)) {
      if (process.env.NODE_ENV === 'development') {
        // Use console.log instead of console.error to avoid Next.js overlay
        console.log('🚨 Persistent API error after retries:', errorDetails.message);
      }
      
      // Dispatch custom event for UI handling
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('api-error', {
          detail: {
            error: errorDetails,
            originalError: error,
            url: originalRequest?.url,
            method: originalRequest?.method,
          }
        });
        window.dispatchEvent(event);
      }
    }

    return Promise.reject(error);
  }
);

// Quotations API
export const quotationsApi = {
  getAll: () => api.get('/quotations'),
  getById: (id: string) => api.get(`/quotations/${id}`),
  create: (data: CreateQuotationData) => api.post('/quotations', data),
  update: (id: string, data: QuotationData) => api.put(`/quotations/${id}`, data),
  delete: (id: string) => api.delete(`/quotations/${id}`),
  send: (id: string) => api.post(`/quotations/${id}/send`),
  accept: (id: string) => api.post(`/quotations/${id}/accept`),
  reject: (id: string) => api.post(`/quotations/${id}/reject`),
  generatePdf: (id: string) => api.post(`/quotations/${id}/pdf`),
  previewNumber: (customerId: string) => api.get(`/quotations/preview-number?customer_id=${customerId}`),
};

// Service Terms API
export const serviceTermsApi = {
  getAll: () => api.get('/service-terms'),
  getById: (id: string) => api.get(`/service-terms/${id}`),
  getDefault: () => api.get('/service-terms/default'),
  getByPage: (pageNumber: number) => api.get(`/service-terms/page/${pageNumber}`),
  create: (data: any) => api.post('/service-terms', data),
  update: (id: string, data: any) => api.put(`/service-terms/${id}`, data),
  delete: (id: string) => api.delete(`/service-terms/${id}`),
};

// Customers API
export const customersApi = {
  getAll: (includeContacts = false) => api.get(`/customers${includeContacts ? '?include_contacts=true' : ''}`),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: CustomerData) => api.post('/customers', data),
  update: (id: string, data: CustomerData) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  bulkImport: (customers: any[]) => api.post('/customers/bulk-import', { customers }),
};

// Customer Contacts API
export const customerContactsApi = {
  getAll: () => api.get('/customer-contacts'),
  getByCustomer: (customerId: string) => api.get(`/customers/${customerId}/contacts`),
  create: (customerId: string, data: any) => api.post(`/customers/${customerId}/contacts`, data),
  getById: (id: string) => api.get(`/customer-contacts/${id}`),
  update: (id: string, data: any) => api.put(`/customer-contacts/${id}`, data),
  delete: (id: string) => api.delete(`/customer-contacts/${id}`),
  setPrimary: (id: string) => api.patch(`/customer-contacts/${id}/set-primary`),
};

export const contactTypesApi = {
  getAll: () => api.get('/contact-types'),
  getById: (id: string) => api.get(`/contact-types/${id}`),
  create: (data: any) => api.post('/contact-types', data),
  update: (id: string, data: any) => api.put(`/contact-types/${id}`, data),
  delete: (id: string) => api.delete(`/contact-types/${id}`),
};

export const designationsApi = {
  getAll: () => api.get('/designations'),
  getById: (id: string) => api.get(`/designations/${id}`),
  create: (data: any) => api.post('/designations', data),
  update: (id: string, data: any) => api.put(`/designations/${id}`, data),
  delete: (id: string) => api.delete(`/designations/${id}`),
};

export const countriesApi = {
  getAll: () => api.get('/countries'),
  getById: (id: string) => api.get(`/countries/${id}`),
  create: (data: any) => api.post('/countries', data),
  update: (id: string, data: any) => api.put(`/countries/${id}`, data),
  delete: (id: string) => api.delete(`/countries/${id}`),
  toggleStatus: (id: string) => api.patch(`/countries/${id}/toggle-status`),
};

// Products API
export const productsApi = {
  getAll: () => api.get('/products?per_page=all'),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: ProductData) => api.post('/products', data),
  update: (id: string, data: ProductData) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

// Categories API - using working test route temporarily
export const categoriesApi = {
  getAll: () => api.get('/test-categories-full'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: CategoryData) => api.post('/categories', data),
  update: (id: string, data: CategoryData) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// Expense Categories API
export const expenseCategoriesApi = {
  getAll: () => api.get('/expense-categories'),
  getById: (id: string) => api.get(`/expense-categories/${id}`),
  create: (data: any) => api.post('/expense-categories', data),
  update: (id: string, data: any) => api.put(`/expense-categories/${id}`, data),
  delete: (id: string) => api.delete(`/expense-categories/${id}`),
};

// Landed Cost API
export const landedCostApi = {
  calculate: (data: any) => api.post('/landed-cost/calculate', data),
  createShipment: (data: any) => api.post('/landed-cost/create-shipment', data),
  getShipments: () => api.get('/landed-cost/shipments'),
  getShipment: (id: string) => api.get(`/landed-cost/shipments/${id}`),
  updateProductPrices: (id: string) => api.post(`/landed-cost/shipments/${id}/update-prices`),
};

// Shipments API
export const shipmentsApi = {
  getAll: () => api.get('/shipments'),
  getById: (id: string) => api.get(`/shipments/${id}`),
  create: (data: any) => api.post('/shipments', data),
  update: (id: string, data: any) => api.put(`/shipments/${id}`, data),
  delete: (id: string) => api.delete(`/shipments/${id}`),
};

// Settings API
export const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (key: string, data: Record<string, unknown>) => api.post(`/settings/${key}`, data),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    console.log('FormData created with file:', file);
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', file.size);

    // Create a new axios instance without JSON headers for file upload
    return axios.post(`${API_BASE_URL}/settings/upload-logo`, formData, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        // Don't set Content-Type - let browser set it with boundary
      },
    });
  },
};

// Reports API
export const reportsApi = {
  getQuotationStats: () => api.get('/reports/quotations-stats'),
  getQuotationsByStatus: () => api.get('/reports/quotations-by-status'),
  getTopCustomers: () => api.get('/reports/top-customers'),
};

// AMC Descriptions API
export const amcApi = {
  getDescriptions: (productType?: string) => {
    const params = productType ? { product_type: productType } : {};
    return api.get('/amc-descriptions', { params });
  },
};

// Service Tasks API
export const serviceTasksApi = {
  getAll: (productId?: number) => {
    const params = productId ? { product_id: productId } : {};
    return api.get('/service-tasks', { params });
  },
  getById: (id: string) => api.get(`/service-tasks/${id}`),
  create: (data: ServiceTaskData) => api.post('/service-tasks', data),
  update: (id: string, data: ServiceTaskData) => api.put(`/service-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/service-tasks/${id}`),
  getByProduct: (productId: string) => api.get(`/service-tasks/product/${productId}`),
  reorder: (productId: string, taskOrders: { id: number; sequence_order: number }[]) => api.post(`/service-tasks/reorder/${productId}`, { task_orders: taskOrders }),
};

// Terms & Conditions API
export const termsConditionsApi = {
  getAll: () => api.get('/terms-conditions'),
  getById: (id: string) => api.get(`/terms-conditions/${id}`),
  create: (data: TermsConditionsData) => api.post('/terms-conditions', data),
  update: (id: string, data: TermsConditionsData) => api.put(`/terms-conditions/${id}`, data),
  delete: (id: string) => api.delete(`/terms-conditions/${id}`),
  setDefault: (id: string) => api.post(`/terms-conditions/${id}/set-default`),
  getByCategory: (categoryType: string) => api.get(`/terms-conditions/category/${categoryType}`),
};

// Users API
export const usersApi = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getRoles: (id: number) => api.get(`/users/${id}/roles`),
  assignRoles: (id: number, roles: string[]) => api.post(`/users/${id}/roles`, { roles }),
  removeRole: (id: number, role: string) => api.delete(`/users/${id}/roles`, { data: { role } }),
  toggleStatus: (id: number) => api.post(`/users/${id}/toggle-status`),
  resetPassword: (id: number, data: { password: string; password_confirmation: string }) => api.post(`/users/${id}/reset-password`, data),
  getStatistics: () => api.get('/users/statistics'),
};

// Audit Logs API
export const auditLogsApi = {
  getAll: (params?: any) => api.get('/audit-logs', { params }),
  getById: (id: number) => api.get(`/audit-logs/${id}`),
  getStatistics: (params?: any) => api.get('/audit-logs/statistics', { params }),
  getRecent: (params?: { hours?: number; limit?: number }) => api.get('/audit-logs/recent', { params }),
  getModelLogs: (params: { model_type: string; model_id: number; per_page?: number }) => 
    api.get('/audit-logs/model', { params }),
  getUserLogs: (userId: number, params?: { per_page?: number }) => 
    api.get(`/audit-logs/user/${userId}`, { params }),
  getTimelineReport: (params: { start_date: string; end_date: string; group_by?: 'hour' | 'day' | 'week' | 'month' }) =>
    api.get('/audit-logs/timeline', { params }),
  getTopChangesReport: (params?: { limit?: number; days?: number }) =>
    api.get('/audit-logs/top-changes', { params }),
};

// Roles API
export const rolesApi = {
  getAll: () => api.get('/roles'),
  getById: (id: number) => api.get(`/roles/${id}`),
  create: (data: { name: string; permissions?: string[] }) => api.post('/roles', data),
  update: (id: number, data: { name?: string; permissions?: string[] }) => api.put(`/roles/${id}`, data),
  delete: (id: number) => api.delete(`/roles/${id}`),
  assignPermissions: (roleId: number, permissions: string[]) => 
    api.post(`/roles/${roleId}/permissions`, { permissions }),
};

// Permissions API
export const permissionsApi = {
  getAll: (params?: { group_by_category?: boolean }) => api.get('/permissions', { params }),
  getById: (id: number) => api.get(`/permissions/${id}`),
};

export default api;