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
        // Add indexes to properties table
        Schema::table('properties', function (Blueprint $table) {
            // Index for frequently filtered columns
            if (!$this->indexExists('properties', 'properties_type_index')) {
                $table->index('type', 'properties_type_index');
            }
            if (!$this->indexExists('properties', 'properties_status_index')) {
                $table->index('status', 'properties_status_index');
            }
            if (!$this->indexExists('properties', 'properties_is_active_index')) {
                $table->index('is_active', 'properties_is_active_index');
            }
            // Composite index for common query pattern: assigned_manager + status
            if (!$this->indexExists('properties', 'properties_manager_status_index')) {
                $table->index(['assigned_manager_id', 'status'], 'properties_manager_status_index');
            }
            // Index for name search (for LIKE queries, though full-text would be better)
            if (!$this->indexExists('properties', 'properties_name_index')) {
                $table->index('name', 'properties_name_index');
            }
        });

        // Add indexes to rental_units table
        Schema::table('rental_units', function (Blueprint $table) {
            // Status is frequently filtered
            if (!$this->indexExists('rental_units', 'rental_units_status_index')) {
                $table->index('status', 'rental_units_status_index');
            }
            // Composite index for common sorting: floor_number, unit_number
            if (!$this->indexExists('rental_units', 'rental_units_floor_unit_index')) {
                $table->index(['floor_number', 'unit_number'], 'rental_units_floor_unit_index');
            }
            // Composite index for property + status (common filter)
            if (!$this->indexExists('rental_units', 'rental_units_property_status_index')) {
                $table->index(['property_id', 'status'], 'rental_units_property_status_index');
            }
            // Index for tenant_id (for finding units by tenant)
            if (!$this->indexExists('rental_units', 'rental_units_tenant_id_index')) {
                $table->index('tenant_id', 'rental_units_tenant_id_index');
            }
            // Index for is_active
            if (!$this->indexExists('rental_units', 'rental_units_is_active_index')) {
                $table->index('is_active', 'rental_units_is_active_index');
            }
        });

        // Add indexes to tenants table (if not already added in other migrations)
        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                // Status is frequently filtered
                if (!$this->indexExists('tenants', 'tenants_status_index')) {
                    $table->index('status', 'tenants_status_index');
                }
            });
        }

        // Add indexes to payments table for revenue calculations
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                // Index for rental_unit_id (for filtering payments by unit)
                if (!$this->indexExists('payments', 'payments_rental_unit_id_index')) {
                    $table->index('rental_unit_id', 'payments_rental_unit_id_index');
                }
                // Index for payment_date (for date range queries)
                if (!$this->indexExists('payments', 'payments_payment_date_index')) {
                    $table->index('payment_date', 'payments_payment_date_index');
                }
            });
        }

        // Add indexes to maintenance_requests table
        if (Schema::hasTable('maintenance_requests')) {
            Schema::table('maintenance_requests', function (Blueprint $table) {
                // Index for property_id
                if (!$this->indexExists('maintenance_requests', 'maintenance_requests_property_id_index')) {
                    $table->index('property_id', 'maintenance_requests_property_id_index');
                }
                // Index for status
                if (!$this->indexExists('maintenance_requests', 'maintenance_requests_status_index')) {
                    $table->index('status', 'maintenance_requests_status_index');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropIndex('properties_type_index');
            $table->dropIndex('properties_status_index');
            $table->dropIndex('properties_is_active_index');
            $table->dropIndex('properties_manager_status_index');
            $table->dropIndex('properties_name_index');
        });

        Schema::table('rental_units', function (Blueprint $table) {
            $table->dropIndex('rental_units_status_index');
            $table->dropIndex('rental_units_floor_unit_index');
            $table->dropIndex('rental_units_property_status_index');
            $table->dropIndex('rental_units_tenant_id_index');
            $table->dropIndex('rental_units_is_active_index');
        });

        if (Schema::hasTable('tenants')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropIndex('tenants_status_index');
            });
        }

        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->dropIndex('payments_rental_unit_id_index');
                $table->dropIndex('payments_payment_date_index');
            });
        }

        if (Schema::hasTable('maintenance_requests')) {
            Schema::table('maintenance_requests', function (Blueprint $table) {
                $table->dropIndex('maintenance_requests_property_id_index');
                $table->dropIndex('maintenance_requests_status_index');
            });
        }
    }

    /**
     * Check if an index exists
     */
    private function indexExists(string $table, string $index): bool
    {
        $connection = Schema::getConnection();
        $databaseName = $connection->getDatabaseName();
        
        $result = $connection->select(
            "SELECT COUNT(*) as count FROM information_schema.statistics 
             WHERE table_schema = ? AND table_name = ? AND index_name = ?",
            [$databaseName, $table, $index]
        );
        
        return $result[0]->count > 0;
    }
};

