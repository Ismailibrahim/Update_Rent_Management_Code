<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Production Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains production-specific configurations for the
    | Quotation Management System.
    |
    */

    'app' => [
        'debug' => false,
        'url' => env('APP_URL', 'https://your-domain.com'),
        'asset_url' => env('ASSET_URL', null),
        'timezone' => 'UTC',
        'locale' => 'en',
        'fallback_locale' => 'en',
        'faker_locale' => 'en_US',
        'key' => env('APP_KEY'),
        'cipher' => 'AES-256-CBC',
    ],

    'cache' => [
        'default' => env('CACHE_DRIVER', 'redis'),
        'stores' => [
            'redis' => [
                'driver' => 'redis',
                'connection' => 'cache',
                'lock_connection' => 'default',
            ],
        ],
    ],

    'database' => [
        'default' => env('DB_CONNECTION', 'mysql'),
        'connections' => [
            'mysql' => [
                'driver' => 'mysql',
                'url' => env('DATABASE_URL'),
                'host' => env('DB_HOST', '127.0.0.1'),
                'port' => env('DB_PORT', '3306'),
                'database' => env('DB_DATABASE', 'quotation_system'),
                'username' => env('DB_USERNAME', 'forge'),
                'password' => env('DB_PASSWORD', ''),
                'unix_socket' => env('DB_SOCKET', ''),
                'charset' => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
                'prefix' => '',
                'prefix_indexes' => true,
                'strict' => true,
                'engine' => null,
                'options' => extension_loaded('pdo_mysql') ? array_filter([
                    PDO::MYSQL_ATTR_SSL_CA => env('MYSQL_ATTR_SSL_CA'),
                ]) : [],
            ],
        ],
    ],

    'session' => [
        'driver' => env('SESSION_DRIVER', 'redis'),
        'lifetime' => env('SESSION_LIFETIME', 120),
        'expire_on_close' => false,
        'encrypt' => false,
        'files' => storage_path('framework/sessions'),
        'connection' => 'session',
        'table' => 'sessions',
        'store' => null,
        'lottery' => [2, 100],
        'cookie' => env('SESSION_COOKIE', 'quotation_session'),
        'path' => '/',
        'domain' => env('SESSION_DOMAIN', null),
        'secure' => env('SESSION_SECURE_COOKIE', true),
        'http_only' => env('SESSION_HTTP_ONLY', true),
        'same_site' => env('SESSION_SAME_SITE', 'strict'),
    ],

    'queue' => [
        'default' => env('QUEUE_CONNECTION', 'redis'),
        'connections' => [
            'redis' => [
                'driver' => 'redis',
                'connection' => 'default',
                'queue' => env('REDIS_QUEUE', 'default'),
                'retry_after' => 90,
                'block_for' => null,
            ],
        ],
    ],

    'mail' => [
        'default' => env('MAIL_MAILER', 'smtp'),
        'mailers' => [
            'smtp' => [
                'transport' => 'smtp',
                'host' => env('MAIL_HOST', 'smtp.mailgun.org'),
                'port' => env('MAIL_PORT', 587),
                'encryption' => env('MAIL_ENCRYPTION', 'tls'),
                'username' => env('MAIL_USERNAME'),
                'password' => env('MAIL_PASSWORD'),
                'timeout' => null,
                'local_domain' => env('MAIL_EHLO_DOMAIN'),
            ],
        ],
        'from' => [
            'address' => env('MAIL_FROM_ADDRESS', 'hello@example.com'),
            'name' => env('MAIL_FROM_NAME', 'Example'),
        ],
    ],

    'filesystems' => [
        'default' => env('FILESYSTEM_DISK', 'local'),
        'disks' => [
            'local' => [
                'driver' => 'local',
                'root' => storage_path('app'),
                'throw' => false,
            ],
            'public' => [
                'driver' => 'local',
                'root' => storage_path('app/public'),
                'url' => env('APP_URL').'/storage',
                'visibility' => 'public',
                'throw' => false,
            ],
        ],
    ],

    'logging' => [
        'default' => env('LOG_CHANNEL', 'stack'),
        'deprecations' => [
            'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
            'trace' => false,
        ],
        'channels' => [
            'stack' => [
                'driver' => 'stack',
                'channels' => ['single'],
                'ignore_exceptions' => false,
            ],
            'single' => [
                'driver' => 'single',
                'path' => storage_path('logs/laravel.log'),
                'level' => env('LOG_LEVEL', 'error'),
            ],
            'daily' => [
                'driver' => 'daily',
                'path' => storage_path('logs/laravel.log'),
                'level' => env('LOG_LEVEL', 'error'),
                'days' => 14,
            ],
        ],
    ],

    'security' => [
        'api_key' => env('API_KEY', 'your-secret-api-key-here'),
        'rate_limit' => [
            'api' => '100,1', // 100 requests per minute
            'login' => '5,1',  // 5 login attempts per minute
        ],
        'cors' => [
            'allowed_origins' => [env('APP_URL')],
            'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            'allowed_headers' => ['Content-Type', 'Authorization', 'X-API-Key'],
        ],
    ],
];
