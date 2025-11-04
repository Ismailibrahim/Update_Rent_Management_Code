"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

interface ErrorNotificationProps {
  onDismiss?: () => void;
}

export function ErrorNotification({ onDismiss }: ErrorNotificationProps) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'error' | 'success' | 'warning';
    title: string;
    message: string;
    timestamp: Date;
    canRetry?: boolean;
  }>>([]);

  useEffect(() => {
    // Listen for backend failure events
    const handleBackendFailure = (event: CustomEvent) => {
      setNotifications(prev => [...prev, {
        id: `failure-${Date.now()}`,
        type: 'error',
        title: 'Backend Connection Lost',
        message: event.detail.message,
        timestamp: new Date(),
        canRetry: true,
      }]);
    };

    // Listen for backend recovery events
    const handleBackendRecovery = (event: CustomEvent) => {
      setNotifications(prev => [...prev, {
        id: `recovery-${Date.now()}`,
        type: 'success',
        title: 'Backend Reconnected',
        message: event.detail.message,
        timestamp: new Date(),
        canRetry: false,
      }]);
    };

    // Listen for API error events
    const handleApiError = (event: CustomEvent) => {
      const { error } = event.detail;
      setNotifications(prev => [...prev, {
        id: `api-error-${Date.now()}`,
        type: 'error',
        title: 'API Error',
        message: `${error.message}. ${error.suggestion}`,
        timestamp: new Date(),
        canRetry: error.canRetry,
      }]);
    };

    // Add event listeners
    window.addEventListener('backend-failure', handleBackendFailure as EventListener);
    window.addEventListener('backend-recovery', handleBackendRecovery as EventListener);
    window.addEventListener('api-error', handleApiError as EventListener);

    // Auto-dismiss success notifications after 5 seconds
    const interval = setInterval(() => {
      setNotifications(prev => prev.filter(notification => {
        if (notification.type === 'success' && 
            Date.now() - notification.timestamp.getTime() > 5000) {
          return false;
        }
        return true;
      }));
    }, 1000);

    return () => {
      window.removeEventListener('backend-failure', handleBackendFailure as EventListener);
      window.removeEventListener('backend-recovery', handleBackendRecovery as EventListener);
      window.removeEventListener('api-error', handleApiError as EventListener);
      clearInterval(interval);
    };
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const retryConnection = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/health', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        setNotifications(prev => [...prev, {
          id: `retry-success-${Date.now()}`,
          type: 'success',
          title: 'Connection Restored',
          message: 'Successfully reconnected to the backend server.',
          timestamp: new Date(),
          canRetry: false,
        }]);
      }
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: `retry-failed-${Date.now()}`,
        type: 'error',
        title: 'Retry Failed',
        message: 'Unable to reconnect. Please check if the backend server is running.',
        timestamp: new Date(),
        canRetry: true,
      }]);
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          className={`${
            notification.type === 'error' 
              ? 'border-red-200 bg-red-50 text-red-800' 
              : notification.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-yellow-200 bg-yellow-50 text-yellow-800'
          } shadow-lg`}
        >
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              {notification.type === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
              {notification.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {notification.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{notification.title}</div>
              <AlertDescription className="text-xs mt-1">
                {notification.message}
              </AlertDescription>
              <div className="text-xs text-gray-500 mt-1">
                {notification.timestamp.toLocaleTimeString()}
              </div>
            </div>
            <div className="flex space-x-1">
              {notification.canRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={retryConnection}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.id)}
                className="h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Alert>
      ))}
    </div>
  );
}









