"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle, Building2, Upload, X, MapPin, Users, Briefcase } from "lucide-react";
import { api, settingsApi } from "@/lib/api";

interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

interface CurrencyRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_date: string;
}

interface SettingsData {
  settings: { [key: string]: SystemSetting };
  currency_rates: CurrencyRate[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<{ [key: string]: SystemSetting }>({});
  const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form state for editing settings
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Company settings form state
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_tax_number: '',
    company_logo: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      const data: SettingsData = response.data;
      setSettings(data.settings);
      setCurrencyRates(data.currency_rates);

      // Load company settings
      const companyData = {
        company_name: data.settings['company_name']?.setting_value || '',
        company_address: data.settings['company_address']?.setting_value || '',
        company_phone: data.settings['company_phone']?.setting_value || '',
        company_email: data.settings['company_email']?.setting_value || '',
        company_tax_number: data.settings['company_tax_number']?.setting_value || '',
        company_logo: data.settings['company_logo']?.setting_value || ''
      };
      setCompanySettings(companyData);
      if (companyData.company_logo) {
        // Check if it's a full URL or just a path
        const logoUrl = companyData.company_logo.startsWith('http')
          ? companyData.company_logo
          : `http://127.0.0.1:8000${companyData.company_logo}`;
        setLogoPreview(logoUrl);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingSetting(setting.setting_key);
    setEditValue(setting.setting_value);
    setEditDescription(setting.description || '');
  };

  const handleCancel = () => {
    setEditingSetting(null);
    setEditValue("");
    setEditDescription("");
  };

  const handleSave = async (key: string) => {
    try {
      setSaving(true);
      await api.post(`/settings/${key}`, {
        value: editValue,
        description: editDescription
      });

      // Update local state
      setSettings(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          setting_value: editValue,
          description: editDescription
        }
      }));

      setEditingSetting(null);
      setEditValue("");
      setEditDescription("");
      setMessage({ type: 'success', text: 'Setting updated successfully' });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving setting:', error);
      setMessage({ type: 'error', text: 'Failed to save setting' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setCompanySettings(prev => ({ ...prev, company_logo: '' }));
  };

  const handleCompanySettingChange = (key: string, value: string) => {
    setCompanySettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveCompanySettings = async () => {
    try {
      setSaving(true);

      // Upload logo if there's a new file
      let logoUrl = companySettings.company_logo;
      if (logoFile) {
        try {
          console.log('Uploading logo file:', logoFile);
          const uploadResponse = await settingsApi.uploadLogo(logoFile);
          console.log('Upload response:', uploadResponse.data);
          logoUrl = uploadResponse.data.url;
          console.log('Logo URL after upload:', logoUrl);
        } catch (uploadError: any) {
          console.error('Upload error:', uploadError);
          console.error('Error response data:', uploadError.response?.data);
          console.error('Error response status:', uploadError.response?.status);
          const errors = uploadError.response?.data?.errors;
          const errorMessage = errors
            ? Object.entries(errors).map(([key, msgs]: [string, any]) => `${key}: ${msgs.join(', ')}`).join('; ')
            : uploadError.response?.data?.message || 'Logo upload failed';
          setMessage({ type: 'error', text: errorMessage });
          setSaving(false);
          return;
        }
      }

      // Save all company settings - only save if value is not empty or if it's the logo
      const settingsToSave = [
        { key: 'company_name', value: String(companySettings.company_name || 'Not Set') },
        { key: 'company_address', value: String(companySettings.company_address || 'Not Set') },
        { key: 'company_phone', value: String(companySettings.company_phone || 'Not Set') },
        { key: 'company_email', value: String(companySettings.company_email || 'Not Set') },
        { key: 'company_tax_number', value: String(companySettings.company_tax_number || 'Not Set') },
        { key: 'company_logo', value: String(logoUrl || 'Not Set') }
      ];

      console.log('Settings to save:', settingsToSave);

      for (const setting of settingsToSave) {
        try {
          const requestBody = {
            value: setting.value,
            description: `Company ${setting.key.replace('company_', '').replace(/_/g, ' ')}`
          };
          console.log(`Saving ${setting.key}`);
          console.log('Request body:', requestBody);
          console.log('Value type:', typeof setting.value);
          console.log('Value length:', setting.value?.length);

          await api.post(`/settings/${setting.key}`, requestBody);
          console.log(`✓ Successfully saved ${setting.key}`);
        } catch (settingError: any) {
          console.error(`✗ Error saving ${setting.key}:`, settingError);
          console.error('Request was:', {
            value: setting.value,
            description: `Company ${setting.key.replace('company_', '').replace(/_/g, ' ')}`
          });
          console.error('Full error response:', settingError.response?.data);
          const errorMsg = settingError.response?.data?.message || settingError.response?.data?.errors
            || `Failed to save ${setting.key}`;
          setMessage({ type: 'error', text: `Error saving ${setting.key}: ${JSON.stringify(errorMsg)}` });
          setSaving(false);
          return;
        }
      }

      setMessage({ type: 'success', text: 'Company settings saved successfully' });
      setTimeout(() => setMessage(null), 3000);
      await loadSettings(); // Reload to get updated data
    } catch (error: any) {
      console.error('Error saving company settings:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.errors || 'Failed to save company settings';
      setMessage({ type: 'error', text: JSON.stringify(errorMsg) });
    } finally {
      setSaving(false);
    }
  };

  const getSettingDisplayName = (key: string): string => {
    const displayNames: { [key: string]: string } = {
      'quotation_validity_days': 'Quotation Validity (Days)',
      'default_tax_rate': 'Default Tax Rate (%)',
      'company_name': 'Company Name',
      'company_address': 'Company Address',
      'company_tax_number': 'Company Tax Number',
      'default_currency': 'Default Currency',
      'quotation_number_prefix': 'Quotation Number Prefix',
      'quotation_number_format': 'Quotation Number Format',
      'import_duty_percentage': 'Import Duty Percentage (%)',
    };
    return displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getSettingType = (key: string): 'number' | 'text' | 'textarea' => {
    if (key.includes('percentage') || key.includes('rate') || key.includes('days')) {
      return 'number';
    }
    if (key.includes('address') || key.includes('format')) {
      return 'textarea';
    }
    return 'text';
  };

  const getSettingPlaceholder = (key: string): string => {
    const placeholders: { [key: string]: string } = {
      'quotation_validity_days': 'Enter number of days',
      'default_tax_rate': 'Enter percentage (e.g., 8.00)',
      'company_name': 'Enter company name',
      'company_address': 'Enter full address',
      'company_tax_number': 'Enter tax identification number',
      'default_currency': 'Enter currency code (e.g., USD, MVR)',
      'quotation_number_prefix': 'Enter prefix (e.g., Q, QUO)',
      'quotation_number_format': 'Enter format with placeholders',
      'import_duty_percentage': 'Enter percentage (e.g., 5.00)',
    };
    return placeholders[key] || 'Enter value';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">System Settings</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <a href="/dashboard/settings/countries">
              <MapPin className="h-4 w-4 mr-2" />
              Manage Countries
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/settings/contact-types">
              <Users className="h-4 w-4 mr-2" />
              Contact Types
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/settings/designations">
              <Briefcase className="h-4 w-4 mr-2" />
              Designations
            </a>
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center space-x-2 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="grid gap-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Company Information</CardTitle>
            </div>
            <CardDescription>
              Manage your company details that will appear on quotations and invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={companySettings.company_name}
                  onChange={(e) => handleCompanySettingChange('company_name', e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone Number</Label>
                <Input
                  id="company_phone"
                  value={companySettings.company_phone}
                  onChange={(e) => handleCompanySettingChange('company_phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address">Address</Label>
              <Textarea
                id="company_address"
                value={companySettings.company_address}
                onChange={(e) => handleCompanySettingChange('company_address', e.target.value)}
                placeholder="Enter full address (multiple lines supported)"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company_email">Email Address</Label>
                <Input
                  id="company_email"
                  value={companySettings.company_email}
                  onChange={(e) => handleCompanySettingChange('company_email', e.target.value)}
                  placeholder="info@company.com"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_tax_number">Tax ID / Registration Number</Label>
                <Input
                  id="company_tax_number"
                  value={companySettings.company_tax_number}
                  onChange={(e) => handleCompanySettingChange('company_tax_number', e.target.value)}
                  placeholder="Enter tax identification number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_logo">Company Logo</Label>
              <div className="flex items-start space-x-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="h-24 w-24 object-contain border rounded-lg p-2"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-24 w-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-gray-50">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <Input
                    id="company_logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">
                    Upload your company logo (PNG, JPG, SVG recommended). Max size: 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveCompanySettings} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Company Information
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Manage global system settings that affect quotations and business operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-sm">Setting Name</th>
                    <th className="text-left p-4 font-medium text-sm">Key</th>
                    <th className="text-left p-4 font-medium text-sm">Current Value</th>
                    <th className="text-left p-4 font-medium text-sm">Description</th>
                    <th className="text-left p-4 font-medium text-sm">Last Updated</th>
                    <th className="text-center p-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(settings).map((setting) => (
                    <tr key={setting.id} className="border-b hover:bg-gray-50">
                      {editingSetting === setting.setting_key ? (
                        <td colSpan={6} className="p-4">
                          <div className="space-y-4 bg-blue-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                  {getSettingDisplayName(setting.setting_key)}
                                </Label>
                                {getSettingType(setting.setting_key) === 'textarea' ? (
                                  <Textarea
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder={getSettingPlaceholder(setting.setting_key)}
                                    rows={3}
                                  />
                                ) : (
                                  <Input
                                    type={getSettingType(setting.setting_key)}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder={getSettingPlaceholder(setting.setting_key)}
                                  />
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Description (Optional)</Label>
                                <Textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Add a description for this setting"
                                  rows={3}
                                />
                              </div>
                            </div>

                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSave(setting.setting_key)}
                                disabled={saving}
                              >
                                {saving ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancel}
                                disabled={saving}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="p-4 font-medium">
                            {getSettingDisplayName(setting.setting_key)}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="text-xs font-mono">
                              {setting.setting_key}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="font-mono text-sm max-w-xs truncate" title={setting.setting_value}>
                              {setting.setting_value}
                            </div>
                          </td>
                          <td className="p-4 text-sm text-gray-600 max-w-xs">
                            {setting.description || '-'}
                          </td>
                          <td className="p-4 text-sm text-gray-500">
                            {new Date(setting.updated_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(setting)}
                            >
                              Edit
                            </Button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Currency Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Currency Exchange Rates</CardTitle>
            <CardDescription>
              Current currency exchange rates used in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currencyRates.length > 0 ? (
              <div className="space-y-4">
                {currencyRates.map((rate) => (
                  <div key={rate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {rate.from_currency} → {rate.to_currency}
                      </div>
                      <div className="text-sm text-gray-500">
                        Rate: {rate.rate ? Number(rate.rate).toFixed(4) : 'N/A'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(rate.effective_date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No currency rates configured
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


