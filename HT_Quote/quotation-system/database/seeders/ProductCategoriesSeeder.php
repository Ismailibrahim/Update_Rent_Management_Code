<?php

namespace Database\Seeders;

use App\Models\ProductCategory;
use Illuminate\Database\Seeder;

class ProductCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        $mainCategories = [
            ['name' => 'Services', 'category_type' => 'services', 'description' => 'IT Support and Services'],
            ['name' => 'Hardware', 'category_type' => 'hardware', 'description' => 'Computer Hardware and Equipment'],
            ['name' => 'Software', 'category_type' => 'software', 'description' => 'Software Licenses and Applications'],
        ];

        foreach ($mainCategories as $category) {
            ProductCategory::create($category);
        }

        $servicesId = ProductCategory::where('name', 'Services')->first()->id;
        $hardwareId = ProductCategory::where('name', 'Hardware')->first()->id;
        $softwareId = ProductCategory::where('name', 'Software')->first()->id;

        $subCategories = [
            ['name' => 'PMS Support', 'parent_id' => $servicesId, 'category_type' => 'services', 'description' => 'Property Management System Support'],
            ['name' => 'POS Support', 'parent_id' => $servicesId, 'category_type' => 'services', 'description' => 'Point of Sale System Support'],
            ['name' => 'MC Support', 'parent_id' => $servicesId, 'category_type' => 'services', 'description' => 'MC System Support'],
            ['name' => 'SUN System Support', 'parent_id' => $servicesId, 'category_type' => 'services', 'description' => 'SUN System Support'],
            ['name' => 'Servers', 'parent_id' => $hardwareId, 'category_type' => 'hardware', 'description' => 'Server Hardware'],
            ['name' => 'Computers', 'parent_id' => $hardwareId, 'category_type' => 'hardware', 'description' => 'Desktop and Laptop Computers'],
            ['name' => 'Networking', 'parent_id' => $hardwareId, 'category_type' => 'hardware', 'description' => 'Network Equipment'],
            ['name' => 'Printers', 'parent_id' => $hardwareId, 'category_type' => 'hardware', 'description' => 'Printing Equipment'],
            ['name' => 'On Prem License', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'On-Premises Software Licenses'],
            ['name' => 'Cloud License', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'Cloud-based Software Licenses'],
            ['name' => 'PMS Software', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'Property Management Software'],
            ['name' => 'POS Software', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'Point of Sale Software'],
            ['name' => 'SUN Software', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'SUN System Software'],
            ['name' => 'MC Software', 'parent_id' => $softwareId, 'category_type' => 'software', 'description' => 'MC System Software'],
        ];

        foreach ($subCategories as $category) {
            ProductCategory::create($category);
        }
    }
}