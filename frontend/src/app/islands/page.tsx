'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/UI/Dialog';
import { islandsAPI, Island } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';
import { ResponsiveTable } from '../../components/Responsive/ResponsiveTable';
import { Pagination } from '../../components/UI/Pagination';

function IslandsPageContent() {
  const [islands, setIslands] = useState<Island[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingIsland, setEditingIsland] = useState<Island | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    is_active: true,
    sort_order: 0,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchIslands();
  }, [currentPage, itemsPerPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchIslands();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Clean up selected IDs when islands are removed
  useEffect(() => {
    const islandIds = new Set(islands.map(island => island.id));
    setSelectedIds(prev => {
      const validSelectedIds = Array.from(prev).filter(id => islandIds.has(id));
      if (validSelectedIds.length !== prev.size) {
        return new Set(validSelectedIds);
      }
      return prev;
    });
  }, [islands]);

  const fetchIslands = async () => {
    try {
      setLoading(true);
      const response = await islandsAPI.getAll({
        page: currentPage,
        per_page: itemsPerPage,
        search: searchTerm || undefined,
      });
      const islandsData = response.data?.data || [];
      setIslands(islandsData);
      setTotalItems(response.data?.total ?? response.data?.data?.total ?? islandsData.length);
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} island${count > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      setLoading(true);
      const deletePromises = Array.from(selectedIds).map(id => islandsAPI.delete(id));
      await Promise.all(deletePromises);
      toast.success(`${count} island${count > 1 ? 's' : ''} deleted successfully`);
      setSelectedIds(new Set());
      fetchIslands();
    } catch (error: unknown) {
      console.error('Error deleting islands:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response: { data: { message: string } } }).response.data.message 
        : 'Failed to delete islands';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(islands.map(island => island.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectItem = (id: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
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

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const isAllSelected = islands.length > 0 && selectedIds.size === islands.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < islands.length;

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
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedIds.size})
              </Button>
            )}
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Island
            </Button>
          </div>
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
              <DialogHeader className="flex-col items-start">
                <DialogTitle>{editingIsland ? 'Edit Island' : 'Add New Island'}</DialogTitle>
                <div className="border-b border-gray-200 w-full my-3"></div>
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex items-center gap-2 px-5 py-2.5 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingIsland ? 'Update' : 'Create'} Island
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Islands List */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle>Islands ({totalItems})</CardTitle>
            <CardDescription>Manage your islands</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading islands...</p>
              </div>
            ) : (
              <>
                {/* Select All Checkbox */}
                {islands.length > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label className="text-sm text-gray-700">
                      Select All ({selectedIds.size} selected)
                    </label>
                  </div>
                )}
                
                <ResponsiveTable
                  data={islands}
                  keyExtractor={(item) => item.id.toString()}
                  columns={[
                    {
                      header: (
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isIndeterminate;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ),
                      accessor: (item) => (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id, e.target.checked);
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        />
                      ),
                      mobileLabel: 'Select',
                      mobilePriority: 'high',
                      className: 'w-12',
                    },
                    {
                      header: 'ID',
                      accessor: (item) => `#${item.id}`,
                      mobileLabel: 'ID',
                      mobilePriority: 'high',
                      className: 'w-16',
                    },
                    {
                      header: 'Name',
                      accessor: 'name',
                      mobileLabel: 'Name',
                      mobilePriority: 'high',
                    },
                    {
                      header: 'Sort Order',
                      accessor: 'sort_order',
                      mobileLabel: 'Sort',
                      mobilePriority: 'medium',
                      className: 'w-24',
                    },
                    {
                      header: 'Status',
                      accessor: (item) => (
                        <span className={`px-2 py-1 rounded-full text-xs ${item.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      ),
                      mobileLabel: 'Status',
                      mobilePriority: 'high',
                      className: 'w-32',
                    },
                    {
                      header: 'Created',
                      accessor: (item) => new Date(item.created_at).toLocaleDateString(),
                      mobileLabel: 'Created',
                      mobilePriority: 'medium',
                      className: 'w-40',
                    },
                  ]}
                  actions={(item) => (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                        className="p-1"
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {item.is_active ? (
                          <EyeOff className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="p-1"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                        className="p-1"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </>
                  )}
                  emptyMessage={searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first island.'}
                />
                
                {islands.length > 0 && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newSize) => {
                      setItemsPerPage(newSize);
                      setCurrentPage(1);
                    }}
                  />
                )}
              </>
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

