<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductCategory extends Model
{
    protected $fillable = [
        'name',
        'parent_id',
        'category_type',
        'description',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ProductCategory::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    public function termsConditionsTemplates(): HasMany
    {
        return $this->hasMany(TermsConditionsTemplate::class, 'sub_category_id');
    }

    // Helper methods for parent-child relationships
    public function isParent(): bool
    {
        return is_null($this->parent_id);
    }

    public function isChild(): bool
    {
        return !is_null($this->parent_id);
    }

    public function getFullPath(): string
    {
        $path = [$this->name];
        $parent = $this->parent;
        
        while ($parent) {
            array_unshift($path, $parent->name);
            $parent = $parent->parent;
        }
        
        return implode(' > ', $path);
    }

    public function getLevel(): int
    {
        $level = 0;
        $parent = $this->parent;
        
        while ($parent) {
            $level++;
            $parent = $parent->parent;
        }
        
        return $level;
    }

    public function getAllDescendants()
    {
        $descendants = collect();
        
        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->getAllDescendants());
        }
        
        return $descendants;
    }

    public static function getTree()
    {
        return static::with('children')->whereNull('parent_id')->get();
    }

    public static function getSelectOptions($excludeId = null)
    {
        $categories = static::where('is_active', true)
            ->when($excludeId, function ($query, $excludeId) {
                return $query->where('id', '!=', $excludeId);
            })
            ->orderBy('category_type')
            ->orderBy('name')
            ->get();

        $options = [];
        foreach ($categories as $category) {
            $options[] = [
                'value' => $category->id,
                'label' => $category->getFullPath(),
                'type' => $category->category_type,
                'level' => $category->getLevel()
            ];
        }
        
        return $options;
    }
}