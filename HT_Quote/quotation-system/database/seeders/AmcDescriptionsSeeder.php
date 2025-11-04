<?php

namespace Database\Seeders;

use App\Models\AmcDescription;
use Illuminate\Database\Seeder;

class AmcDescriptionsSeeder extends Seeder
{
    public function run(): void
    {
        $descriptions = [
            ['description' => 'Annual Software Maintenance and Support', 'product_type' => 'software', 'is_default' => true],
            ['description' => 'Software Updates and Technical Support', 'product_type' => 'software', 'is_default' => false],
            ['description' => 'Premium Software Support Package', 'product_type' => 'software', 'is_default' => false],
            ['description' => 'Hardware Maintenance and Support Contract', 'product_type' => 'hardware', 'is_default' => true],
            ['description' => 'On-site Hardware Support and Maintenance', 'product_type' => 'hardware', 'is_default' => false],
            ['description' => 'Comprehensive Hardware Support Package', 'product_type' => 'hardware', 'is_default' => false],
        ];

        foreach ($descriptions as $description) {
            AmcDescription::create($description);
        }
    }
}