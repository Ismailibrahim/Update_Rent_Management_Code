# 🏠 Rent Management System

A comprehensive full-stack rental property management system built with **Next.js 15** and **Laravel 12**, featuring modern UI, robust database design, and enterprise-grade functionality.

## ✨ Key Features

### 🏢 Property Management
- **Multi-property Support**: Manage multiple rental properties with detailed specifications
- **Rental Unit Management**: Track individual units with capacity, amenities, and status
- **Property Capacity**: Monitor bedroom/bathroom allocation and availability
- **Photo Management**: Upload and manage property images
- **Asset Tracking**: Track property assets and maintenance history

### 👥 Advanced Tenant Management
- **Individual & Company Tenants**: Support for both individual and corporate tenants
- **Company Tenant Features**:
  - Company name, address, registration number
  - GST/TIN information
  - Separate company contact details
  - Personal contact person information
- **Document Management**: Upload and manage tenant documents and agreements
- **Lease Management**: Track lease start/end dates and terms
- **Tenant History**: Complete tenant information and rental history

### 💰 Financial Management
- **Rent Invoice Generation**: Automated monthly rent invoice creation
- **Payment Processing**: Track payments with multiple payment modes
- **Payment Slips**: Optional payment slip uploads for bank transfers
- **Currency Support**: Multi-currency support with MVR formatting
- **Financial Reports**: Comprehensive financial tracking and reporting
- **Overdue Management**: Track and manage overdue payments

### 🔧 Maintenance & Assets
- **Maintenance Requests**: Create and track maintenance requests
- **Asset Management**: Track property assets and their status
- **Cost Tracking**: Monitor maintenance costs and expenses
- **Work Order Management**: Assign and track maintenance work orders

### 📊 Dashboard & Analytics
- **Real-time Dashboard**: Live property and financial status
- **Occupancy Reports**: Track property occupancy rates
- **Financial Analytics**: Income, expenses, and profit tracking
- **Maintenance Analytics**: Track maintenance costs and frequency

## 🛠 Technology Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **React 19** - Latest React with modern hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling
- **Lucide React** - Modern icon library
- **React Hook Form** - Form handling and validation
- **React Hot Toast** - User notifications
- **Axios** - HTTP client for API requests

### Backend
- **Laravel 12.31.1** - PHP web framework
- **PHP 8.2.12** - Server-side language
- **MySQL** - Relational database
- **Eloquent ORM** - Database object-relational mapping
- **Laravel Sanctum** - API authentication
- **Laravel Migrations** - Database version control

### Database
- **MySQL** - Primary database with InnoDB engine
- **27 Migrations** - Comprehensive schema management
- **Foreign Key Constraints** - Data integrity enforcement
- **Optimized Indexes** - Performance-optimized queries

## 📁 Project Structure

```
Rent Management M/
├── frontend/                    # Next.js frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── tenants/        # Tenant management pages
│   │   │   ├── properties/     # Property management pages
│   │   │   ├── rental-units/   # Rental unit pages
│   │   │   ├── rent-invoices/  # Invoice management
│   │   │   ├── payment-records/# Payment tracking
│   │   │   └── maintenance/    # Maintenance pages
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Layout/         # Layout components
│   │   │   └── UI/             # UI components
│   │   ├── contexts/           # React contexts
│   │   ├── services/           # API services
│   │   └── utils/              # Utility functions
│   ├── package.json
│   └── next.config.ts
├── backend/                    # Laravel backend
│   ├── app/
│   │   ├── Http/Controllers/Api/ # API controllers
│   │   ├── Models/             # Eloquent models
│   │   └── Providers/          # Service providers
│   ├── database/
│   │   ├── migrations/         # Database migrations
│   │   └── seeders/            # Database seeders
│   ├── routes/
│   │   └── api.php             # API routes
│   └── storage/                # File storage
├── package.json                # Root package configuration
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **PHP 8.2+**
- **MySQL 8.0+**
- **Composer** (PHP dependency manager)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/lugmanahmed/Rent-Managment.git
   cd Rent-Managment
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   ```bash
   # Copy backend environment file
   cp backend/.env.example backend/.env
   
   # Edit backend/.env with your database configuration
   ```

4. **Set up the database**
   ```bash
   cd backend
   php artisan migrate
   php artisan db:seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000

## ⚙️ Configuration

### Backend Environment (.env)
```env
APP_NAME="Rent Management System"
APP_ENV=local
APP_KEY=base64:your-app-key
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rent_management
DB_USERNAME=your_username
DB_PASSWORD=your_password

SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

### Frontend Environment (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 📊 Database Schema

### Core Tables
- **users** - User authentication and roles
- **tenants** - Tenant information (individual/company)
- **properties** - Property management
- **rental_units** - Individual rental units
- **rent_invoices** - Rent invoice management
- **payment_records** - Payment tracking
- **maintenance_requests** - Maintenance management
- **assets** - Property asset tracking

### Key Features
- **Normalized Schema** - Properly structured relational database
- **Data Integrity** - Foreign key constraints and validation
- **Performance Optimized** - Strategic indexes for fast queries
- **Migration-Based** - Version-controlled schema changes

## 🔐 Authentication & Security

### User Roles
- **Admin** - Full system access
- **Property Manager** - Limited to assigned properties
- **Accountant** - Financial data access only

### Security Features
- **Laravel Sanctum** - Token-based API authentication
- **CSRF Protection** - Cross-site request forgery protection
- **Input Validation** - Server-side validation
- **SQL Injection Protection** - Eloquent ORM protection
- **File Upload Security** - Secure file handling

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - User registration

### Tenants
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/{id}` - Get tenant details
- `PUT /api/tenants/{id}` - Update tenant
- `POST /api/tenants/{id}/update` - Update with file uploads
- `DELETE /api/tenants/{id}` - Delete tenant

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/{id}` - Get property details
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property

### Rental Units
- `GET /api/rental-units` - List rental units
- `POST /api/rental-units` - Create rental unit
- `GET /api/rental-units/{id}` - Get rental unit details
- `PUT /api/rental-units/{id}` - Update rental unit
- `DELETE /api/rental-units/{id}` - Delete rental unit

### Rent Invoices
- `GET /api/rent-invoices` - List invoices
- `POST /api/rent-invoices/generate-monthly` - Generate monthly invoices
- `POST /api/rent-invoices/{id}/mark-paid` - Mark invoice as paid
- `GET /api/rent-invoices/statistics` - Invoice statistics

### Payment Records
- `GET /api/payment-records` - List payment records
- `POST /api/payment-records` - Create payment record
- `PUT /api/payment-records/{id}` - Update payment record
- `DELETE /api/payment-records/{id}` - Delete payment record

## 🎨 UI/UX Features

### Modern Interface
- **Responsive Design** - Mobile-first approach
- **Dark/Light Theme** - User preference support
- **Intuitive Navigation** - Clean sidebar navigation
- **Real-time Updates** - Live data updates
- **Toast Notifications** - User feedback system

### Form Management
- **React Hook Form** - Efficient form handling
- **Validation** - Client and server-side validation
- **File Uploads** - Drag-and-drop file uploads
- **Conditional Fields** - Dynamic form fields based on selections

### Data Display
- **Data Tables** - Sortable and filterable tables
- **Search Functionality** - Global and field-specific search
- **Pagination** - Efficient data pagination
- **Currency Formatting** - Proper MVR and multi-currency support

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd frontend
npm run build

# Optimize backend
cd backend
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### Environment Setup
1. **Production Environment Variables**
2. **Database Configuration**
3. **File Storage Setup**
4. **SSL Certificate Configuration**
5. **Performance Optimization**

### Recommended Hosting
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: DigitalOcean, AWS EC2, or Laravel Forge
- **Database**: AWS RDS, DigitalOcean Managed Database, or PlanetScale

## 🧪 Development

### Code Quality
- **TypeScript** - Type safety and better development experience
- **ESLint** - Code linting and quality enforcement
- **Prettier** - Code formatting
- **Git Hooks** - Pre-commit quality checks

### Testing
- **Frontend Testing** - Jest and React Testing Library
- **Backend Testing** - PHPUnit for Laravel
- **API Testing** - Postman collection available

## 📈 Performance

### Optimizations
- **Database Indexing** - Strategic indexes for fast queries
- **Laravel Caching** - Application and query caching
- **Next.js Optimization** - Automatic code splitting and optimization
- **Image Optimization** - Next.js Image component
- **Bundle Optimization** - Tree shaking and code splitting

### Monitoring
- **Error Tracking** - Laravel logging and error handling
- **Performance Monitoring** - Database query optimization
- **User Analytics** - Usage tracking and analytics

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and inline code comments
- **Issues**: Create an issue in the GitHub repository
- **Discussions**: Use GitHub Discussions for questions

### Common Issues
- **Database Connection**: Check MySQL service and credentials
- **File Uploads**: Ensure storage directory permissions
- **API Errors**: Check Laravel logs in `storage/logs/`

## 🔮 Roadmap

### Upcoming Features
- [ ] **Email Notifications** - Automated rent reminders and notifications
- [ ] **Calendar Integration** - Maintenance scheduling and lease renewals
- [ ] **Advanced Reporting** - Charts and detailed analytics
- [ ] **Mobile App** - React Native mobile application
- [ ] **Payment Gateway Integration** - Online payment processing
- [ ] **Document Templates** - Automated lease and invoice generation
- [ ] **Multi-language Support** - Internationalization
- [ ] **API Rate Limiting** - Enhanced API security
- [ ] **Property Valuation Tracking** - Market value monitoring
- [ ] **Tenant Portal** - Self-service tenant portal

### Performance Improvements
- [ ] **Redis Caching** - Advanced caching layer
- [ ] **CDN Integration** - Content delivery optimization
- [ ] **Database Optimization** - Query performance improvements
- [ ] **Image Compression** - Automatic image optimization

## 📊 Project Statistics

- **Frontend**: Next.js 15 with TypeScript
- **Backend**: Laravel 12 with PHP 8.2
- **Database**: MySQL with 27 migrations
- **API Endpoints**: 99+ RESTful endpoints
- **Code Quality**: ESLint + TypeScript strict mode
- **Build Status**: ✅ Production ready

---

**Built with ❤️ using Next.js, Laravel, and MySQL**

*For more information, visit the [GitHub Repository](https://github.com/lugmanahmed/Rent-Managment)*