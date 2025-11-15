-- Service Tasks Sample Data for PMS Implementation Support
-- This SQL file contains sample data for service tasks related to product ID 1

-- For PMS Implementation Support (service product)
INSERT INTO `service_tasks` (`product_id`, `task_description`, `estimated_man_days`, `sequence_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Initial requirement gathering and analysis', 2.00, 1, 1, NOW(), NOW()),
(1, 'System configuration and setup', 4.00, 2, 1, NOW(), NOW()),
(1, 'User training and documentation', 3.00, 3, 1, NOW(), NOW()),
(1, 'Go-live support and handover', 2.00, 4, 1, NOW(), NOW()),
(1, 'Post-implementation review', 1.00, 5, 1, NOW(), NOW());

-- Total: 12 man days for this service
-- Man day rate calculation: unit_price / total_man_days
-- Example: If unit_price = 12000, then man_day_rate = 12000 / 12 = 1000 per man day

