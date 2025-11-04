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
        Schema::create('quotation_followups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained()->onDelete('cascade');
            $table->integer('followup_number'); // 1 = first, 2 = second, etc.
            $table->date('due_date');
            $table->date('sent_date')->nullable();
            $table->enum('status', ['pending', 'sent', 'failed', 'skipped'])->default('pending');
            $table->enum('recipient_type', ['customer', 'internal', 'both'])->default('both');
            $table->text('customer_email_content')->nullable();
            $table->text('internal_email_content')->nullable();
            $table->string('customer_email_status')->nullable(); // sent, failed, bounced
            $table->string('internal_email_status')->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['quotation_id', 'followup_number']);
            $table->index(['due_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quotation_followups');
    }
};
