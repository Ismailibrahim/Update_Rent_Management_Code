"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { PermissionProvider } from "@/hooks/usePermissions";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Start as true - check in background
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    setMounted(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found - redirecting to login");
        router.push("/login");
        setIsAuthenticated(false);
        return;
      }

      // Token exists - allow access
      setIsAuthenticated(true);
    } catch (error) {
      console.error("Error checking authentication:", error);
      // On error, assume authenticated to avoid blocking
      setIsAuthenticated(true);
    }
  }, [router]);

  // Always render the same structure to avoid hydration mismatch
  // If not authenticated, show redirect message
  if (mounted && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2">Redirecting to login...</div>
          <div className="text-sm text-muted-foreground">
            <a href="/login" className="text-blue-500 underline">Click here if not redirected</a>
          </div>
        </div>
      </div>
    );
  }

  // Always render with full dashboard layout including sidebar (consistent for SSR and client)
  return (
    <ErrorBoundary>
      <PermissionProvider>
        <DashboardLayout>{children}</DashboardLayout>
      </PermissionProvider>
    </ErrorBoundary>
  );
}