<?php

use Illuminate\Support\Facades\Route;
use App\Models\Customer;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/demo', function () {
    $customers = Customer::all();
    $products = App\Models\Product::with('category')->get();
    $categories = App\Models\ProductCategory::all();
    $settings = App\Models\SystemSetting::all();

    return view('demo', compact('customers', 'products', 'categories', 'settings'));
});
