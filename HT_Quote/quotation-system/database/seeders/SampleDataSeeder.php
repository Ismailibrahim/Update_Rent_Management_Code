<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Customer;
use App\Models\ProductCategory;
use App\Models\AmcDescription;
use App\Models\QuotationSequence;
use Illuminate\Database\Seeder;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $currentYear = date('Y');
        QuotationSequence::create([
            'year' => $currentYear,
            'last_number' => 0,
            'prefix' => 'Q'
        ]);

        $pmsCategory = ProductCategory::where('name', 'PMS Support')->first();
        $serverCategory = ProductCategory::where('name', 'Servers')->first();
        $pmsLicenseCategory = ProductCategory::where('name', 'PMS Software')->first();
        $softwareAmcDescription = AmcDescription::where('product_type', 'software')->where('is_default', true)->first();

        Product::create([
            'name' => 'PMS Implementation Support',
            'category_id' => $pmsCategory->id,
            'unit_price' => 150.00,
            'is_man_day_based' => true,
            'description' => 'Property Management System implementation and support services'
        ]);

        Product::create([
            'name' => 'Dell PowerEdge Server',
            'category_id' => $serverCategory->id,
            'unit_price' => 2500.00,
            'brand' => 'Dell',
            'model' => 'PowerEdge R740',
            'part_number' => 'DELL-R740-256GB',
            'description' => 'High-performance server for enterprise applications'
        ]);

        Product::create([
            'name' => 'PMS Cloud License',
            'category_id' => $pmsLicenseCategory->id,
            'unit_price' => 1000.00,
            'has_amc_option' => true,
            'amc_unit_price' => 200.00,
            'amc_description_id' => $softwareAmcDescription->id,
            'description' => 'Property Management System cloud-based license'
        ]);

        Customer::create([
            'resort_name' => 'ABC Resort',
            'contact_person' => 'John Doe',
            'email' => 'john@abcresort.com',
            'phone' => '+960-123-4567',
            'address' => 'North Male Atoll, Maldives',
            'default_currency' => 'USD',
            'discount_rate' => 5.00
        ]);

        Customer::create([
            'resort_name' => 'XYZ Hotels',
            'contact_person' => 'Jane Smith',
            'email' => 'jane@xyzhotels.com',
            'phone' => '+960-987-6543',
            'address' => 'South Male Atoll, Maldives',
            'default_currency' => 'MVR',
            'discount_rate' => 2.50
        ]);
    }
}