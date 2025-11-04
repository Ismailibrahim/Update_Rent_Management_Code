-- Create invoice_templates table
CREATE TABLE IF NOT EXISTS `invoice_templates` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `type` enum('rent','maintenance','both') NOT NULL DEFAULT 'rent',
  `template_data` json NOT NULL,
  `html_content` text DEFAULT NULL,
  `styles` json DEFAULT NULL,
  `logo_path` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `invoice_templates_type_is_active_index` (`type`,`is_active`),
  KEY `invoice_templates_is_default_index` (`is_default`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

