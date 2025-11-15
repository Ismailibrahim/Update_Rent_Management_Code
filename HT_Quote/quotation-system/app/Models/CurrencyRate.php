<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CurrencyRate extends Model
{
    protected $fillable = [
        'from_currency',
        'to_currency',
        'exchange_rate',
        'effective_date'
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:4',
        'effective_date' => 'date'
    ];

    public static function getRate($from, $to, $date = null)
    {
        $date = $date ?: now()->format('Y-m-d');

        $rate = static::where('from_currency', $from)
            ->where('to_currency', $to)
            ->where('effective_date', '<=', $date)
            ->orderBy('effective_date', 'desc')
            ->first();

        return $rate ? $rate->exchange_rate : 1.0000;
    }
}