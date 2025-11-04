<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class EmailSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'provider',
        'host',
        'port',
        'encryption',
        'username',
        'password',
        'from_address',
        'from_name',
        'is_active',
    ];

    protected $casts = [
        'port' => 'integer',
        'is_active' => 'boolean',
    ];

    protected $hidden = [
        'password',
    ];

    /**
     * Encrypt password when setting
     */
    public function setPasswordAttribute($value)
    {
        if ($value) {
            $this->attributes['password'] = Crypt::encryptString($value);
        }
    }

    /**
     * Decrypt password when getting
     */
    public function getPasswordAttribute($value)
    {
        if ($value) {
            try {
                return Crypt::decryptString($value);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Get active email settings
     */
    public static function getActive()
    {
        return self::where('is_active', true)->first();
    }

    /**
     * Get email configuration for Laravel Mail
     */
    public function getMailConfig(): array
    {
        $config = [
            'transport' => 'smtp',
            'host' => $this->host,
            'port' => $this->port,
            'encryption' => $this->encryption === 'none' ? null : $this->encryption,
            'username' => $this->username,
            'password' => $this->password,
            'timeout' => null,
            'auth_mode' => null,
        ];

        // Office 365 specific settings
        if ($this->provider === 'office365') {
            $config['host'] = $this->host ?: 'smtp.office365.com';
            $config['port'] = $this->port ?: 587;
            $config['encryption'] = 'tls';
        }

        return $config;
    }
}

