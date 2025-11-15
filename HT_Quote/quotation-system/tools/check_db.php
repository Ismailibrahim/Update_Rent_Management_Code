<?php

use Illuminate\Contracts\Console\Kernel;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var Kernel $kernel */
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();

$default = config('database.default');
$conn = config("database.connections.$default");

echo json_encode([
    'default' => $default,
    'connection' => [
        'driver'   => $conn['driver'] ?? null,
        'database' => $conn['database'] ?? null,
        'host'     => $conn['host'] ?? null,
        'port'     => $conn['port'] ?? null,
        'username' => $conn['username'] ?? null,
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;


