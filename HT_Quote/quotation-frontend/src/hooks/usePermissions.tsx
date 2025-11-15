"use client";

import React, { useState, useEffect, useContext, createContext, ReactNode } from "react";

interface PermissionContextType {
  permissions: string[];
  roles: string[];
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  isLoading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Start as false to not block rendering

  const loadPermissions = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setPermissions([]);
        setRoles([]);
        setIsLoading(false);
        return;
      }

      // Try to get from stored user data first - always set immediately to avoid blocking UI
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData.permissions || userData.roles) {
            // Set immediately from cache, then refresh in background
            setPermissions(userData.permissions || []);
            setRoles(userData.roles || []);
            setIsLoading(false);
            
            // Refresh in background (don't await)
            refreshFromAPI().catch(() => {
              // Ignore background refresh errors
            });
            return;
          }
        } catch (e) {
          // Invalid JSON, continue to API fetch
        }
      }

      // If no stored data, try API but with timeout
      setIsLoading(true);
      await Promise.race([
        refreshFromAPI(),
        new Promise(resolve => setTimeout(resolve, 3000)) // Max 3 seconds
      ]);
    } catch (error) {
      console.log("Error loading permissions:", error);
      // Default to empty arrays - don't block dashboard
      setPermissions([]);
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFromAPI = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const response = await fetch(`${apiUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "your-secret-api-key-here",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const perms = data.permissions || [];
          const userRoles = data.roles || [];

          setPermissions(perms);
          setRoles(userRoles);

          // Update stored user data
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              userData.permissions = perms;
              userData.roles = userRoles;
              localStorage.setItem("user", JSON.stringify(userData));
            } catch (e) {
              // Ignore
            }
          }
        } else {
          // If API fails, use stored permissions to allow dashboard access
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              if (userData.permissions || userData.roles) {
                setPermissions(userData.permissions || []);
                setRoles(userData.roles || []);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name !== 'AbortError') {
          console.log("Error refreshing permissions:", fetchError?.message || 'Unknown error');
        }
        // Use stored permissions if API call fails
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.permissions || userData.roles) {
              setPermissions(userData.permissions || []);
              setRoles(userData.roles || []);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
    } catch (error) {
      console.log("Error in refreshFromAPI:", error);
      // Continue with stored permissions or empty arrays
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return roles.includes(role);
  };

  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every((perm) => permissions.includes(perm));
  };

  const refreshPermissions = async () => {
    setIsLoading(true);
    await refreshFromAPI();
    setIsLoading(false);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        roles,
        hasPermission,
        hasRole,
        hasAnyPermission,
        hasAllPermissions,
        isLoading,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  return context;
}

// Convenience hooks
export function useHasPermission(permission: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
}

export function useHasRole(role: string): boolean {
  const { hasRole } = usePermissions();
  return hasRole(role);
}



