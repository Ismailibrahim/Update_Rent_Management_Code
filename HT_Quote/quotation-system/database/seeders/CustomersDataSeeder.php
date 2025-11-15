<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class CustomersDataSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/customers.json');
        if (!File::exists($path)) {
            $this->command?->warn('customers.json not found at database/seeders/data/customers.json - skipping CustomersDataSeeder');
            return;
        }

        $json = File::get($path);
        $records = json_decode($json, true) ?: [];

        foreach ($records as $attrs) {
            // Avoid mass-assigning primary keys or timestamps if present
            unset($attrs['id']);
            if (array_key_exists('created_at', $attrs)) unset($attrs['created_at']);
            if (array_key_exists('updated_at', $attrs)) unset($attrs['updated_at']);

            // Upsert by unique business key; fallback to resort_code+resort_name combo
            if (isset($attrs['resort_code']) && $attrs['resort_code'] !== null && $attrs['resort_code'] !== '') {
                Customer::updateOrCreate(['resort_code' => $attrs['resort_code']], $attrs);
            } else {
                Customer::updateOrCreate([
                    'resort_name' => $attrs['resort_name'] ?? null,
                    'address' => $attrs['address'] ?? null,
                ], $attrs);
            }
        }
    }
}


