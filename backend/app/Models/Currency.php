<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    protected $fillable = [
        'code',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
}
