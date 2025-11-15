'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Bell, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { reminderConfigurationsAPI, ReminderConfiguration } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';

export default function ReminderSettingsPage() {
  const [configurations, setConfigurations] = useState<ReminderConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReminderConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    reminder_type: 'rent_due' as ReminderConfiguration['reminder_type'],
    timing_type: 'before' as ReminderConfiguration['timing_type'],
    days_offset: 7,
    frequency: 'daily' as ReminderConfiguration['frequency'],
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    setLoading(true);
    try {
      const response = await reminderConfigurationsAPI.getAll();
      if (response.data?.success) {
        setConfigurations(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      toast.error('Failed to load reminder configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreate = () => {
    setSelectedConfig(null);
    setIsEditing(true);
    setFormData({
      reminder_type: 'rent_due',
      timing_type: 'before',
      days_offset: 7,
      frequency: 'daily',
      is_active: true,
      sort_order: 0,
    });
  };

  const handleEdit = (config: ReminderConfiguration) => {
    setSelectedConfig(config);
    setIsEditing(true);
    setFormData({
      reminder_type: config.reminder_type,
      timing_type: config.timing_type,
      days_offset: config.days_offset,
      frequency: config.frequency,
      is_active: config.is_active,
      sort_order: config.sort_order,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (selectedConfig?.id) {
        await reminderConfigurationsAPI.update(selectedConfig.id, formData);
        toast.success('Reminder configuration updated successfully');
      } else {
        await reminderConfigurationsAPI.create(formData);
        toast.success('Reminder configuration created successfully');
      }
      setIsEditing(false);
      setSelectedConfig(null);
      await fetchConfigurations();
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      toast.error(error.response?.data?.message || 'Failed to save reminder configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this reminder configuration?')) {
      return;
    }

    try {
      await reminderConfigurationsAPI.delete(id);
      toast.success('Reminder configuration deleted successfully');
      await fetchConfigurations();
    } catch (error: any) {
      console.error('Error deleting configuration:', error);
      toast.error(error.response?.data?.message || 'Failed to delete reminder configuration');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedConfig(null);
    setFormData({
      reminder_type: 'rent_due',
      timing_type: 'before',
      days_offset: 7,
      frequency: 'daily',
      is_active: true,
      sort_order: 0,
    });
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'rent_due': 'Rent Due',
      'rent_overdue': 'Rent Overdue',
      'payment_due': 'Payment Due',
      'payment_overdue': 'Payment Overdue',
      'maintenance_due': 'Maintenance Due',
      'maintenance_overdue': 'Maintenance Overdue',
    };
    return labels[type] || type;
  };

  const getTimingTypeLabel = (type: string, days: number) => {
    switch (type) {
      case 'before':
        return `${days} day${days !== 1 ? 's' : ''} before due date`;
      case 'on_date':
        return 'On due date';
      case 'after':
        return `${days} day${days !== 1 ? 's' : ''} after due date`;
      default:
        return type;
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'once': 'Once',
    };
    return labels[frequency] || frequency;
  };

  // Group configurations by reminder type
  const groupedConfigurations = configurations.reduce((acc, config) => {
    if (!acc[config.reminder_type]) {
      acc[config.reminder_type] = [];
    }
    acc[config.reminder_type].push(config);
    return acc;
  }, {} as Record<string, ReminderConfiguration[]>);

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reminder Settings</h1>
            <p className="mt-2 text-gray-600">
              Configure when and how often to send payment and rent reminders
            </p>
          </div>
          {!isEditing && (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Configuration
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configurations List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Configurations</CardTitle>
                <CardDescription>Active reminder rules</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                  </div>
                ) : configurations.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-600">No configurations found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedConfigurations).map(([type, configs]) => (
                      <div key={type}>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          {getReminderTypeLabel(type)}
                        </h3>
                        <div className="space-y-2">
                          {configs.map((config) => (
                            <div
                              key={config.id}
                              onClick={() => handleEdit(config)}
                              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                selectedConfig?.id === config.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {getTimingTypeLabel(config.timing_type, config.days_offset)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Frequency: {getFrequencyLabel(config.frequency)}
                                  </p>
                                  {!config.is_active && (
                                    <p className="text-xs text-red-500 mt-1">Inactive</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configuration Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {selectedConfig ? 'Edit Configuration' : 'Create New Configuration'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleCancel}
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reminder Type
                    </label>
                    <select
                      value={formData.reminder_type}
                      onChange={(e) => handleInputChange('reminder_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="rent_due">Rent Due</option>
                      <option value="rent_overdue">Rent Overdue</option>
                      <option value="payment_due">Payment Due</option>
                      <option value="payment_overdue">Payment Overdue</option>
                      <option value="maintenance_due">Maintenance Due</option>
                      <option value="maintenance_overdue">Maintenance Overdue</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timing
                    </label>
                    <select
                      value={formData.timing_type}
                      onChange={(e) => handleInputChange('timing_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="before">Before Due Date</option>
                      <option value="on_date">On Due Date</option>
                      <option value="after">After Due Date</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days Offset
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.days_offset}
                      onChange={(e) => handleInputChange('days_offset', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 7"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.timing_type === 'before' && 'Number of days before the due date to send reminder'}
                      {formData.timing_type === 'on_date' && 'This will be 0 (sent on the due date)'}
                      {formData.timing_type === 'after' && 'Number of days after the due date to send reminder'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => handleInputChange('frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="once">Once</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      How often to send this reminder (only applies if timing conditions are met)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.sort_order}
                      onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower numbers are processed first
                    </p>
                  </div>

                  <div className="flex items-center pt-4 border-t border-gray-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  {selectedConfig?.id && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(selectedConfig.id!)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Configuration
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No configuration selected</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Select a configuration from the list or create a new one
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

