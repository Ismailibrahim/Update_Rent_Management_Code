<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'reminder_type',
        'name',
        'subject',
        'body_html',
        'body_text',
        'is_active',
        'is_default',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * Get template for a reminder type
     */
    public static function getForReminderType(string $reminderType)
    {
        // First try to get default template for the specific reminder type
        $template = self::where('reminder_type', $reminderType)
            ->where('is_active', true)
            ->where('is_default', true)
            ->first();

        // If not found, try to get any active template for the type
        if (!$template) {
            $template = self::where('reminder_type', $reminderType)
                ->where('is_active', true)
                ->first();
        }

        // If still not found, get the default template
        if (!$template) {
            $template = self::where('reminder_type', 'default')
                ->where('is_active', true)
                ->where('is_default', true)
                ->first();
        }

        return $template;
    }

    /**
     * Replace variables in template
     */
    public function render(array $variables): array
    {
        $subject = $this->subject;
        $bodyHtml = $this->body_html;
        $bodyText = $this->body_text ?? strip_tags($this->body_html);

        foreach ($variables as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $subject = str_replace($placeholder, $value, $subject);
            $bodyHtml = str_replace($placeholder, $value, $bodyHtml);
            $bodyText = str_replace($placeholder, $value, $bodyText);
        }

        return [
            'subject' => $subject,
            'body_html' => $bodyHtml,
            'body_text' => $bodyText,
        ];
    }
}

