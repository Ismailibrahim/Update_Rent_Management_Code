"use client";

import { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";

interface PermissionGateProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, user must have all permissions (for array)
  permissions?: string[]; // Alternative: check multiple permissions
}

export function PermissionGate({
  permission,
  permissions,
  children,
  fallback = null,
  requireAll = false,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permissions && permissions.length > 0) {
    // Check multiple permissions
    hasAccess = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  } else {
    // Check single permission
    hasAccess = hasPermission(permission);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

interface RoleGateProps {
  role: string;
  children: ReactNode;
  fallback?: ReactNode;
  roles?: string[]; // Alternative: check multiple roles
  requireAll?: boolean;
}

export function RoleGate({
  role,
  roles,
  children,
  fallback = null,
  requireAll = false,
}: RoleGateProps) {
  const { hasRole, roles: userRoles } = usePermissions();

  let hasAccess = false;

  if (roles && roles.length > 0) {
    // Check multiple roles
    hasAccess = requireAll
      ? roles.every((r) => userRoles.includes(r))
      : roles.some((r) => userRoles.includes(r));
  } else {
    // Check single role
    hasAccess = hasRole(role);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}





