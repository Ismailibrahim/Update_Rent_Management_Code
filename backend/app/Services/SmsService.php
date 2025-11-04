<?php

namespace App\Services;

use App\Models\SmsSetting;
use App\Models\SmsLog;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Exception;

class SmsService
{
    protected $apiUrl;
    protected $apiKey;
    protected $apiSecret;
    protected $senderId;
    protected $enabled;

    public function __construct()
    {
        $this->loadSettings();
    }

    protected function loadSettings()
    {
        $this->apiUrl = $this->getSetting('sms_api_url', '');
        $this->apiKey = $this->getSetting('sms_api_key', '');
        $this->apiSecret = $this->getSetting('sms_api_secret', '');
        $this->senderId = $this->getSetting('sms_sender_id', '');
        $this->enabled = $this->getSetting('sms_enabled', 'false') === 'true';
    }

    protected function getSetting($key, $default = null)
    {
        try {
            // Check if table exists (for migrations)
            if (!\Schema::hasTable('sms_settings')) {
                return $default;
            }
            $setting = SmsSetting::where('setting_key', $key)->first();
            return $setting ? $setting->setting_value : $default;
        } catch (\Exception $e) {
            // Table doesn't exist yet (during migrations)
            return $default;
        }
    }

    public function sendSms(string $phoneNumber, string $message, array $context = []): array
    {
        $smsLog = SmsLog::create([
            'tenant_id' => $context['tenant_id'] ?? null,
            'rental_unit_id' => $context['rental_unit_id'] ?? null,
            'template_id' => $context['template_id'] ?? null,
            'phone_number' => $phoneNumber,
            'message_content' => $message,
            'status' => 'pending',
        ]);

        try {
            if (!$this->enabled) {
                throw new Exception('SMS service is disabled');
            }

            if (empty($this->apiUrl) || empty($this->apiKey) || empty($this->apiSecret)) {
                throw new Exception('SMS API credentials are not configured');
            }

            $phoneNumber = $this->normalizePhoneNumber($phoneNumber);
            
            $response = Http::timeout(30)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $this->apiKey,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->apiUrl, [
                    'api_key' => $this->apiKey,
                    'api_secret' => $this->apiSecret,
                    'sender_id' => $this->senderId,
                    'recipient' => $phoneNumber,
                    'message' => $message,
                ]);

            $responseData = $response->json() ?? [];
            $isSuccess = $response->successful();

            $smsLog->update([
                'status' => $isSuccess ? 'sent' : 'failed',
                'api_response' => $responseData,
                'error_message' => $isSuccess ? null : ($responseData['error'] ?? $response->body() ?? 'Unknown error'),
                'sent_at' => $isSuccess ? now() : null,
            ]);

            if ($isSuccess) {
                Log::info('SMS sent successfully', [
                    'phone_number' => $phoneNumber,
                    'template_id' => $context['template_id'] ?? null,
                ]);

                return [
                    'success' => true,
                    'message' => 'SMS sent successfully',
                    'log_id' => $smsLog->id,
                    'response' => $responseData,
                ];
            } else {
                Log::error('SMS sending failed', [
                    'phone_number' => $phoneNumber,
                    'error' => $responseData['error'] ?? $response->body(),
                ]);

                return [
                    'success' => false,
                    'message' => 'Failed to send SMS',
                    'error' => $responseData['error'] ?? $response->body() ?? 'Unknown error',
                    'log_id' => $smsLog->id,
                ];
            }
        } catch (Exception $e) {
            $smsLog->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'api_response' => ['exception' => get_class($e)],
            ]);

            Log::error('SMS service exception', [
                'error' => $e->getMessage(),
                'phone_number' => $phoneNumber,
            ]);

            return [
                'success' => false,
                'message' => 'SMS sending failed: ' . $e->getMessage(),
                'error' => $e->getMessage(),
                'log_id' => $smsLog->id,
            ];
        }
    }

    protected function normalizePhoneNumber(string $phoneNumber): string
    {
        $phoneNumber = preg_replace('/\D/', '', $phoneNumber);
        
        if (strpos($phoneNumber, '960') === 0 && strlen($phoneNumber) > 10) {
            $phoneNumber = substr($phoneNumber, 3);
        }
        
        if (strlen($phoneNumber) === 7) {
            $phoneNumber = '960' . $phoneNumber;
        }
        
        return $phoneNumber;
    }

    public function testConnection(): array
    {
        try {
            if (!$this->enabled) {
                return ['success' => false, 'message' => 'SMS service is disabled'];
            }

            if (empty($this->apiUrl) || empty($this->apiKey) || empty($this->apiSecret)) {
                return ['success' => false, 'message' => 'SMS API credentials are not configured'];
            }

            return ['success' => true, 'message' => 'SMS service is configured and enabled'];
        } catch (Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
}

