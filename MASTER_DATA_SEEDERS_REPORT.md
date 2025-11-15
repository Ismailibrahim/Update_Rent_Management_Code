# Master Data Seeders Report

## Created Seeders

### ✅ New Seeders Created:
1. **IslandSeeder.php** - Seeds/Exports Islands data
2. **NationalitySeeder.php** - Seeds/Exports Nationalities data
3. **CurrencySeeder.php** - Seeds/Exports Currencies data
4. **PaymentTypeSeeder.php** - Seeds/Exports Payment Types data
5. **PaymentModeSeeder.php** - Seeds/Exports Payment Modes data
6. **AssetSeeder.php** - Seeds/Exports Assets data
7. **ExportMasterDataSeeder.php** - Utility seeder to export all master data

### ✅ Existing Seeders:
1. **RentalUnitTypeSeeder.php** - Already exists
2. **SeedPropertyTypesSeeder.php** - Already exists

## How to Use

### To Export Current Database Data:
```bash
php artisan db:seed --class=ExportMasterDataSeeder
```

This will display all current data from the database. You can then manually update the seeders with this data.

### To Seed Default Data (if tables are empty):
```bash
php artisan db:seed --class=IslandSeeder
php artisan db:seed --class=NationalitySeeder
php artisan db:seed --class=CurrencySeeder
php artisan db:seed --class=PaymentTypeSeeder
php artisan db:seed --class=PaymentModeSeeder
php artisan db:seed --class=AssetSeeder
```

### To Seed All Master Data:
Update `DatabaseSeeder.php` to include all seeders:

```php
public function run(): void
{
    $this->call([
        RentalUnitTypeSeeder::class,
        SeedPropertyTypesSeeder::class,
        IslandSeeder::class,
        NationalitySeeder::class,
        CurrencySeeder::class,
        PaymentTypeSeeder::class,
        PaymentModeSeeder::class,
        AssetSeeder::class,
    ]);
}
```

## Default Data Included

### Islands:
- Malé, Hulhumalé, Vilimalé, Thilafushi

### Nationalities:
- Maldivian, Indian, Sri Lankan, Bangladeshi, Nepalese, Filipino, British, American, Other

### Currencies:
- MVR (default), USD, EUR

### Payment Types:
- Rent, Deposit, Maintenance, Utility, Other

### Payment Modes:
- Cash, Bank Transfer, Cheque, Credit Card, Debit Card, Mobile Payment

### Assets:
- Common property assets (AC, Refrigerator, Washing Machine, etc.)

## Next Steps

1. Run `ExportMasterDataSeeder` to see current database data
2. Update seeders with actual data from your database
3. Test seeders to ensure they work correctly
4. Add seeders to `DatabaseSeeder.php` for easy seeding

