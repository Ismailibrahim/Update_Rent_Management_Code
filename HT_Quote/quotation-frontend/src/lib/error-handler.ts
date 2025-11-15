/**
 * Enhanced error handling with user-friendly notifications
 */

import { AxiosError } from 'axios';

export interface ErrorDetails {
  type: 'network' | 'server' | 'auth' | 'validation' | 'unknown';
  message: string;
  suggestion: string;
  canRetry: boolean;
  statusCode?: number;
}

export class ErrorHandler {
  /**
   * Analyze error and provide user-friendly details
   */
  static analyzeError(error: AxiosError): ErrorDetails {
    try {
      // Network errors
      if (!error || !error.response) {
        if (error?.code === 'ECONNABORTED') {
          return {
            type: 'network',
            message: 'Request timed out',
            suggestion: 'The server is taking too long to respond. Please try again.',
            canRetry: true,
          };
        }
        
        if (error?.message?.includes('Network Error')) {
          return {
            type: 'network',
            message: 'Network connection failed',
            suggestion: 'Please check your internet connection and try again.',
            canRetry: true,
          };
        }
        
        return {
          type: 'network',
          message: 'Connection failed',
          suggestion: 'Unable to connect to the server. Please check your connection.',
          canRetry: true,
        };
      }

      // Safely get status code
      const status = error.response?.status;
      if (!status) {
        return {
          type: 'unknown',
          message: 'An unexpected error occurred',
          suggestion: 'Please try again or contact support.',
          canRetry: true,
        };
      }

      // Server errors
      if (status >= 500) {
        return {
          type: 'server',
          message: 'Server error occurred',
          suggestion: 'The server encountered an error. Our team has been notified.',
          canRetry: true,
          statusCode: status,
        };
      }

      // Authentication errors
      if (status === 401) {
        return {
          type: 'auth',
          message: 'Authentication required',
          suggestion: 'Please log in again to continue.',
          canRetry: false,
          statusCode: status,
        };
      }

      // Validation errors
      if (status === 422) {
        return {
          type: 'validation',
          message: 'Invalid data provided',
          suggestion: 'Please check your input and try again.',
          canRetry: false,
          statusCode: status,
        };
      }

      // Client errors
      if (status >= 400) {
        return {
          type: 'unknown',
          message: `Request failed (${status})`,
          suggestion: 'Please try again or contact support if the problem persists.',
          canRetry: true,
          statusCode: status,
        };
      }

      return {
        type: 'unknown',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again or contact support.',
        canRetry: true,
      };
    } catch (analyzeError) {
      // Fallback if error analysis itself fails
      return {
        type: 'unknown',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again or contact support.',
        canRetry: true,
      };
    }
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: AxiosError): string {
    const details = this.analyzeError(error);
    return `${details.message}. ${details.suggestion}`;
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AxiosError): boolean {
    const details = this.analyzeError(error);
    return details.canRetry;
  }

  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error: AxiosError, attempt: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    
    // Exponential backoff with jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return delay + jitter;
  }

  /**
   * Log error for debugging
   * Completely avoids console APIs that trigger Next.js error overlay
   */
  static logError(error: AxiosError, context?: string): void {
    // Silently return if error is invalid or we're in a problematic environment
    if (!error || typeof window === 'undefined') {
      return;
    }

    try {
      const details = this.analyzeError(error);
      
      // Ensure details is valid
      if (!details || !details.type || !details.message) {
        return;
      }
      
      // Build error message as a string to avoid multiple console calls
      // Use setTimeout to defer logging and avoid triggering Next.js overlay
      setTimeout(() => {
        try {
          // Build a comprehensive error message string
          const errorParts: string[] = [];
          errorParts.push(`🚨 API Error${context ? ` (${context})` : ''}`);
          errorParts.push(`Type: ${details.type || 'unknown'}`);
          errorParts.push(`Message: ${details.message || 'No message'}`);
          
          if (error?.response?.status) {
            errorParts.push(`Status: ${error.response.status}`);
          }
          if (error?.config?.url) {
            errorParts.push(`URL: ${error.config.url}`);
          }
          if (error?.config?.method) {
            errorParts.push(`Method: ${error.config.method.toUpperCase()}`);
          }
          
          // Use console.log instead of console.error/warn to avoid Next.js overlay
          // Concatenate all parts to a single log call
          const errorMessage = errorParts.join(' | ');
          
          // In development, log the full message
          if (process.env.NODE_ENV === 'development') {
            // Use console.log with a single message to minimize overhead
            console.log(errorMessage);
            // Optionally log the full error object separately but safely
            if (error) {
              console.log('Error details:', {
                type: details.type,
                message: details.message,
                status: error.response?.status,
                url: error.config?.url,
                method: error.config?.method,
              });
            }
          } else {
            // In production, use minimal logging
            console.log(errorMessage);
          }
        } catch {
          // Completely silent fallback - do nothing if logging fails
        }
      }, 0);
    } catch {
      // Fail completely silently - prevents any possibility of error loops
    }
  }
}








