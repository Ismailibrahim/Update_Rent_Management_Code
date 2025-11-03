'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/UI/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { islandsAPI, Island } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

function IslandsPageContent() {
  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIsland, setEditingIsland] = useState<Island | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchIslands();
  }, []);

  const fetchIslands = async () => {
    try {
      setLoading(true);
      const response = await islandsAPI.getAll();
      const islandsData = response.data?.data || [];
      setIslands(islandsData);
    } catch (error: unknown) {
      console.error('Error fetching islands:', error);
      toast.error('Failed to fetch islands');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Island name is required');
      return;
    }

    try {
      setLoading(true);
      
      const submitData = {
        name: formData.name,
        is_active: formData.is_active,
        sort_order: formData.sort_order || 0,
      };
      
      if (editingIsland) {
        await islandsAPI.update(editingIsland.id, submitData);
        toast.success('Island updated successfully');
      } else {
        await islandsAPI.create(submitData);
        toast.success('Island created successfully');
      }
      
      setShowCreateForm(false);
      setEditingIsland(null);
      resetForm();
      fetchIslands();
    } catch (error: unknown) {
      console.error('Error saving island:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to save island';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (island: Island) => {
    setEditingIsland(island);
    setFormData({
      name: island.name,
      is_active: island.is_active,
      sort_order: island.sort_order || 0,
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this island?')) {
      return;
    }

    try {
      setLoading(true);
      await islandsAPI.delete(id);
      toast.success('Island deleted successfully');
      fetchIslands();
    } catch (error: unknown) {
      console.error('Error deleting island:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete island';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (island: Island) => {
    try {
      setLoading(true);
      await islandsAPI.update(island.id, {
        ...island,
        is_active: !island.is_active
      });
      toast.success(`Island ${!island.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchIslands();
    } catch (error: unknown) {
      console.error('Error updating island status:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to update island status';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredIslands = islands.filter(island =>
    island.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      is_active: true,
      sort_order: 0,
    });
    setEditingIsland(null);
    setShowCreateForm(false);
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Islands</h1>
            <p className="text-gray-600">Manage islands for property locations</p>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Island
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search islands..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Create/Edit Form (Modal) */}
        {showCreateForm && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogContent className="max-w-lg w-full">
              <DialogHeader>
                <DialogTitle>{editingIsland ? 'Edit Island' : 'Add New Island'}</DialogTitle>
                <DialogDescription>
                  {editingIsland ? 'Update the island details' : 'Create a new island'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <Input
                    placeholder="Island name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <div className="mt-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {editingIsland ? 'Update' : 'Create'} Island
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Islands List (Table View) */}
        <Card>
          <CardHeader>
            <CardTitle>Islands ({filteredIslands.length})</CardTitle>
            <CardDescription>Manage your islands</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading islands...</p>
              </div>
            ) : filteredIslands.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No islands found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24">Sort</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-40">Created</TableHead>
                      <TableHead className="w-40 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIslands.map((island) => (
                      <TableRow key={island.id}>
                        <TableCell>#{island.id}</TableCell>
                        <TableCell className="font-medium">{island.name}</TableCell>
                        <TableCell>{island.sort_order}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${island.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {island.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(island.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(island)}
                              className="p-1"
                              title={island.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {island.is_active ? (
                                <EyeOff className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Eye className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(island)}
                              className="p-1"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(island.id)}
                              className="p-1"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

export default function IslandsPage() {
  return <IslandsPageContent />;
}

