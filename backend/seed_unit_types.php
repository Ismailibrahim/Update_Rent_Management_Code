<?php
/**
 * Simple script to seed rental unit types directly
 * Run: php seed_unit_types.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\RentalUnitType;

$unitTypes = [
    [
        'name' => 'Residential',
        'description' => 'Apartment, house, or other residential unit',
        'category' => 'unit',
        'is_active' => true
    ],
    [
        'name' => 'Office',
        'description' => 'Commercial office space',
        'category' => 'unit',
        'is_active' => true
    ],
    [
        'name' => 'Shop',
        'description' => 'Retail shop or store space',
        'category' => 'unit',
        'is_active' => true
    ],
    [
        'name' => 'Warehouse',
        'description' => 'Storage or warehouse facility',
        'category' => 'unit',
        'is_active' => true
    ],
    [
        'name' => 'Other',
        'description' => 'Other types of rental units',
        'category' => 'unit',
        'is_active' => true
    ]
];

echo "Seeding rental unit types...\n";

foreach ($unitTypes as $unitType) {
    // Check if unit type already exists (by name, case-insensitive)
    $existing = RentalUnitType::whereRaw('LOWER(name) = ?', [strtolower($unitType['name'])])->first();
    
    if (!$existing) {
        RentalUnitType::create($unitType);
        echo "Created: {$unitType['name']}\n";
    } else {
        // Update existing to ensure category is set
        $existing->update([
            'category' => 'unit',
            'is_active' => true
        ]);
        echo "Updated: {$unitType['name']}\n";
    }
}

echo "Done!\n";

