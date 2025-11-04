<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;

class ServiceTermsTemplate extends Model
{
    use Auditable;
    protected $fillable = [
        'title',
        'content',
        'category_type',
        'page_number',
        'display_order',
        'is_default',
        'is_active'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'page_number' => 'integer',
        'display_order' => 'integer'
    ];

    /**
     * Get active service terms templates ordered by display order
     */
    public static function getActiveTemplates()
    {
        return static::where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('page_number')
            ->get();
    }

    /**
     * Get default service terms templates
     */
    public static function getDefaultTemplates()
    {
        return static::where('is_default', true)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('page_number')
            ->get();
    }

    /**
     * Get templates by page number
     */
    public static function getTemplatesByPage($pageNumber)
    {
        return static::where('page_number', $pageNumber)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->get();
    }

    /**
     * Scope for active templates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for default templates
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope ordered by display order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('display_order')->orderBy('page_number');
    }
}