# Quotation Management System

A comprehensive quotation management system built with Laravel for IT companies offering software support, software licenses, and hardware sales.

## Features

- **Quotation Management**: Create, manage, and track quotations with auto-generated numbers
- **Product Catalog**: Manage products, services, and hardware with categories
- **Customer Management**: Store and manage customer information
- **Multi-Currency Support**: Handle USD/MVR with exchange rates
- **AMC (Annual Maintenance Contract)**: Optional maintenance contracts for products
- **Terms & Conditions**: Configurable templates based on product types
- **Reporting**: Dashboard with quotation statistics and analytics

## Technology Stack

- **Backend**: PHP Laravel 12.x
- **Frontend**: Next.js 15.x with TypeScript
- **Database**: MySQL 8.0+
- **Authentication**: Laravel Sanctum
- **PDF Generation**: DomPDF
- **API**: RESTful APIs
- **UI Components**: Shadcn/ui

## Installation

### Prerequisites
- PHP 8.2 or higher
- Composer
- MySQL 8.0+
- Node.js 18+ (for frontend development)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   cd quotation-system
   ```

2. **Install PHP dependencies**
   ```bash
   composer install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. **Database Setup (MySQL)**
   - **Option A: XAMPP/Laragon (Recommended)**
     - Ensure XAMPP/Laragon is running with MySQL service
     - Database `quotation_system` will be auto-created during setup
     - Update `.env` file with MySQL credentials:
     ```
     DB_CONNECTION=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_DATABASE=quotation_system
     DB_USERNAME=root
     DB_PASSWORD=
     ```
   
   - **Option B: Standalone MySQL**
     - Install MySQL Server 8.0+ or MySQL Server 9.4+
     - Create database: `CREATE DATABASE quotation_system;`
     - Update `.env` file with your MySQL credentials

5. **Run Migrations and Seeders**
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

6. **Install Sanctum (for API authentication)**
   ```bash
   php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
   php artisan migrate
   ```

7. **Start the Development Server**
   ```bash
   php artisan serve
   ```

## API Endpoints

### Quotations
- `GET /api/quotations` - List all quotations
- `POST /api/quotations` - Create new quotation
- `GET /api/quotations/{id}` - Get quotation details
- `PUT /api/quotations/{id}` - Update quotation
- `DELETE /api/quotations/{id}` - Delete quotation
- `POST /api/quotations/{id}/send` - Send quotation
- `POST /api/quotations/{id}/accept` - Accept quotation
- `POST /api/quotations/{id}/reject` - Reject quotation
- `POST /api/quotations/{id}/pdf` - Generate PDF

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Deactivate product

### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/{id}` - Get customer details
- `PUT /api/customers/{id}` - Update customer
- `DELETE /api/customers/{id}` - Delete customer

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/categories/{id}` - Get category details
- `PUT /api/categories/{id}` - Update category
- `DELETE /api/categories/{id}` - Delete category

### Settings & Reports
- `GET /api/settings` - Get system settings
- `POST /api/settings/{key}` - Update setting
- `GET /api/reports/quotations-stats` - Quotation statistics
- `GET /api/reports/quotations-by-status` - Status breakdown
- `GET /api/reports/top-customers` - Top customers report

## Business Rules

### Quotation Numbering
- Format: `Q-YYYY-NNN` (e.g., Q-2024-001)
- Auto-incremented annually
- Configurable prefix

### Product Types
1. **Services**: Man-day based pricing
2. **Software**: Perpetual licenses with optional AMC
3. **Hardware**: Unit pricing with optional AMC

### AMC Handling
- Optional line items below main products
- Predefined descriptions by product type
- Separate pricing structure

### Multi-Currency
- Base currency: USD
- Secondary: MVR
- Exchange rates with effective dates

## Sample Data

The system includes sample data:
- Product categories (Services, Hardware, Software)
- Sample products and customers
- System settings
- Terms & conditions templates
- AMC descriptions

## Development

### Running Tests
```bash
php artisan test
```

### Code Style
```bash
./vendor/bin/pint
```

### Database Reset
```bash
php artisan migrate:fresh --seed
```

## Implementation Phases

- **Phase 1**: Core Laravel system with basic CRUD ✅
- **Phase 2**: Advanced features (AMC, T&C, multi-currency)
- **Phase 3**: React frontend
- **Phase 4**: Reporting & authentication

## Quick Start - Frontend & Backend Together

### Option 1: Automatic Startup (Recommended)
**Double-click**: `START-ALL.bat` in the root folder (`D:\Sandbox\HT_Quote\`)

This will automatically start:
- Laravel Backend (Port 8000)
- Next.js Frontend (Port 3000)

### Option 2: Manual Startup
Open **TWO** separate terminals:

**Terminal 1 - Backend:**
```bash
cd D:\Sandbox\HT_Quote\quotation-system
php artisan serve --host=0.0.0.0 --port=8000
```

**Terminal 2 - Frontend:**
```bash
cd D:\Sandbox\HT_Quote\quotation-frontend
npm run dev
```

## Access the Application

After starting both servers, wait 30 seconds, then access:

- **Login Page**: http://localhost:3000/login
- **Dashboard**: http://localhost:3000/dashboard
- **Categories Page**: http://localhost:3000/dashboard/categories
- **Customers Page**: http://localhost:3000/dashboard/customers

### Default Login Credentials
- **Username**: `admin`
- **Password**: `password`

## 🚀 **ONE-COMMAND DEPLOYMENT** ⚡

### **Deploy in One Command**

Your application is **production-ready** with fully automated deployment!

#### **Windows:**
```bash
DEPLOY.bat
```

#### **Linux/Mac:**
```bash
chmod +x DEPLOY.sh
./DEPLOY.sh
```

**That's it!** The script automatically:
- ✅ Checks prerequisites
- ✅ Configures production environment
- ✅ Sets up database
- ✅ Installs dependencies
- ✅ Builds frontend
- ✅ Starts all services
- ✅ Performs health checks

#### **Quick Configuration:**
Edit the top section of `DEPLOY.bat` or `DEPLOY.sh`:
```bash
# Set your database credentials
DB_DATABASE=quotation_system
DB_USERNAME=root
DB_PASSWORD=your_password

# For production on internet:
PRODUCTION_DOMAIN=yourdomain.com
API_URL=https://api.yourdomain.com/api
```

**See `ONE-COMMAND-DEPLOY.md` for complete guide**

---

## 🌐 Deployment to Internet

### **Deploy Your Application Online**

This application can be deployed to various hosting platforms:

#### **Free Hosting Options (Recommended)**
- **Frontend**: [Vercel](https://vercel.com) (free) - Perfect for Next.js
- **Backend**: [Railway](https://railway.app) (free) - Great for Laravel
- **Database**: Railway MySQL (free)

#### **Paid Hosting Options**
- **VPS**: DigitalOcean ($5-10/month)
- **Cloud**: AWS, Google Cloud, Azure

### **Deployment Features**
- ✅ **One-command deployment** (local & production)
- ✅ Production-ready configuration
- ✅ Security optimizations
- ✅ Performance caching
- ✅ SSL/HTTPS support
- ✅ Database migrations
- ✅ Environment variable setup
- ✅ Automatic health checks

## Database Migration (SQLite → MySQL)

If you're migrating from the previous SQLite setup to MySQL:

### Migration Steps
1. **Backup existing data** (if any):
   ```bash
   # Export SQLite data to SQL
   sqlite3 database/database.sqlite .dump > backup.sql
   ```

2. **Update environment configuration**:
   ```bash
   # Edit .env file
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=quotation_system
   DB_USERNAME=root
   DB_PASSWORD=
   ```

3. **Create MySQL database**:
   ```sql
   CREATE DATABASE quotation_system;
   ```

4. **Run fresh migrations and seeders**:
   ```bash
   php artisan migrate:fresh --seed
   ```

5. **Verify migration**:
   ```bash
   php artisan tinker
   # In tinker: User::count() should return 2 (admin + demo users)
   ```

### Database Schema
The system uses MySQL with the following key tables:
- `users` - User authentication and roles
- `customers` - Customer information and contacts
- `products` - Product catalog with categories
- `quotations` - Quotation headers and metadata
- `quotation_items` - Individual line items
- `shipments` - Shipment tracking and landed costs
- `shipment_items` - Shipment line items with cost allocation

## Troubleshooting

### Database Connection Issues
1. **MySQL not running**: Start MySQL service in XAMPP/Laragon
2. **Wrong credentials**: Check `.env` file database settings
3. **Database doesn't exist**: Create `quotation_system` database manually
4. **Permission denied**: Ensure MySQL user has proper privileges

### Pages Not Loading
1. Ensure both servers are running (check terminal windows)
2. Wait 30-60 seconds after starting (first compile takes time)
3. Hard refresh browser: `Ctrl + F5`
4. Clear browser cache
5. Try incognito mode
6. Try different browser

### Port Already in Use Errors
```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill //F //PID <PID_NUMBER>

# Kill process on port 8000
netstat -ano | findstr :8000
taskkill //F //PID <PID_NUMBER>
```

### Clear Laravel Cache
```bash
cd D:\Sandbox\HT_Quote\quotation-system
php artisan route:clear
php artisan config:clear
php artisan cache:clear
```

### Frontend Issues
First page load takes 20-30 seconds (this is normal Next.js behavior). If it takes longer:
```bash
cd D:\Sandbox\HT_Quote\quotation-frontend
rm -rf .next
npm run dev
```

## License

MIT License