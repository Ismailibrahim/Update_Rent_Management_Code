<?php

// Bootstrap Laravel and export current customers to a versioned JSON file

use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/vendor/autoload.php';

$app = require __DIR__ . '/bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

// Ensure storage path exists
$exportDir = __DIR__ . '/database/seeders/data';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0777, true);
}

$exportFile = $exportDir . '/customers.json';

// Fetch rows using Eloquent to honor model fillables
/** @var \Illuminate\Database\Eloquent\Collection $rows */
$rows = \App\Models\Customer::orderBy('id')->get();

// Convert to array of attributes
$payload = $rows->map(function ($c) {
    return $c->getAttributes();
})->values()->all();

file_put_contents($exportFile, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo "Exported " . count($payload) . " customers to " . $exportFile . PHP_EOL;


