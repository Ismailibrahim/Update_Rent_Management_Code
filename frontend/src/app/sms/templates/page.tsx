'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Textarea } from '../../../components/UI/Textarea';
import { Select } from '../../../components/UI/Select';
import { Plus, Edit, Trash2, Eye, Search, Save, X } from 'lucide-react';
import { smsTemplatesAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SmsTemplate {
  id: number;
  name: string;
  type: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SmsTemplatesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'custom',
    content: '',
    variables: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTemplates();
    }
  }, [user, authLoading, router]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await smsTemplatesAPI.getAll();
      if (response.data.success) {
        // Handle both array and object response formats
        const data = response.data.data;
        setTemplates(Array.isArray(data) ? data : (data?.templates || data?.data || []));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch templates');
      setTemplates([]); // Ensure templates is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingTemplate) {
        await smsTemplatesAPI.update(editingTemplate.id, formData);
        toast.success('Template updated successfully');
      } else {
        await smsTemplatesAPI.create(formData);
        toast.success('Template created successfully');
      }
      setShowForm(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await smsTemplatesAPI.delete(id);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleEdit = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      content: template.content,
      variables: template.variables || [],
      is_active: template.is_active,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'custom',
      content: '',
      variables: [],
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableVariables = [
    'tenant_name', 'tenant_first_name', 'tenant_last_name', 'tenant_phone',
    'property_name', 'property_address', 'unit_number', 'rent_amount',
    'currency', 'due_date', 'current_date', 'current_month'
  ];

  return (
    <SidebarLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">SMS Templates</h1>
            <p className="text-gray-600 mt-1">Manage SMS message templates</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Template
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type *
                    </label>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                    >
                      <option value="custom">Custom</option>
                      <option value="rent_reminder">Rent Reminder</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content *
                  </label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={6}
                    required
                    placeholder="Enter message template. Use {{variable_name}} for variables."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available variables: {availableVariables.join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Manage your SMS message templates</CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !templates.length ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? 'No templates found' : 'No templates yet. Create one to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold text-gray-700">Name</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Type</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Content</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Status</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTemplates.map((template) => (
                      <tr key={template.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{template.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {template.type}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-600 max-w-md truncate">
                          {template.content}
                        </td>
                        <td className="p-3">
                          {template.is_active ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(template)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(template.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

