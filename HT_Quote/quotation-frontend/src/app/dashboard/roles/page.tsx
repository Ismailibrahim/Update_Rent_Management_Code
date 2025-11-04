"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { rolesApi, permissionsApi } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react";

interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions: string[];
  permissions_count: number;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    loadRoles();
    loadPermissions();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesApi.getAll();
      setRoles(response.data.data || []);
    } catch (error) {
      console.error("Error loading roles:", error);
      setError("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();
      setPermissions(response.data.data || []);
    } catch (error) {
      console.error("Error loading permissions:", error);
    }
  };

  const handleCreate = async () => {
    try {
      await rolesApi.create(formData);
      setIsCreateOpen(false);
      setFormData({ name: "", permissions: [] });
      loadRoles();
    } catch (error) {
      console.error("Error creating role:", error);
      setError("Failed to create role");
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      permissions: role.permissions,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRole) return;

    try {
      await rolesApi.update(editingRole.id, formData);
      setIsEditOpen(false);
      setEditingRole(null);
      setFormData({ name: "", permissions: [] });
      loadRoles();
    } catch (error) {
      console.error("Error updating role:", error);
      setError("Failed to update role");
    }
  };

  const handleDelete = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await rolesApi.delete(roleId);
      loadRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      setError("Failed to delete role");
    }
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.name.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage user roles and permissions</p>
        </div>
        <PermissionGate permission="users.manage_roles">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a new role and assign permissions to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                      <div key={category} className="space-y-1">
                        <h4 className="font-medium text-sm capitalize">{category}</h4>
                        <div className="grid grid-cols-2 gap-2 ml-4">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`perm-${permission.id}`}
                                checked={formData.permissions.includes(permission.name)}
                                onCheckedChange={() => togglePermission(permission.name)}
                              />
                              <Label
                                htmlFor={`perm-${permission.id}`}
                                className="text-sm font-normal"
                              >
                                {permission.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name}>
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-lg">{role.name}</CardTitle>
                    <CardDescription>
                      {role.permissions_count} permissions assigned
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">
                    {role.permissions_count} permissions
                  </Badge>
                  <PermissionGate permission="users.manage_roles">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(role)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(role.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Permissions:</h4>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 10).map((permission) => (
                    <Badge key={permission} variant="secondary" className="text-xs">
                      {permission}
                    </Badge>
                  ))}
                  {role.permissions.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{role.permissions.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Update role permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter role name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="space-y-1">
                    <h4 className="font-medium text-sm capitalize">{category}</h4>
                    <div className="grid grid-cols-2 gap-2 ml-4">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-perm-${permission.id}`}
                            checked={formData.permissions.includes(permission.name)}
                            onCheckedChange={() => togglePermission(permission.name)}
                          />
                          <Label
                            htmlFor={`edit-perm-${permission.id}`}
                            className="text-sm font-normal"
                          >
                            {permission.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name}>
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




