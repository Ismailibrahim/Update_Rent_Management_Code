<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Designation;

class DesignationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $designations = [
            [
                'name' => 'General Manager',
                'description' => 'General Manager position',
                'is_active' => true,
                'sort_order' => 1
            ],
            [
                'name' => 'Operations Manager',
                'description' => 'Operations Manager position',
                'is_active' => true,
                'sort_order' => 2
            ],
            [
                'name' => 'IT Manager',
                'description' => 'IT Manager position',
                'is_active' => true,
                'sort_order' => 3
            ],
            [
                'name' => 'Finance Manager',
                'description' => 'Finance Manager position',
                'is_active' => true,
                'sort_order' => 4
            ],
            [
                'name' => 'HR Manager',
                'description' => 'HR Manager position',
                'is_active' => true,
                'sort_order' => 5
            ],
            [
                'name' => 'Director',
                'description' => 'Director position',
                'is_active' => true,
                'sort_order' => 6
            ],
            [
                'name' => 'CEO',
                'description' => 'Chief Executive Officer',
                'is_active' => true,
                'sort_order' => 7
            ],
            [
                'name' => 'CTO',
                'description' => 'Chief Technology Officer',
                'is_active' => true,
                'sort_order' => 8
            ],
            [
                'name' => 'CFO',
                'description' => 'Chief Financial Officer',
                'is_active' => true,
                'sort_order' => 9
            ],
            [
                'name' => 'Supervisor',
                'description' => 'Supervisor position',
                'is_active' => true,
                'sort_order' => 10
            ],
            [
                'name' => 'Coordinator',
                'description' => 'Coordinator position',
                'is_active' => true,
                'sort_order' => 11
            ],
            [
                'name' => 'Assistant',
                'description' => 'Assistant position',
                'is_active' => true,
                'sort_order' => 12
            ]
        ];

        foreach ($designations as $designation) {
            Designation::updateOrCreate(
                ['name' => $designation['name']],
                $designation
            );
        }
    }
}
