# QUOTATION APPLICATION - COMPLETE SPECIFICATION
## For IT Company (Software Support, Software & Hardware Sales)

## TECHNOLOGY STACK
- **Primary Backend**: PHP Laravel
- **Secondary Services**: Node.js (PDF, Email, Real-time)
- **Frontend**: React.js (Admin Panel)
- **Database**: MySQL
- **Authentication**: Laravel Sanctum (Phase 3)

## BUSINESS REQUIREMENTS

### Product Types:
1. **Services**: Man-day based pricing (PMS, POS, MC, SUN System support)
2. **Software**: Perpetual licenses with optional AMC (On-Prem, Cloud, PMS, POS, SUN, MC)
3. **Hardware**: With brand, model, part number + optional AMC

### Key Features:
- Auto-generated quotation numbers (Q-2024-001)
- Multi-currency (USD, MVR) with exchange rates
- Configurable quotation validity (default: 14 days)
- Customer-specific discounts
- AMC as optional line items below main products
- Customizable T&C templates by product type
- PDF generation
- Reporting dashboard

## COMPLETE DATABASE SCHEMA

```sql
-- SYSTEM CONFIGURATION
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE currency_rates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CUSTOMERS
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_number VARCHAR(100),
    default_currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(100),
    discount_rate DECIMAL(5,2) DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- PRODUCT CATALOG
CREATE TABLE product_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    parent_id INT NULL,
    category_type ENUM('services', 'hardware', 'software') NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);

CREATE TABLE amc_descriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description TEXT NOT NULL,
    product_type ENUM('software', 'hardware') NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    category_id INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    is_man_day_based BOOLEAN DEFAULT FALSE,
    has_amc_option BOOLEAN DEFAULT FALSE,
    amc_unit_price DECIMAL(12,2) DEFAULT 0,
    amc_description_id INT,
    brand VARCHAR(100),
    model VARCHAR(100),
    part_number VARCHAR(100),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES product_categories(id),
    FOREIGN KEY (amc_description_id) REFERENCES amc_descriptions(id)
);

-- TERMS & CONDITIONS
CREATE TABLE terms_conditions_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category_type ENUM('hardware', 'software', 'services', 'general') NOT NULL,
    sub_category_id INT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sub_category_id) REFERENCES product_categories(id)
);

-- QUOTATION MANAGEMENT
CREATE TABLE quotation_sequence (
    id INT PRIMARY KEY AUTO_INCREMENT,
    year INT NOT NULL,
    last_number INT DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'Q',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_year (year)
);

CREATE TABLE quotations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    status ENUM('draft', 'sent', 'accepted', 'rejected', 'expired') DEFAULT 'draft',
    valid_until DATE,
    currency VARCHAR(3) DEFAULT 'USD',
    exchange_rate DECIMAL(10,4) DEFAULT 1.0000,
    subtotal DECIMAL(12,2),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    notes TEXT,
    terms_conditions TEXT,
    selected_tc_templates JSON,
    created_by INT,
    sent_date DATE NULL,
    accepted_date DATE NULL,
    rejected_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE quotation_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    quotation_id INT NOT NULL,
    product_id INT,
    item_type ENUM('product', 'service', 'amc') NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    item_total DECIMAL(12,2) NOT NULL,
    parent_item_id INT NULL,
    is_amc_line BOOLEAN DEFAULT FALSE,
    amc_description_used TEXT,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (parent_item_id) REFERENCES quotation_items(id)
);

-- USERS (Phase 3)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255),
    role ENUM('admin', 'sales', 'viewer') DEFAULT 'sales',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);