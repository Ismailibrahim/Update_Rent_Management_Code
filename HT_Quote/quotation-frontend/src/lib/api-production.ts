import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { QuotationData, CreateQuotationData, CustomerData, ProductData, CategoryData, ServiceTaskData } from './types';
import { ErrorHandler } from './error-handler';
import { healthMonitor } from './health-monitor';

// Production API configuration with reverse proxy support
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Use relative path for production (Nginx reverse proxy)
  : 'http://127.0.0.1:8000/api';  // Direct connection for development

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
  retries: 3,
  retryDelay: (retryCount: number) => retryCount * 1000,
  retryCondition: (error: AxiosError) => {
    return (
      !error.response ||
      error.response.status >= 500 ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED'
    );
  },
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    // Add API key to all requests
    config.headers['X-API-Key'] = process.env.NEXT_PUBLIC_API_KEY || 'your-secret-api-key-here';
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Success: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    }
    
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as AxiosRequestConfig & { _retryCount?: number };
    
    // Initialize retry count
    const retryCount = config._retryCount ?? 0;
    
    // Check if we should retry
    if (retryCount < RETRY_CONFIG.retries && RETRY_CONFIG.retryCondition(error)) {
      const nextRetryCount = retryCount + 1;
      config._retryCount = nextRetryCount;
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay(nextRetryCount)));
      
      // Log retry attempt
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 API Retry ${nextRetryCount}/${RETRY_CONFIG.retries}: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return api(config);
    }
    
    // Log final error
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || error.message}`);
    }
    
    // Handle specific error types
    if (error.response?.status === 401) {
      // Handle authentication errors
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    // Use error handler
    ErrorHandler.logError(error, 'API');
    
    return Promise.reject(error);
  }
);

// API endpoints
export const quotationsApi = {
  getAll: (params?: any) => api.get('/quotations', { params }),
  getById: (id: number) => api.get(`/quotations/${id}`),
  create: (data: CreateQuotationData) => api.post('/quotations', data),
  update: (id: number, data: Partial<QuotationData>) => api.put(`/quotations/${id}`, data),
  delete: (id: number) => api.delete(`/quotations/${id}`),
  getStatuses: () => api.get('/quotation-statuses'),
  getFollowups: (quotationId: number) => api.get(`/quotations/${quotationId}/followups`),
  createFollowup: (quotationId: number, data: any) => api.post(`/quotations/${quotationId}/followups`, data),
  updateFollowup: (quotationId: number, followupId: number, data: any) => api.put(`/quotations/${quotationId}/followups/${followupId}`, data),
  deleteFollowup: (quotationId: number, followupId: number) => api.delete(`/quotations/${quotationId}/followups/${followupId}`),
};

export const customersApi = {
  getAll: (includeContacts: boolean = false) => api.get('/customers', { 
    params: { include_contacts: includeContacts } 
  }),
  getById: (id: number) => api.get(`/customers/${id}`),
  create: (data: CustomerData) => api.post('/customers', data),
  update: (id: number, data: Partial<CustomerData>) => api.put(`/customers/${id}`, data),
  delete: (id: number) => api.delete(`/customers/${id}`),
  getContacts: (customerId: number) => api.get(`/customers/${customerId}/contacts`),
  createContact: (customerId: number, data: any) => api.post(`/customers/${customerId}/contacts`, data),
  updateContact: (customerId: number, contactId: number, data: any) => api.put(`/customers/${customerId}/contacts/${contactId}`, data),
  deleteContact: (customerId: number, contactId: number) => api.delete(`/customers/${customerId}/contacts/${contactId}`),
};

export const productsApi = {
  getAll: (params?: any) => api.get('/products', { params }),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: ProductData) => api.post('/products', data),
  update: (id: number, data: Partial<ProductData>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`),
  getSuggestions: (quotationId: number) => api.get(`/product-suggestions?quotation_id=${quotationId}`),
  createSuggestion: (data: any) => api.post('/product-suggestions', data),
  updateSuggestion: (id: number, data: any) => api.put(`/product-suggestions/${id}`, data),
  deleteSuggestion: (id: number) => api.delete(`/product-suggestions/${id}`),
};

export const categoriesApi = {
  getAll: (params?: any) => api.get('/categories', { params }),
  getById: (id: number) => api.get(`/categories/${id}`),
  create: (data: CategoryData) => api.post('/categories', data),
  update: (id: number, data: Partial<CategoryData>) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
};

export const serviceTasksApi = {
  getAll: (params?: any) => api.get('/service-tasks', { params }),
  getById: (id: number) => api.get(`/service-tasks/${id}`),
  create: (data: ServiceTaskData) => api.post('/service-tasks', data),
  update: (id: number, data: Partial<ServiceTaskData>) => api.put(`/service-tasks/${id}`, data),
  delete: (id: number) => api.delete(`/service-tasks/${id}`),
  bulkCreate: (data: any) => api.post('/service-tasks/bulk', data),
  getByProduct: (productId: number) => api.get(`/service-tasks?product_id=${productId}`),
};

export const amcApi = {
  getAll: () => api.get('/amc-descriptions'),
  getById: (id: number) => api.get(`/amc-descriptions/${id}`),
  create: (data: any) => api.post('/amc-descriptions', data),
  update: (id: number, data: any) => api.put(`/amc-descriptions/${id}`, data),
  delete: (id: number) => api.delete(`/amc-descriptions/${id}`),
};

export const supportProductsApi = {
  getAll: (params?: any) => api.get('/support-products', { params }),
  getById: (id: number) => api.get(`/support-products/${id}`),
  create: (data: any) => api.post('/support-products', data),
  update: (id: number, data: any) => api.put(`/support-products/${id}`, data),
  delete: (id: number) => api.delete(`/support-products/${id}`),
  toggleStatus: (id: number) => api.post(`/support-products/${id}/toggle-status`),
  updateSortOrder: (data: any) => api.post('/support-products/update-sort-order', data),
  getStatistics: () => api.get('/support-products/statistics'),
};

export const termsConditionsApi = {
  getAll: () => api.get('/terms-conditions'),
  getById: (id: number) => api.get(`/terms-conditions/${id}`),
  create: (data: any) => api.post('/terms-conditions', data),
  update: (id: number, data: any) => api.put(`/terms-conditions/${id}`, data),
  delete: (id: number) => api.delete(`/terms-conditions/${id}`),
  setDefault: (id: number, category: string) => api.post(`/terms-conditions/${id}/set-default`, { category }),
  getDefault: (category: string) => api.get(`/terms-conditions/default/${category}`),
};

export const customerSupportContractsApi = {
  getAll: (params?: any) => api.get('/customer-support-contracts', { params }),
  getById: (id: number) => api.get(`/customer-support-contracts/${id}`),
  create: (data: any) => api.post('/customer-support-contracts', data),
  update: (id: number, data: any) => api.put(`/customer-support-contracts/${id}`, data),
  delete: (id: number) => api.delete(`/customer-support-contracts/${id}`),
  getByCustomer: (customerId: number) => api.get(`/customer-support-contracts?customer_id=${customerId}`),
  getExpiring: (days: number = 30) => api.get(`/customer-support-contracts/expiring?days=${days}`),
};

export const reportsApi = {
  getQuotationReport: (params?: any) => api.get('/reports/quotations', { params }),
  getCustomerReport: (params?: any) => api.get('/reports/customers', { params }),
  getProductReport: (params?: any) => api.get('/reports/products', { params }),
  getFollowupReport: (params?: any) => api.get('/reports/followups', { params }),
};

export const settingsApi = {
  getAll: () => api.get('/settings'),
  update: (key: string, value: string) => api.put(`/settings/${key}`, { value }),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const authApi = {
  login: (credentials: { username: string; password: string }) => 
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  register: (data: any) => api.post('/auth/register', data),
};

export default api;




