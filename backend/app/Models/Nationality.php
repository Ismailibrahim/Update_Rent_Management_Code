<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Nationality extends Model
{
    protected $fillable = [
        'nationality',
        'sort_order'
    ];

    protected $casts = [
        'sort_order' => 'integer'
    ];

    protected $attributes = [
        'sort_order' => 0
    ];

    // Scopes
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('nationality');
    }
}

