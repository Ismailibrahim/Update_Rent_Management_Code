<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number', 100)->unique();
            $table->foreignId('customer_id')->constrained('customers');
            $table->enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired'])->default('draft');
            $table->date('valid_until')->nullable();
            $table->string('currency', 3)->default('USD');
            $table->decimal('exchange_rate', 10, 4)->default(1.0000);
            $table->decimal('subtotal', 12, 2)->nullable();
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->decimal('discount_percentage', 5, 2)->default(0);
            $table->decimal('tax_amount', 12, 2)->nullable();
            $table->decimal('total_amount', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->json('selected_tc_templates')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->date('sent_date')->nullable();
            $table->date('accepted_date')->nullable();
            $table->date('rejected_date')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('quotations');
    }
};