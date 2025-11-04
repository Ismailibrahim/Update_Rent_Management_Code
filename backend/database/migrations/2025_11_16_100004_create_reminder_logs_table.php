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
        Schema::create('reminder_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
            $table->enum('reminder_type', ['rent_due', 'rent_overdue', 'payment_due', 'payment_overdue', 'maintenance_due', 'maintenance_overdue']);
            $table->enum('notification_type', ['email', 'sms', 'both'])->default('email');
            $table->string('recipient_email')->nullable();
            $table->string('recipient_phone')->nullable();
            $table->string('subject')->nullable();
            $table->text('message')->nullable();
            $table->enum('status', ['sent', 'failed', 'pending'])->default('pending');
            $table->text('error_message')->nullable();
            $table->json('metadata')->nullable(); // Store invoice ID, amount, due date, etc.
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'reminder_type']);
            $table->index(['status', 'created_at']);
            $table->index('sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminder_logs');
    }
};

