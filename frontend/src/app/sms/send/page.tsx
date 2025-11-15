'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Select } from '../../../components/UI/Select';
import { Textarea } from '../../../components/UI/Textarea';
import { Send, Users, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { smsTemplatesAPI, smsNotificationsAPI, tenantsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: number;
  full_name: string;
  phone: string;
}

interface SmsTemplate {
  id: number;
  name: string;
  content: string;
}

interface SendResult {
  tenant_id: number;
  success: boolean;
  message: string;
}

export default function SendSmsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [preview, setPreview] = useState('');
  const [results, setResults] = useState<SendResult[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchTenants();
      fetchTemplates();
    }
  }, [user, authLoading, router]);

  const fetchTenants = async () => {
    try {
      const response = await tenantsAPI.getAll();
      if (response.data.success) {
        const tenantsWithPhone = response.data.data.filter((t: Tenant) => t.phone);
        setTenants(tenantsWithPhone);
      }
    } catch (error: any) {
      toast.error('Failed to fetch tenants');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await smsTemplatesAPI.getAll();
      if (response.data.success) {
        setTemplates(response.data.data.filter((t: SmsTemplate) => t.is_active));
      }
    } catch (error: any) {
      toast.error('Failed to fetch templates');
    }
  };

  const handlePreview = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    try {
      setLoading(true);
      const previewData: {
        template_id: number;
        tenant_id?: number;
        custom_data?: Record<string, unknown>;
      } = {
        template_id: selectedTemplate,
      };

      // If tenant is selected, use their data for preview
      if (selectedTenants.length > 0) {
        previewData.tenant_id = selectedTenants[0];
      }

      const response = await smsNotificationsAPI.previewTemplate(previewData);
      if (response.data.success) {
        setPreview(response.data.data.preview);
        toast.success('Template preview generated');
      } else {
        toast.error(response.data.message || 'Failed to preview template');
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error.response?.data?.message || 'Failed to preview template');
      setPreview('');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (selectedTenants.length === 0) {
      toast.error('Please select at least one tenant');
      return;
    }

    if (!selectedTemplate && !customMessage.trim()) {
      toast.error('Please select a template or enter a custom message');
      return;
    }

    if (!confirm(`Send SMS to ${selectedTenants.length} tenant(s)?`)) return;

    try {
      setLoading(true);
      setResults([]);
      const response = await smsNotificationsAPI.sendManual({
        tenant_ids: selectedTenants,
        template_id: selectedTemplate || undefined,
        message: customMessage || undefined,
      });

      if (response.data.success) {
        setResults(response.data.data.results || []);
        const summary = response.data.data.summary;
        toast.success(`Sent ${summary.success} SMS successfully, ${summary.failed} failed`);
        
        // Reset form
        setSelectedTenants([]);
        setSelectedTemplate(null);
        setCustomMessage('');
        setPreview('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send SMS');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Send SMS</h1>
          <p className="text-gray-600 mt-1">Send SMS messages to tenants</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Select tenants and template or write custom message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Tenants *
                </label>
                <Select
                  value=""
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    if (id && !selectedTenants.includes(id)) {
                      setSelectedTenants([...selectedTenants, id]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">Select tenant...</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id.toString()}>
                      {tenant.full_name} ({tenant.phone})
                    </option>
                  ))}
                </Select>
                {selectedTenants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTenants.map((tenantId) => {
                      const tenant = tenants.find((t) => t.id === tenantId);
                      return tenant ? (
                        <span
                          key={tenantId}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {tenant.full_name}
                          <button
                            onClick={() => setSelectedTenants(selectedTenants.filter((id) => id !== tenantId))}
                            className="ml-1 hover:text-blue-900"
                          >
                            ×
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Template (Optional)
                </label>
                <Select
                  value={selectedTemplate?.toString() || ''}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value ? parseInt(e.target.value) : null);
                    setCustomMessage('');
                  }}
                >
                  <option value="">Custom Message</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id.toString()}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>

              {selectedTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreview}
                  disabled={loading}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {loading ? 'Generating Preview...' : 'Preview Template'}
                </Button>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {selectedTemplate ? 'Custom Message (Optional - overrides template)' : 'Custom Message *'}
                </label>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={6}
                  placeholder={selectedTemplate ? 'Leave empty to use template...' : 'Enter your message...'}
                  disabled={!!selectedTemplate && !customMessage}
                />
              </div>

              {preview && (
                <div className="p-3 bg-gray-50 rounded border">
                  <p className="text-sm font-medium text-gray-700 mb-1">Preview:</p>
                  <p className="text-sm text-gray-600">{preview}</p>
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={loading || selectedTenants.length === 0 || (!selectedTemplate && !customMessage.trim())}
                className="w-full flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {loading ? 'Sending...' : `Send to ${selectedTenants.length} Tenant(s)`}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send Results</CardTitle>
              <CardDescription>Results from the last send operation</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No results yet. Send an SMS to see results here.
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result, index) => {
                    const tenant = tenants.find((t) => t.id === result.tenant_id);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded border ${
                          result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {tenant?.full_name || `Tenant #${result.tenant_id}`}
                            </p>
                            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                              {result.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}

