<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceTask extends Model
{
    protected $fillable = [
        'product_id',
        'task_description', 
        'estimated_man_days', // UPDATED FIELD
        'sequence_order',
        'is_active'
    ];

    protected $casts = [
        'estimated_man_days' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
