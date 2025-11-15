'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Select } from '../../components/UI/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../../components/UI/Dialog';
import { Users, Plus, Search, Edit, Trash2, Shield, Mail, Save, X } from 'lucide-react';
import { usersAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

interface User {
  id: number;
  name: string;
  email: string;
  role_id: number;
  legacy_role: string;
  is_active: boolean;
  role_name?: string;
  created_at: string;
  updated_at: string;
}

export default function EmployeePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    legacy_role: 'property_manager',
    is_active: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Fetching users...');
      const response = await usersAPI.getAll();
      console.log('Users API response:', response);
      setUsers(response.data.users || []);
    } catch (error: unknown) {
      console.error('Error fetching users:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { message?: string } } };
        console.error('Error details:', errorResponse.response?.data);
        const errorMessage = errorResponse.response?.data?.message || 'Unknown error';
        toast.error('Failed to fetch users: ' + errorMessage);
      } else {
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.legacy_role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await usersAPI.delete(id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await usersAPI.update(id, { is_active: !currentStatus });
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleAddUser = () => {
    setShowAddForm(true);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      legacy_role: 'property_manager',
      is_active: true
    });
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowAddForm(false);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password
      legacy_role: user.legacy_role,
      is_active: user.is_active
    });
  };

  const handleSaveUser = async () => {
    try {
      console.log('Saving user with data:', formData);
      
      if (editingUser) {
        // Update existing user
        const updateData: Record<string, unknown> = {
          name: formData.name,
          email: formData.email,
          legacy_role: formData.legacy_role,
          is_active: formData.is_active
        };
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }
        
        console.log('Updating user with data:', updateData);
        await usersAPI.update(editingUser.id, updateData);
        toast.success('User updated successfully');
      } else {
        // Add new user
        console.log('Creating user with data:', formData);
        const response = await usersAPI.create(formData);
        console.log('User creation response:', response);
        toast.success('User created successfully');
      }
      
      setShowAddForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };
        console.error('Error details:', errorResponse.response?.data);
        
        // Show specific validation errors if available
        if (errorResponse.response?.data?.errors) {
          const errors = errorResponse.response.data.errors;
          const errorMessages = Object.values(errors).flat();
          toast.error('Validation failed: ' + errorMessages.join(', '));
        } else {
          const errorMessage = errorResponse.response?.data?.message || 'Unknown error';
          toast.error('Failed to save user: ' + errorMessage);
        }
      } else {
        toast.error('Failed to save user');
      }
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      legacy_role: 'property_manager',
      is_active: true
    });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'property_manager':
        return 'Property Manager';
      case 'accountant':
        return 'Accountant';
      default:
        return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Calculate statistics
  const totalEmployees = users.length;
  const activeUsers = users.filter(user => user.is_active).length;
  const administrators = users.filter(user => user.legacy_role === 'admin').length;
  const managers = users.filter(user => user.legacy_role === 'property_manager').length;

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="mt-2 text-gray-600">
              Manage your team members and their roles
            </p>
          </div>
          <Button onClick={handleAddUser} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>

        {/* Statistics Cards - Clean Design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Employees</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{totalEmployees}</div>
              <p className="text-sm text-gray-500">All team members</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{activeUsers}</div>
              <p className="text-sm text-gray-500">Currently active</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Administrators</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Shield className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{administrators}</div>
              <p className="text-sm text-gray-500">System admins</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Managers</CardTitle>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">{managers}</div>
              <p className="text-sm text-gray-500">Property managers</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Add/Edit Employee Modal */}
        <Dialog open={showAddForm || !!editingUser} onOpenChange={(open) => {
          if (!open) {
            cancelForm();
          }
        }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit Employee' : 'Add New Employee'}
              </DialogTitle>
              <DialogDescription>
                {editingUser ? 'Update employee information and role' : 'Create a new employee account'}
              </DialogDescription>
              <DialogClose onClick={cancelForm}>
                <X className="h-4 w-4" />
              </DialogClose>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <Input
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <Input
                    type="password"
                    placeholder={editingUser ? "Enter new password (optional)" : "Enter password (min 6 characters)"}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  />
                  {!editingUser && formData.password && formData.password.length < 6 && (
                    <p className="text-sm text-red-600 mt-1">Password must be at least 6 characters long</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <Select
                    value={formData.legacy_role}
                    onChange={(e) => setFormData(prev => ({ ...prev, legacy_role: e.target.value }))}
                  >
                    <option value="admin">Administrator</option>
                    <option value="property_manager">Property Manager</option>
                    <option value="accountant">Accountant</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active Account
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={cancelForm}
                className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveUser}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Save className="h-4 w-4" />
                {editingUser ? 'Update Employee' : 'Create Employee'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Employees Table */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Employee List</CardTitle>
            <CardDescription className="text-gray-600">
              Manage your team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Joined</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-gray-600 flex items-center">
                          <Mail className="h-3 w-3 mr-2" />
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getRoleDisplayName(user.legacy_role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            title="Edit Employee"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            className={user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete Employee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first employee.'}
                </p>
                <div className="mt-6">
                  <Button onClick={handleAddUser} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium">
                    <Plus className="h-4 w-4" />
                    Add Employee
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}