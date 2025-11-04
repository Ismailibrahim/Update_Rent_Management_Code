'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/UI/Card';
import { Button } from '../../../components/UI/Button';
import { Input } from '../../../components/UI/Input';
import { Save, TestTube } from 'lucide-react';
import { smsSettingsAPI, smsNotificationsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SidebarLayout from '../../../components/Layout/SidebarLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function SmsSettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    sms_api_url: '',
    sms_api_key: '',
    sms_api_secret: '',
    sms_sender_id: '',
    sms_enabled: 'false',
    rent_reminder_day: '1',
    rent_reminder_time: '09:00',
    timezone: 'Indian/Maldives',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchSettings();
    }
  }, [user, authLoading, router]);

  const fetchSettings = async () => {
    try {
      const response = await smsSettingsAPI.getAll();
      if (response.data.success) {
        const settingsMap: Record<string, string> = {};
        const settingsArray = Object.values(response.data.data.settings);
        settingsArray.forEach((setting: any) => {
          settingsMap[setting.setting_key] = setting.setting_value || '';
        });
        setSettings(prev => ({ ...prev, ...settingsMap }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load SMS settings');
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || '',
      }));

      await smsSettingsAPI.update(settingsArray);
      toast.success('SMS settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await smsNotificationsAPI.testConnection();
      if (response.data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error('Connection test failed: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error testing connection:', error);
      toast.error('Connection test failed: ' + (error.response?.data?.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SMS Settings</h1>
          <p className="mt-2 text-gray-600">Configure SMS API and notification settings</p>
        </div>

        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">API Configuration</CardTitle>
            <CardDescription className="text-gray-600">
              Configure Dhiraagu SMS API credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API URL *
              </label>
              <Input
                type="url"
                placeholder="https://api.dhiraagu.com/sms"
                value={settings.sms_api_url}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_api_url: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key *
              </label>
              <Input
                type="password"
                placeholder="Enter API key"
                value={settings.sms_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_api_key: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Secret *
              </label>
              <Input
                type="password"
                placeholder="Enter API secret"
                value={settings.sms_api_secret}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_api_secret: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sender ID
              </label>
              <Input
                placeholder="Enter sender ID (phone number or name)"
                value={settings.sms_sender_id}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_sender_id: e.target.value }))}
                maxLength={11}
              />
              <p className="mt-1 text-xs text-gray-500">
                Sender ID should be up to 11 characters, alphanumeric without spaces
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t">
              <input
                type="checkbox"
                id="sms_enabled"
                checked={settings.sms_enabled === 'true'}
                onChange={(e) => setSettings(prev => ({ ...prev, sms_enabled: e.target.checked ? 'true' : 'false' }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="sms_enabled" className="text-sm font-medium text-gray-700">
                Enable SMS Service
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleTestConnection}
                disabled={testing || loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Reminder Settings</CardTitle>
            <CardDescription className="text-gray-600">
              Configure automated rent reminder schedule
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Day (Day of Month) *
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="1"
                value={settings.rent_reminder_day}
                onChange={(e) => setSettings(prev => ({ ...prev, rent_reminder_day: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Day of the month to send rent reminders (1-31)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reminder Time *
              </label>
              <Input
                type="time"
                value={settings.rent_reminder_time}
                onChange={(e) => setSettings(prev => ({ ...prev, rent_reminder_time: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Time to send reminders (24-hour format)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone *
              </label>
              <Input
                placeholder="Indian/Maldives"
                value={settings.timezone}
                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
              />
              <p className="mt-1 text-xs text-gray-500">
                Timezone for scheduling reminders
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}

