<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the audit_logs table for tracking all user activities
     * and data changes in the system.
     */
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            // ==========================================
            // PRIMARY KEY
            // ==========================================
            $table->id();
            
            // ==========================================
            // USER INFORMATION
            // ==========================================
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            
            // ==========================================
            // ACTION INFORMATION
            // ==========================================
            $table->string('action', 50); // created, updated, deleted, viewed, login, etc.
            $table->string('model_type')->nullable(); // Fully qualified model class name
            $table->unsignedBigInteger('model_id')->nullable(); // Model instance ID
            
            // ==========================================
            // DATA CHANGES (JSON format for flexibility)
            // ==========================================
            $table->json('old_values')->nullable(); // Previous state before change
            $table->json('new_values')->nullable(); // New state after change
            $table->json('changes')->nullable(); // Diff of what actually changed
            $table->text('description')->nullable(); // Human-readable description
            
            // ==========================================
            // REQUEST INFORMATION
            // ==========================================
            $table->string('ip_address', 45)->nullable(); // IPv4 or IPv6
            $table->text('user_agent')->nullable(); // Browser/client information
            $table->string('request_id', 36)->nullable(); // Unique request identifier
            $table->string('route', 255)->nullable(); // Route name or endpoint
            $table->string('method', 10)->nullable(); // HTTP method (GET, POST, etc.)
            $table->string('url', 500)->nullable(); // Full request URL
            $table->integer('response_status')->nullable(); // HTTP response code (200, 404, etc.)
            $table->decimal('execution_time', 10, 3)->nullable(); // Request duration in milliseconds
            
            // ==========================================
            // ADDITIONAL CONTEXT
            // ==========================================
            $table->json('metadata')->nullable(); // Additional context data
            
            // ==========================================
            // TIMESTAMPS
            // ==========================================
            $table->timestamps();
            
            // ==========================================
            // INDEXES FOR PERFORMANCE
            // ==========================================
            // User-based queries
            $table->index('user_id');
            
            // Model-based queries
            $table->index(['model_type', 'model_id']);
            
            // Action-based queries
            $table->index('action');
            
            // Time-based queries
            $table->index('created_at');
            
            // Composite indexes for common queries
            $table->index(['user_id', 'created_at']);
            $table->index(['model_type', 'model_id', 'created_at']);
            $table->index(['action', 'created_at']);
            
            // Request tracking
            $table->index('request_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

