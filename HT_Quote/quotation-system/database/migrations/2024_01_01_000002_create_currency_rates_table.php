<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('currency_rates', function (Blueprint $table) {
            $table->id();
            $table->string('from_currency', 3);
            $table->string('to_currency', 3);
            $table->decimal('exchange_rate', 10, 4);
            $table->date('effective_date');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('currency_rates');
    }
};