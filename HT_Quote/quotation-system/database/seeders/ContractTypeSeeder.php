<?php

namespace Database\Seeders;

use App\Models\ContractType;
use Illuminate\Database\Seeder;

class ContractTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contractTypes = [
            ['name' => 'Oracle Software Support', 'sort_order' => 1, 'is_active' => true],
            ['name' => 'Oracle Hardware Support', 'sort_order' => 2, 'is_active' => true],
            ['name' => 'HT L1 Support', 'sort_order' => 3, 'is_active' => true],
            ['name' => 'HT Project Warranty Support', 'sort_order' => 4, 'is_active' => true],
        ];

        foreach ($contractTypes as $contractType) {
            ContractType::updateOrCreate(
                ['name' => $contractType['name']],
                $contractType
            );
        }
    }
}
