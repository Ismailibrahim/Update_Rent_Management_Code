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
        Schema::table('assets', function (Blueprint $table) {
            // Drop unnecessary columns if they exist
            $columnsToDrop = [
                'asset_number',
                'model',
                'description',
                'purchase_date',
                'purchase_price',
                'warranty_expiry',
                'supplier',
                'serial_number',
                'status',
                'location',
                'notes',
                'is_active'
            ];
            
            // Only drop columns that actually exist
            $existingColumns = [];
            if (Schema::hasColumn('assets', 'asset_number')) {
                $existingColumns[] = 'asset_number';
            }
            if (Schema::hasColumn('assets', 'model')) {
                $existingColumns[] = 'model';
            }
            if (Schema::hasColumn('assets', 'description')) {
                $existingColumns[] = 'description';
            }
            if (Schema::hasColumn('assets', 'purchase_date')) {
                $existingColumns[] = 'purchase_date';
            }
            if (Schema::hasColumn('assets', 'purchase_price')) {
                $existingColumns[] = 'purchase_price';
            }
            if (Schema::hasColumn('assets', 'warranty_expiry')) {
                $existingColumns[] = 'warranty_expiry';
            }
            if (Schema::hasColumn('assets', 'supplier')) {
                $existingColumns[] = 'supplier';
            }
            if (Schema::hasColumn('assets', 'serial_number')) {
                $existingColumns[] = 'serial_number';
            }
            if (Schema::hasColumn('assets', 'status')) {
                $existingColumns[] = 'status';
            }
            if (Schema::hasColumn('assets', 'location')) {
                $existingColumns[] = 'location';
            }
            if (Schema::hasColumn('assets', 'notes')) {
                $existingColumns[] = 'notes';
            }
            if (Schema::hasColumn('assets', 'is_active')) {
                $existingColumns[] = 'is_active';
            }
            
            if (!empty($existingColumns)) {
                $table->dropColumn($existingColumns);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            // Add back the columns if needed
            $table->string('asset_number')->unique();
            $table->string('model')->nullable();
            $table->text('description')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->string('supplier')->nullable();
            $table->string('serial_number')->nullable();
            $table->enum('status', ['working', 'faulty', 'repairing', 'replaced', 'disposed'])->default('working');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
        });
    }
};
