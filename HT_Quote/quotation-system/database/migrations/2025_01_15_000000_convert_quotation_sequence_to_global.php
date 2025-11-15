<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // First, let's backup the current data
        $sequences = DB::table('quotation_sequence')->get();
        
        // Create a temporary table to store the consolidated data
        DB::statement('CREATE TEMPORARY TABLE temp_sequences AS SELECT * FROM quotation_sequence');
        
        // Drop the current table
        Schema::dropIfExists('quotation_sequence');
        
        // Recreate the table without customer_id
        Schema::create('quotation_sequence', function (Blueprint $table) {
            $table->id();
            $table->integer('year');
            $table->integer('last_number')->default(0);
            $table->string('prefix', 10)->default('Q');
            $table->timestamps();
            
            $table->unique('year');
        });
        
        // Consolidate sequences by year (take the highest number for each year)
        $consolidatedSequences = [];
        foreach ($sequences as $sequence) {
            $year = $sequence->year;
            if (!isset($consolidatedSequences[$year])) {
                $consolidatedSequences[$year] = [
                    'year' => $year,
                    'last_number' => 0,
                    'prefix' => $sequence->prefix,
                    'created_at' => now(),
                    'updated_at' => now()
                ];
            }
            // Take the highest sequence number for this year
            if ($sequence->last_number > $consolidatedSequences[$year]['last_number']) {
                $consolidatedSequences[$year]['last_number'] = $sequence->last_number;
            }
        }
        
        // Insert consolidated sequences
        foreach ($consolidatedSequences as $sequence) {
            DB::table('quotation_sequence')->insert($sequence);
        }
    }

    public function down()
    {
        // Drop the current table
        Schema::dropIfExists('quotation_sequence');
        
        // Recreate the original table with customer_id
        Schema::create('quotation_sequence', function (Blueprint $table) {
            $table->id();
            $table->integer('year');
            $table->integer('last_number')->default(0);
            $table->string('prefix', 10)->default('Q');
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->timestamps();
            
            $table->unique(['customer_id', 'year']);
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
        });
    }
};



