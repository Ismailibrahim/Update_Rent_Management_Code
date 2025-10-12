<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tenant extends Model
{
    use HasFactory;

    protected $fillable = [
        // Tenant type
        'tenant_type',
        // New separate columns
        'first_name',
        'last_name',
        'date_of_birth',
        'national_id',
        'nationality',
        'gender',
        'email',
        'phone',
        'address',
        'city',
        'postal_code',
        'emergency_contact_name',
        'emergency_contact_phone',
        'emergency_contact_relationship',
        'employment_company',
        'employment_position',
        'employment_salary',
        'employment_phone',
        'bank_name',
        'account_number',
        'account_holder_name',
        'status',
        'notes',
        'lease_start_date',
        'lease_end_date',
        // Company-specific fields
        'company_name',
        'company_address',
        'company_registration_number',
        'company_gst_tin',
        'company_telephone',
        'company_email',
        'documents',
    ];

    protected $casts = [
        // New column casts
        'date_of_birth' => 'date:Y-m-d',
        'employment_salary' => 'decimal:2',
        'lease_start_date' => 'date:Y-m-d',
        'lease_end_date' => 'date:Y-m-d',
        'documents' => 'array',
    ];

    protected $appends = ['full_name'];

    protected $attributes = [
        'status' => 'active',
    ];

    // Relationships
    public function rentalUnits(): HasMany
    {
        return $this->hasMany(RentalUnit::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(TenantLedger::class, 'tenant_id');
    }

    // Accessors - Now using only new columns
    public function getFirstNameAttribute()
    {
        return $this->attributes['first_name'] ?? '';
    }

    public function getLastNameAttribute()
    {
        return $this->attributes['last_name'] ?? '';
    }

    public function getFullNameAttribute()
    {
        if ($this->tenant_type === 'company') {
            return $this->company_name ?: trim($this->first_name . ' ' . $this->last_name);
        }
        return trim($this->first_name . ' ' . $this->last_name);
    }

    public function getEmailAttribute()
    {
        return $this->attributes['email'] ?? '';
    }

    public function getPhoneAttribute()
    {
        return $this->attributes['phone'] ?? '';
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeInactive($query)
    {
        return $query->where('status', 'inactive');
    }

    // Search scopes for new columns
    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('first_name', 'like', "%{$search}%")
              ->orWhere('last_name', 'like', "%{$search}%")
              ->orWhere('email', 'like', "%{$search}%")
              ->orWhere('phone', 'like', "%{$search}%")
              ->orWhere('national_id', 'like', "%{$search}%");
        });
    }

    public function scopeByEmail($query, $email)
    {
        return $query->where('email', $email);
    }

    public function scopeByPhone($query, $phone)
    {
        return $query->where('phone', $phone);
    }

    public function scopeByNationalId($query, $nationalId)
    {
        return $query->where('national_id', $nationalId);
    }
}