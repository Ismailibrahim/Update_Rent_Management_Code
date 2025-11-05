<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'message' => 'Rent Management System API',
        'version' => '1.0',
        'status' => 'running',
        'endpoints' => [
            'api' => '/api',
            'health' => '/api/health',
            'test' => '/api/test'
        ],
        'documentation' => 'This is the backend API. Use the frontend application to interact with the system.'
    ]);
});
