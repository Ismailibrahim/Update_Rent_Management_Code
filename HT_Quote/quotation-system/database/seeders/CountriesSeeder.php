<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Country;

class CountriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $countries = [
            ['name' => 'Maldives', 'sort_order' => 1],
            ['name' => 'United States', 'sort_order' => 2],
            ['name' => 'United Kingdom', 'sort_order' => 3],
            ['name' => 'Canada', 'sort_order' => 4],
            ['name' => 'Australia', 'sort_order' => 5],
            ['name' => 'Germany', 'sort_order' => 6],
            ['name' => 'France', 'sort_order' => 7],
            ['name' => 'Italy', 'sort_order' => 8],
            ['name' => 'Spain', 'sort_order' => 9],
            ['name' => 'Netherlands', 'sort_order' => 10],
            ['name' => 'Switzerland', 'sort_order' => 11],
            ['name' => 'Austria', 'sort_order' => 12],
            ['name' => 'Belgium', 'sort_order' => 13],
            ['name' => 'Denmark', 'sort_order' => 14],
            ['name' => 'Sweden', 'sort_order' => 15],
            ['name' => 'Norway', 'sort_order' => 16],
            ['name' => 'Finland', 'sort_order' => 17],
            ['name' => 'Japan', 'sort_order' => 18],
            ['name' => 'South Korea', 'sort_order' => 19],
            ['name' => 'Singapore', 'sort_order' => 20],
            ['name' => 'Hong Kong', 'sort_order' => 21],
            ['name' => 'United Arab Emirates', 'sort_order' => 22],
            ['name' => 'Saudi Arabia', 'sort_order' => 23],
            ['name' => 'Qatar', 'sort_order' => 24],
            ['name' => 'Kuwait', 'sort_order' => 25],
            ['name' => 'Bahrain', 'sort_order' => 26],
            ['name' => 'Oman', 'sort_order' => 27],
            ['name' => 'India', 'sort_order' => 28],
            ['name' => 'Sri Lanka', 'sort_order' => 29],
            ['name' => 'Thailand', 'sort_order' => 30],
            ['name' => 'Malaysia', 'sort_order' => 31],
            ['name' => 'Indonesia', 'sort_order' => 32],
            ['name' => 'Philippines', 'sort_order' => 33],
            ['name' => 'Vietnam', 'sort_order' => 34],
            ['name' => 'China', 'sort_order' => 35],
            ['name' => 'Taiwan', 'sort_order' => 36],
            ['name' => 'New Zealand', 'sort_order' => 37],
            ['name' => 'South Africa', 'sort_order' => 38],
            ['name' => 'Brazil', 'sort_order' => 39],
            ['name' => 'Argentina', 'sort_order' => 40],
            ['name' => 'Chile', 'sort_order' => 41],
            ['name' => 'Mexico', 'sort_order' => 42],
            ['name' => 'Russia', 'sort_order' => 43],
            ['name' => 'Turkey', 'sort_order' => 44],
            ['name' => 'Egypt', 'sort_order' => 45],
            ['name' => 'Israel', 'sort_order' => 46],
            ['name' => 'Lebanon', 'sort_order' => 47],
            ['name' => 'Jordan', 'sort_order' => 48],
            ['name' => 'Morocco', 'sort_order' => 49],
            ['name' => 'Tunisia', 'sort_order' => 50],
        ];

        foreach ($countries as $country) {
            Country::updateOrCreate(
                ['name' => $country['name']],
                ['name' => $country['name'], 'sort_order' => $country['sort_order']]
            );
        }
    }
}

