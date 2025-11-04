<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->enum('reminder_type', ['rent_due', 'rent_overdue', 'payment_due', 'payment_overdue', 'maintenance_due', 'maintenance_overdue', 'default'])->default('default')->index();
            $table->string('name');
            $table->string('subject');
            $table->text('body_html'); // HTML email body with variables like {{tenant_name}}, {{amount}}, etc.
            $table->text('body_text')->nullable(); // Plain text version
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
            
            $table->index(['reminder_type', 'is_active']);
            $table->index('is_default');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};

