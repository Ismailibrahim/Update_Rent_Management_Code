'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';
import { Input } from '../../components/UI/Input';
import { Settings, Save, Building2, DollarSign, Bell, FileText, Mail, Send } from 'lucide-react';
import Link from 'next/link';
import { settingsAPI, emailSettingsAPI, EmailSetting } from '../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../components/Layout/SidebarLayout';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [emailSettings, setEmailSettings] = useState<Partial<EmailSetting>>({
    provider: 'smtp',
    host: '',
    port: 587,
    encryption: 'tls',
    username: '',
    password: '',
    from_address: '',
    from_name: '',
    is_active: true,
  });
  const [settings, setSettings] = useState({
    company_name: '',
    company_email: '',
    company_phone: '',
    company_address: '',
    default_currency: 'MVR',
    timezone: 'Indian/Maldives',
    rent_due_day: 1,
    late_fee_amount: 0,
    late_fee_percentage: 0,
    maintenance_email: '',
    notification_email: '',
    auto_reminders: true,
    reminder_days_before: 3,
    invoice_template: 'default',
    payment_methods: ['cash', 'bank_transfer', 'check'],
    property_types: ['apartment', 'house', 'villa', 'studio'],
    payment_types: ['rent', 'deposit', 'maintenance', 'utilities']
  });

  useEffect(() => {
    fetchSettings();
    fetchEmailSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await settingsAPI.getDropdowns();
      // In a real app, you'd have a dedicated settings endpoint
      // Settings will be loaded and applied here when backend endpoint is available
      if (response.data) {
        // Apply settings from response when available
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // In a real app, you'd save settings to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const response = await emailSettingsAPI.get();
      if (response.data?.success && response.data.data) {
        setEmailSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
    }
  };

  const handleEmailSettingChange = (field: string, value: string | number | boolean) => {
    setEmailSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEmailSettings = async () => {
    setEmailLoading(true);
    try {
      const response = await emailSettingsAPI.save(emailSettings);
      if (response.data?.success) {
        toast.success('Email settings saved successfully');
        await fetchEmailSettings();
      } else {
        toast.error(response.data?.message || 'Failed to save email settings');
      }
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save email settings');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please enter an email address');
      return;
    }
    
    setTestEmailLoading(true);
    try {
      const response = await emailSettingsAPI.test({
        email: testEmailAddress,
        name: 'Test User'
      });
      if (response.data?.success) {
        toast.success('Test email sent successfully!');
      } else {
        toast.error(response.data?.message || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your application settings and preferences
            </p>
          </div>
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>

        {/* Company Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Company Information</CardTitle>
                <CardDescription>Basic company details and contact information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <Input
                  value={settings.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                <Input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => handleInputChange('company_email', e.target.value)}
                  placeholder="Enter company email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Phone</label>
                <Input
                  value={settings.company_phone}
                  onChange={(e) => handleInputChange('company_phone', e.target.value)}
                  placeholder="Enter company phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Currency</label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => handleInputChange('default_currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MVR">MVR (Maldivian Rufiyaa)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
              <textarea
                value={settings.company_address}
                onChange={(e) => handleInputChange('company_address', e.target.value)}
                placeholder="Enter company address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Financial Settings</CardTitle>
                <CardDescription>Rent collection and payment preferences</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rent Due Day</label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={settings.rent_due_day}
                  onChange={(e) => handleInputChange('rent_due_day', parseInt(e.target.value))}
                  placeholder="Day of month"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.late_fee_amount}
                  onChange={(e) => handleInputChange('late_fee_amount', parseFloat(e.target.value))}
                  placeholder="Fixed late fee"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Percentage</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.late_fee_percentage}
                  onChange={(e) => handleInputChange('late_fee_percentage', parseFloat(e.target.value))}
                  placeholder="Percentage"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Notification Settings</CardTitle>
                <CardDescription>Email notifications and reminders</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Email</label>
                <Input
                  type="email"
                  value={settings.maintenance_email}
                  onChange={(e) => handleInputChange('maintenance_email', e.target.value)}
                  placeholder="maintenance@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notification Email</label>
                <Input
                  type="email"
                  value={settings.notification_email}
                  onChange={(e) => handleInputChange('notification_email', e.target.value)}
                  placeholder="notifications@company.com"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.auto_reminders}
                  onChange={(e) => handleInputChange('auto_reminders', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">Enable automatic reminders</span>
              </label>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Remind</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.reminder_days_before}
                  onChange={(e) => handleInputChange('reminder_days_before', parseInt(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-gray-700">days before due date</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email Configuration</CardTitle>
                  <CardDescription>Configure SMTP or Office 365 for sending email reminders</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/settings/reminder-settings">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Reminder Settings
                  </Button>
                </Link>
                <Link href="/settings/email-templates">
                  <Button variant="outline" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Email Templates
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Provider</label>
                <select
                  value={emailSettings.provider}
                  onChange={(e) => {
                    const provider = e.target.value as 'smtp' | 'office365';
                    handleEmailSettingChange('provider', provider);
                    if (provider === 'office365') {
                      handleEmailSettingChange('host', 'smtp.office365.com');
                      handleEmailSettingChange('port', 587);
                      handleEmailSettingChange('encryption', 'tls');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="smtp">SMTP</option>
                  <option value="office365">Office 365</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                <Input
                  value={emailSettings.host || ''}
                  onChange={(e) => handleEmailSettingChange('host', e.target.value)}
                  placeholder={emailSettings.provider === 'office365' ? 'smtp.office365.com' : 'smtp.example.com'}
                  disabled={emailSettings.provider === 'office365'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                <Input
                  type="number"
                  value={emailSettings.port || 587}
                  onChange={(e) => handleEmailSettingChange('port', parseInt(e.target.value))}
                  placeholder="587"
                  disabled={emailSettings.provider === 'office365'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Encryption</label>
                <select
                  value={emailSettings.encryption}
                  onChange={(e) => handleEmailSettingChange('encryption', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={emailSettings.provider === 'office365'}
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                <Input
                  type="email"
                  value={emailSettings.username || ''}
                  onChange={(e) => handleEmailSettingChange('username', e.target.value)}
                  placeholder="your-email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <Input
                  type="password"
                  value={emailSettings.password || ''}
                  onChange={(e) => handleEmailSettingChange('password', e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Email Address</label>
                <Input
                  type="email"
                  value={emailSettings.from_address || ''}
                  onChange={(e) => handleEmailSettingChange('from_address', e.target.value)}
                  placeholder="noreply@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                <Input
                  value={emailSettings.from_name || ''}
                  onChange={(e) => handleEmailSettingChange('from_name', e.target.value)}
                  placeholder="Company Name"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={emailSettings.is_active}
                  onChange={(e) => handleEmailSettingChange('is_active', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label className="text-sm font-medium text-gray-700">Enable email notifications</label>
              </div>
              <div className="flex gap-2">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="test@example.com"
                    className="w-64"
                  />
                  <Button
                    onClick={handleTestEmail}
                    disabled={testEmailLoading || !testEmailAddress}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {testEmailLoading ? 'Sending...' : 'Test Email'}
                  </Button>
                </div>
                <Button
                  onClick={handleSaveEmailSettings}
                  disabled={emailLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {emailLoading ? 'Saving...' : 'Save Email Settings'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-500 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">System Settings</CardTitle>
                <CardDescription>Application preferences and configurations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleInputChange('timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Indian/Maldives">Indian/Maldives</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Template</label>
                <div className="flex gap-2">
                  <select
                    value={settings.invoice_template}
                    onChange={(e) => handleInputChange('invoice_template', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="default">Default Template</option>
                    <option value="modern">Modern Template</option>
                    <option value="classic">Classic Template</option>
                  </select>
                  <Link href="/settings/invoice-templates">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 px-4 py-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                      title="Manage Templates"
                    >
                      <FileText className="h-4 w-4" />
                      Manage
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
