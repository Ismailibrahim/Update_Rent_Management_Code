'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { FileText, Plus, Edit, Trash2, Save, X, Eye, Star } from 'lucide-react';
import { emailTemplatesAPI, EmailTemplate } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [formData, setFormData] = useState({
    reminder_type: 'default' as EmailTemplate['reminder_type'],
    name: '',
    subject: '',
    body_html: '',
    body_text: '',
    is_active: true,
    is_default: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await emailTemplatesAPI.getAll();
      if (response.data?.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setIsEditing(true);
    setFormData({
      reminder_type: 'default',
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      is_active: true,
      is_default: false,
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditing(true);
    setFormData({
      reminder_type: template.reminder_type,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      body_text: template.body_text || '',
      is_active: template.is_active,
      is_default: template.is_default,
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.subject || !formData.body_html) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (selectedTemplate?.id) {
        await emailTemplatesAPI.update(selectedTemplate.id, formData);
        toast.success('Email template updated successfully');
      } else {
        await emailTemplatesAPI.create(formData);
        toast.success('Email template created successfully');
      }
      setIsEditing(false);
      setSelectedTemplate(null);
      await fetchTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.response?.data?.message || 'Failed to save email template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await emailTemplatesAPI.delete(id);
      toast.success('Email template deleted successfully');
      await fetchTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.message || 'Failed to delete email template');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedTemplate(null);
    setFormData({
      reminder_type: 'default',
      name: '',
      subject: '',
      body_html: '',
      body_text: '',
      is_active: true,
      is_default: false,
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
      'default': 'Default Template',
    };
    return labels[type] || type;
  };

  const availableVariables = [
    { name: 'tenant_name', description: 'Tenant full name' },
    { name: 'tenant_email', description: 'Tenant email address' },
    { name: 'tenant_phone', description: 'Tenant phone number' },
    { name: 'amount', description: 'Invoice/payment amount' },
    { name: 'due_date', description: 'Due date (YYYY-MM-DD)' },
    { name: 'due_date_formatted', description: 'Due date (Formatted: January 1, 2024)' },
    { name: 'invoice_number', description: 'Invoice number' },
    { name: 'days_overdue', description: 'Number of days overdue' },
    { name: 'property_name', description: 'Property name' },
    { name: 'unit_name', description: 'Unit number/name' },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Templates</h1>
            <p className="mt-2 text-gray-600">
              Create and manage email templates for automated reminders
            </p>
          </div>
          {!isEditing && (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Select a template to edit</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading templates...</p>
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-gray-600">No templates found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => handleEdit(template)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{template.name}</h3>
                              {template.is_default && (
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {getReminderTypeLabel(template.reminder_type)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{template.subject}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-2">
            {isEditing ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {selectedTemplate ? 'Edit Template' : 'Create New Template'}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reminder Type
                      </label>
                      <select
                        value={formData.reminder_type}
                        onChange={(e) => handleInputChange('reminder_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="default">Default Template</option>
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
                        Template Name
                      </label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., Rent Due Reminder"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Subject
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => handleInputChange('subject', e.target.value)}
                      placeholder="e.g., Rent Payment Due - {{tenant_name}}"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use variables like {'{{tenant_name}}'}, {'{{amount}}'}, {'{{due_date}}'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      HTML Body
                    </label>
                    <textarea
                      value={formData.body_html}
                      onChange={(e) => handleInputChange('body_html', e.target.value)}
                      placeholder="<html><body><h2>Dear {{tenant_name}},</h2><p>Your rent payment of {{amount}} is due on {{due_date_formatted}}.</p></body></html>"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={12}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plain Text Body (Optional)
                    </label>
                    <textarea
                      value={formData.body_text}
                      onChange={(e) => handleInputChange('body_text', e.target.value)}
                      placeholder="Plain text version of the email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_default}
                        onChange={(e) => handleInputChange('is_default', e.target.checked)}
                        className="rounded border-gray-300 mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700">Set as Default</span>
                    </label>
                  </div>

                  {/* Available Variables */}
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Available Variables</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {availableVariables.map((variable) => (
                        <div key={variable.name} className="flex items-center gap-2">
                          <code className="bg-gray-100 px-2 py-1 rounded">{'{{'}{variable.name}{'}}'}</code>
                          <span className="text-gray-600">{variable.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  {showPreview && (
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Preview</h4>
                      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="text-xs text-gray-500 mb-2">Subject: {formData.subject}</div>
                        <div
                          className="prose max-w-none"
                          dangerouslySetInnerHTML={{ __html: formData.body_html }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedTemplate?.id && (
                    <div className="pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={() => handleDelete(selectedTemplate.id!)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Template
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No template selected</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Select a template from the list or create a new one
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

