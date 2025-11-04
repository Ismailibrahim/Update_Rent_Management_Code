<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\RentalUnit;
use App\Models\Property;

class TemplateEngine
{
    /**
     * Replace template variables with actual values
     * 
     * @param string $template Content with variables like {{tenant_name}}, {{rent_amount}}
     * @param array $data Data to replace variables with
     * @return string
     */
    public function render(string $template, array $data): string
    {
        $content = $template;

        // Replace all variables in the format {{variable_name}}
        preg_match_all('/\{\{(\w+)\}\}/', $template, $matches);
        
        if (!empty($matches[1])) {
            foreach ($matches[1] as $variable) {
                $value = $this->getVariableValue($variable, $data);
                $content = str_replace('{{' . $variable . '}}', $value, $content);
            }
        }

        return $content;
    }

    /**
     * Get value for a variable from data array or related models
     */
    protected function getVariableValue(string $variable, array $data): string
    {
        // Check if value is directly provided in data
        if (isset($data[$variable])) {
            return $data[$variable];
        }

        // Handle tenant-related variables
        if (isset($data['tenant']) && $data['tenant'] instanceof Tenant) {
            $tenant = $data['tenant'];
            
            switch ($variable) {
                case 'tenant_name':
                    return $tenant->full_name ?? ($tenant->first_name . ' ' . $tenant->last_name);
                case 'tenant_first_name':
                    return $tenant->first_name ?? '';
                case 'tenant_last_name':
                    return $tenant->last_name ?? '';
                case 'tenant_phone':
                    return $tenant->phone ?? '';
            }
        }

        // Handle rental unit-related variables
        if (isset($data['rental_unit']) && $data['rental_unit'] instanceof RentalUnit) {
            $unit = $data['rental_unit'];
            
            switch ($variable) {
                case 'unit_number':
                    return $unit->unit_number ?? '';
                case 'rent_amount':
                    return number_format($unit->rent_amount ?? 0, 2);
                case 'currency':
                    return $unit->currency ?? 'MVR';
            }

            // Handle property via rental unit
            if ($unit->property) {
                $property = $unit->property;
                
                switch ($variable) {
                    case 'property_name':
                        return $property->name ?? '';
                    case 'property_address':
                        return $property->address ?? '';
                    case 'property_street':
                        return $property->street ?? '';
                    case 'property_island':
                        return $property->island ?? '';
                }
            }
        }

        // Handle direct property
        if (isset($data['property']) && $data['property'] instanceof Property) {
            $property = $data['property'];
            
            switch ($variable) {
                case 'property_name':
                    return $property->name ?? '';
                case 'property_address':
                    return $property->address ?? '';
                case 'property_street':
                    return $property->street ?? '';
                case 'property_island':
                    return $property->island ?? '';
            }
        }

        // Handle date variables
        switch ($variable) {
            case 'due_date':
                return $data['due_date'] ?? date('Y-m-d');
            case 'current_date':
                return date('Y-m-d');
            case 'current_month':
                return date('F Y');
        }

        // Return empty string if variable not found
        return '';
    }

    /**
     * Get available variables for a template type
     */
    public function getAvailableVariables(string $type = 'custom'): array
    {
        $variables = [
            // Tenant variables
            'tenant_name' => 'Full name of the tenant',
            'tenant_first_name' => 'First name of the tenant',
            'tenant_last_name' => 'Last name of the tenant',
            'tenant_phone' => 'Phone number of the tenant',
            
            // Property variables
            'property_name' => 'Name of the property',
            'property_address' => 'Full address of the property',
            'property_street' => 'Street name of the property',
            'property_island' => 'Island name of the property',
            
            // Rental unit variables
            'unit_number' => 'Unit number',
            'rent_amount' => 'Monthly rent amount',
            'currency' => 'Currency code (MVR, USD, etc.)',
            
            // Date variables
            'due_date' => 'Rent due date',
            'current_date' => 'Current date',
            'current_month' => 'Current month and year',
        ];

        // Filter variables based on template type
        if ($type === 'rent_reminder') {
            // Keep all variables for rent reminders
            return $variables;
        }

        return $variables;
    }
}

