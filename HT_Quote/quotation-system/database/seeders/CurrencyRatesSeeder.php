<?php

namespace Database\Seeders;

use App\Models\CurrencyRate;
use Illuminate\Database\Seeder;

class CurrencyRatesSeeder extends Seeder
{
    public function run(): void
    {
        $rates = [
            ['from_currency' => 'USD', 'to_currency' => 'MVR', 'exchange_rate' => 15.40, 'effective_date' => now()],
            ['from_currency' => 'MVR', 'to_currency' => 'USD', 'exchange_rate' => 0.065, 'effective_date' => now()],
        ];

        foreach ($rates as $rate) {
            CurrencyRate::updateOrCreate(
                [
                    'from_currency' => $rate['from_currency'],
                    'to_currency' => $rate['to_currency'],
                    'effective_date' => $rate['effective_date']
                ],
                $rate
            );
        }
    }
}