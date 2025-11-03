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
        Schema::create('sms_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->onDelete('set null');
            $table->foreignId('rental_unit_id')->nullable()->constrained('rental_units')->onDelete('set null');
            $table->foreignId('template_id')->nullable()->constrained('sms_templates')->onDelete('set null');
            $table->string('phone_number');
            $table->text('message_content');
            $table->enum('status', ['pending', 'sent', 'failed'])->default('pending');
            $table->json('api_response')->nullable();
            $table->text('error_message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            
            $table->index(['tenant_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sms_logs');
    }
};
