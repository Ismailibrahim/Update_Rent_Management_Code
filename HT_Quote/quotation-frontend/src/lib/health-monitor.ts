/**
 * Health Monitor for API connectivity and auto-recovery
 */

/**
 * API Base URL Configuration
 * Automatically switches based on environment
 */
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return '/api';
  }
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  lastError?: string;
}

class HealthMonitor {
  private status: HealthStatus = {
    isHealthy: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
  };

  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60000; // 60 seconds (increased from 30)
  private readonly MAX_FAILURES = 5; // Increased from 3
  private readonly RECOVERY_DELAY = 10000; // 10 seconds (increased from 5)

  constructor() {
    this.startMonitoring();
  }

  /**
   * Start health monitoring
   */
  private startMonitoring(): void {
    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000), // 15 second timeout (increased from 10)
      });

      if (response.ok) {
        this.handleSuccess();
      } else {
        this.handleFailure(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      this.handleFailure(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle successful health check
   */
  private handleSuccess(): void {
    if (!this.status.isHealthy) {
      console.log('🟢 Backend recovered! API is healthy again.');
      this.notifyRecovery();
    }

    this.status = {
      isHealthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
  }

  /**
   * Handle failed health check
   */
  private handleFailure(error: string): void {
    this.status.consecutiveFailures++;
    this.status.lastError = error;
    this.status.lastCheck = new Date();

    console.warn(`🔴 Health check failed (${this.status.consecutiveFailures}/${this.MAX_FAILURES}): ${error}`);
    
    // Log additional details for timeout errors
    if (error.includes('timeout') || error.includes('aborted')) {
      console.warn(`⏰ Timeout detected - Backend may be slow or unresponsive`);
      console.warn(`🔄 Will retry in ${this.RECOVERY_DELAY / 1000} seconds`);
    }

    if (this.status.consecutiveFailures >= this.MAX_FAILURES) {
      this.status.isHealthy = false;
      this.notifyFailure();
    }
  }

  /**
   * Notify about backend failure
   */
  private notifyFailure(): void {
    console.error('🚨 Backend is unhealthy! Attempting recovery...');
    
    // Show user notification
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('backend-failure', {
        detail: {
          message: 'Backend server is not responding. Attempting to reconnect...',
          timestamp: new Date(),
        }
      });
      window.dispatchEvent(event);
    }

    // Attempt recovery
    this.attemptRecovery();
  }

  /**
   * Notify about backend recovery
   */
  private notifyRecovery(): void {
    console.log('✅ Backend is healthy again!');
    
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('backend-recovery', {
        detail: {
          message: 'Backend server is responding normally.',
          timestamp: new Date(),
        }
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Attempt to recover backend connection
   */
  private async attemptRecovery(): Promise<void> {
    console.log('🔄 Attempting backend recovery...');
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, this.RECOVERY_DELAY));
    
    // Perform immediate health check
    await this.performHealthCheck();
  }

  /**
   * Get current health status
   */
  public getStatus(): HealthStatus {
    return { ...this.status };
  }

  /**
   * Force health check
   */
  public async forceCheck(): Promise<boolean> {
    await this.performHealthCheck();
    return this.status.isHealthy;
  }

  /**
   * Reset health monitor (useful for manual recovery)
   */
  public reset(): void {
    this.status = {
      isHealthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };
    console.log('🔄 Health monitor reset - starting fresh');
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Create singleton instance
export const healthMonitor = new HealthMonitor();

// Export for manual health checks
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
};


