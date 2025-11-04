<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use App\Models\CurrencyRate;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = SystemSetting::all()->keyBy('setting_key');
        $currencyRates = CurrencyRate::orderBy('effective_date', 'desc')
                                   ->orderBy('from_currency')
                                   ->get();

        return response()->json([
            'settings' => $settings,
            'currency_rates' => $currencyRates
        ]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $validated = $request->validate([
            'value' => 'required|string',
            'description' => 'nullable|string'
        ]);

        $setting = SystemSetting::setValue(
            $key,
            $validated['value'],
            $validated['description'] ?? null
        );

        return response()->json($setting);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048'
        ]);

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $filename = 'company_logo_' . time() . '.' . $file->getClientOriginalExtension();

            // Store in public/logos directory
            $path = $file->storeAs('logos', $filename, 'public');

            // Return the public URL
            $url = Storage::url($path);

            return response()->json([
                'url' => $url,
                'path' => $path,
                'message' => 'Logo uploaded successfully'
            ]);
        }

        return response()->json(['error' => 'No file uploaded'], 400);
    }
}