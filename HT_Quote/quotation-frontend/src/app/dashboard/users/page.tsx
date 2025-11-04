"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Users as UsersIcon,
  UserCheck,
  UserX,
  Shield,
  User,
  MoreVertical,
  Edit,
  Trash2,
  Lock,
  Power,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { api, usersApi, rolesApi } from "@/lib/api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: number;
  name: string;
  username: string;
  full_name: string;
  email: string;
  role?: "admin" | "user"; // Legacy field
  roles?: string[]; // Spatie roles
  permissions?: string[]; // Spatie permissions
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  permissions_count: number;
}

interface UserFormData {
  name: string;
  username: string;
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: "admin" | "user"; // Legacy field - optional now
  roles?: string[]; // Spatie roles
  is_active: boolean;
}

interface Statistics {
  total: number;
  active: number;
  inactive: number;
  admins: number;
  users: number;
}

export default function UsersPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [assignRolesDialogOpen, setAssignRolesDialogOpen] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [createData, setCreateData] = useState<UserFormData>({
    name: "",
    username: "",
    full_name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "user",
    roles: [],
    is_active: true,
  });

  const [editData, setEditData] = useState<Partial<UserFormData>>({
    name: "",
    username: "",
    full_name: "",
    email: "",
    role: "user",
    roles: [],
    is_active: true,
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    password: "",
    password_confirmation: "",
  });

  useEffect(() => {
    fetchUsers();
    fetchStatistics();
    fetchRoles();
  }, [searchTerm, roleFilter, statusFilter]);

  const fetchRoles = async () => {
    try {
      const response = await rolesApi.getAll();
      setAvailableRoles(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.is_active = statusFilter;

      const response = await usersApi.getAll(params);
      setUsers(response.data.data || response.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await usersApi.getStatistics();
      setStatistics(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    }
  };

  const handleCreateUser = async () => {
    if (createData.password !== createData.password_confirmation) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      const userData = { ...createData };
      // Create user first
      const response = await usersApi.create(userData);
      const userId = response.data?.data?.id || response.data?.id;
      
      // If roles are selected, assign them
      if (userId && createData.roles && createData.roles.length > 0) {
        try {
          await usersApi.assignRoles(userId, createData.roles);
        } catch (roleError) {
          console.error("Error assigning roles:", roleError);
          toast({
            title: "Warning",
            description: "User created but roles could not be assigned. You can assign roles manually.",
            variant: "default",
          });
        }
      }
      
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setCreateDialogOpen(false);
      resetCreateData();
      fetchUsers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      // Update user basic info
      const { roles, ...userData } = editData;
      await usersApi.update(selectedUser.id.toString(), userData);
      
      // Update roles if changed
      if (roles !== undefined) {
        try {
          await usersApi.assignRoles(selectedUser.id, roles);
        } catch (roleError) {
          console.error("Error updating roles:", roleError);
          toast({
            title: "Warning",
            description: "User updated but roles could not be updated. Please try assigning roles separately.",
            variant: "default",
          });
        }
      }
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await usersApi.delete(id.toString());
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      fetchUsers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await usersApi.toggleStatus(id);
      toast({
        title: "Success",
        description: "User status updated successfully",
      });
      fetchUsers();
      fetchStatistics();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleAssignRoles = async () => {
    if (!selectedUser) return;

    try {
      console.log("Assigning roles:", selectedRoles, "to user:", selectedUser.id);
      const response = await usersApi.assignRoles(selectedUser.id, selectedRoles);
      console.log("Assign roles response:", response);
      toast({
        title: "Success",
        description: "Roles assigned successfully",
      });
      setAssignRolesDialogOpen(false);
      setSelectedUser(null);
      setSelectedRoles([]);
      fetchUsers();
    } catch (error: any) {
      console.error("Error assigning roles:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message ||
                          "Failed to assign roles";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const openAssignRolesDialog = async (user: User) => {
    setSelectedUser(user);
    try {
      const response = await usersApi.getRoles(user.id);
      console.log("User roles response:", response);
      const roles = response.data?.data?.roles || response.data?.roles || user.roles || [];
      setSelectedRoles(roles);
      setAssignRolesDialogOpen(true);
    } catch (error: any) {
      console.error("Error loading user roles:", error);
      // Fallback to roles from user object if API fails
      setSelectedRoles(user.roles || []);
      setAssignRolesDialogOpen(true);
      toast({
        title: "Warning",
        description: "Could not load current roles, but you can still assign roles",
        variant: "default",
      });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (resetPasswordData.password !== resetPasswordData.password_confirmation) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    try {
      await usersApi.resetPassword(selectedUser.id, resetPasswordData);
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setResetPasswordData({ password: "", password_confirmation: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const resetCreateData = () => {
    setCreateData({
      name: "",
      username: "",
      full_name: "",
      email: "",
      password: "",
      password_confirmation: "",
      role: "user",
      roles: [],
      is_active: true,
    });
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      roles: user.roles || [],
      is_active: user.is_active,
    });
    setEditDialogOpen(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setResetPasswordData({ password: "", password_confirmation: "" });
    setResetPasswordDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New User
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statistics.inactive}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statistics.admins}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics.users}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={roleFilter || "all"}
                onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter || "all"}
                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="default"
                              className="bg-blue-600"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : user.role ? (
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className={user.role === "admin" ? "bg-purple-600" : ""}
                      >
                        {user.role}
                      </Badge>
                        ) : (
                          <Badge variant="secondary">No Role</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.is_active ? "default" : "destructive"}
                        className={user.is_active ? "bg-green-600" : ""}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.last_login
                        ? format(new Date(user.last_login), "MMM dd, yyyy HH:mm")
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.created_at), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {hasPermission("users.edit") && (
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          )}
                          {hasPermission("users.manage_roles") && (
                            <DropdownMenuItem onClick={() => openAssignRolesDialog(user)}>
                              <Shield className="mr-2 h-4 w-4" />
                              Assign Roles
                            </DropdownMenuItem>
                          )}
                          {hasPermission("users.edit") && (
                            <>
                          <DropdownMenuItem onClick={() => openResetPasswordDialog(user)}>
                            <Lock className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id)}>
                            <Power className="mr-2 h-4 w-4" />
                            {user.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                            </>
                          )}
                          {hasPermission("users.delete") && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Display Name *</Label>
                <Input
                  id="create-name"
                  value={createData.name}
                  onChange={(e) =>
                    setCreateData({ ...createData, name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-username">Username *</Label>
                <Input
                  id="create-username"
                  value={createData.username}
                  onChange={(e) =>
                    setCreateData({ ...createData, username: e.target.value })
                  }
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-full-name">Full Name *</Label>
              <Input
                id="create-full-name"
                value={createData.full_name}
                onChange={(e) =>
                  setCreateData({ ...createData, full_name: e.target.value })
                }
                placeholder="John Michael Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createData.email}
                onChange={(e) =>
                  setCreateData({ ...createData, email: e.target.value })
                }
                placeholder="john@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-password">Password *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createData.password}
                  onChange={(e) =>
                    setCreateData({ ...createData, password: e.target.value })
                  }
                  placeholder="Min 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password-confirm">Confirm Password *</Label>
                <Input
                  id="create-password-confirm"
                  type="password"
                  value={createData.password_confirmation}
                  onChange={(e) =>
                    setCreateData({
                      ...createData,
                      password_confirmation: e.target.value,
                    })
                  }
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-4">
                {availableRoles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Loading roles...</div>
                ) : (
                  availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`create-role-${role.id}`}
                        checked={createData.roles?.includes(role.name) || false}
                        onCheckedChange={(checked) => {
                          const currentRoles = createData.roles || [];
                          if (checked) {
                            setCreateData({ ...createData, roles: [...currentRoles, role.name] });
                          } else {
                            setCreateData({ ...createData, roles: currentRoles.filter(r => r !== role.name) });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`create-role-${role.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.permissions_count} permissions
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {createData.roles && createData.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {createData.roles.map((role) => (
                    <Badge key={role} variant="default" className="bg-blue-600">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="create-is-active"
                checked={createData.is_active}
                onCheckedChange={(checked) =>
                  setCreateData({ ...createData, is_active: checked })
                }
              />
              <Label htmlFor="create-is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetCreateData();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Display Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editData.username}
                  onChange={(e) =>
                    setEditData({ ...editData, username: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name</Label>
              <Input
                id="edit-full-name"
                value={editData.full_name}
                onChange={(e) =>
                  setEditData({ ...editData, full_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editData.email}
                onChange={(e) =>
                  setEditData({ ...editData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-4">
                {availableRoles.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Loading roles...</div>
                ) : (
                  availableRoles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-role-${role.id}`}
                        checked={editData.roles?.includes(role.name) || false}
                        onCheckedChange={(checked) => {
                          const currentRoles = editData.roles || [];
                          if (checked) {
                            setEditData({ ...editData, roles: [...currentRoles, role.name] });
                          } else {
                            setEditData({ ...editData, roles: currentRoles.filter(r => r !== role.name) });
                          }
                        }}
                      />
                      <Label
                        htmlFor={`edit-role-${role.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {role.permissions_count} permissions
                        </div>
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {editData.roles && editData.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editData.roles.map((role) => (
                    <Badge key={role} variant="default" className="bg-blue-600">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-is-active"
                checked={editData.is_active}
                onCheckedChange={(checked) =>
                  setEditData({ ...editData, is_active: checked })
                }
              />
              <Label htmlFor="edit-is-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPasswordData.password}
                onChange={(e) =>
                  setResetPasswordData({
                    ...resetPasswordData,
                    password: e.target.value,
                  })
                }
                placeholder="Min 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">Confirm Password</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={resetPasswordData.password_confirmation}
                onChange={(e) =>
                  setResetPasswordData({
                    ...resetPasswordData,
                    password_confirmation: e.target.value,
                  })
                }
                placeholder="Re-enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetPasswordDialogOpen(false);
                setSelectedUser(null);
                setResetPasswordData({ password: "", password_confirmation: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Roles Dialog */}
      <Dialog open={assignRolesDialogOpen} onOpenChange={setAssignRolesDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Roles to {selectedUser?.full_name}</DialogTitle>
              <DialogDescription>
                Select the roles you want to assign to this user. Users can have multiple roles.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Available Roles</Label>
                <div className="max-h-64 overflow-y-auto space-y-2 border rounded-md p-4">
                  {availableRoles.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No roles available</div>
                  ) : (
                    availableRoles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoles.includes(role.name)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRoles([...selectedRoles, role.name]);
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role.name));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium">{role.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {role.permissions_count} permissions
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {selectedRoles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoles.map((role) => (
                      <Badge key={role} variant="default" className="bg-blue-600">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAssignRolesDialogOpen(false);
                  setSelectedUser(null);
                  setSelectedRoles([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAssignRoles}>Assign Roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
