/**
 * Centralized API Configuration
 * All API URLs should use this configuration
 */

// Get API base URL from environment variable, with intelligent fallback
export const getApiBaseUrl = (): string => {
  // Priority 1: Environment variable (explicit)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Priority 2: Check if running in production build
  if (process.env.NODE_ENV === 'production') {
    // In production with reverse proxy, use relative path
    return '/api';
  }
  
  // Priority 3: Development default
  return 'http://localhost:8000/api';
};

// Export the API base URL constant
export const API_BASE_URL = getApiBaseUrl();

// Helper to check if we're using localhost
export const isLocalDevelopment = (): boolean => {
  return API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1');
};

