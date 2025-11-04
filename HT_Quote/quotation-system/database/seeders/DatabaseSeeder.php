<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class, // Create permissions first
            RoleSeeder::class, // Then create roles and assign permissions
            SystemSettingsSeeder::class,
            CurrencyRatesSeeder::class,
            MainCategoriesSeeder::class, // Create 4 fixed main categories first
            ProductCategoriesSeeder::class,
            AmcDescriptionsSeeder::class,
            TermsConditionsSeeder::class,
            QuotationStatusSeeder::class, // Add quotation statuses
            ServiceTermsSeeder::class, // Add service terms and conditions
            CountriesSeeder::class,
            UserSeeder::class, // Users created after roles so we can assign roles
            SupportProductsSeeder::class, // Add support products seeder
            // SampleDataSeeder::class, // Temporarily disabled due to column name issue
            CustomersDataSeeder::class,
        ]);
    }
}
