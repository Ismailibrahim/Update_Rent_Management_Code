<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Customer extends Model
{
    use Auditable;
    protected $fillable = [
        'resort_code',
        'resort_name',
        'holding_company',
        'address',
        'country',
        'tax_number',
        'payment_terms',
        'created_by'
    ];


    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function supportContracts(): HasMany
    {
        return $this->hasMany(CustomerSupportContract::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(CustomerContact::class);
    }

    public function primaryContact(): HasMany
    {
        return $this->hasMany(CustomerContact::class)->where('is_primary', true);
    }

    public function country(): BelongsTo
    {
        return $this->belongsTo(Country::class, 'country', 'name');
    }

    /**
     * Get the primary contact person (for backward compatibility)
     */
    public function getPrimaryContactPersonAttribute()
    {
        $primaryContact = $this->contacts()->where('is_primary', true)->first();
        return $primaryContact ? $primaryContact->contact_person : $this->contact_person;
    }

    /**
     * Get the primary contact email (for backward compatibility)
     */
    public function getPrimaryContactEmailAttribute()
    {
        $primaryContact = $this->contacts()->where('is_primary', true)->first();
        return $primaryContact ? $primaryContact->email : $this->email;
    }

    /**
     * Get the primary contact phone (for backward compatibility)
     */
    public function getPrimaryContactPhoneAttribute()
    {
        $primaryContact = $this->contacts()->where('is_primary', true)->first();
        return $primaryContact ? $primaryContact->phone : $this->phone;
    }
}