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
        Schema::table('quotation_sequence', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_id')->nullable()->after('year');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
            
            // Remove the unique constraint on year since we now have customer_id + year as unique
            $table->dropUnique(['year']);
            
            // Add new unique constraint for customer_id + year combination
            $table->unique(['customer_id', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quotation_sequence', function (Blueprint $table) {
            // Remove the unique constraint on customer_id + year
            $table->dropUnique(['customer_id', 'year']);
            
            // Add back the unique constraint on year only
            $table->unique(['year']);
            
            // Drop foreign key and column
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });
    }
};
