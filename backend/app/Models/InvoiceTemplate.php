<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceTemplate extends Model
{
    protected $fillable = [
        'name',
        'description',
        'type',
        'template_data',
        'html_content',
        'styles',
        'logo_path',
        'is_active',
        'is_default',
    ];

    protected $casts = [
        'template_data' => 'array',
        'styles' => 'array',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * Set as default template for its type
     */
    public function setAsDefault(): void
    {
        // Unset other defaults of the same type
        static::where('type', $this->type)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);
        
        $this->is_default = true;
        $this->save();
    }
}

