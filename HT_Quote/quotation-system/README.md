# Quotation Management System - Backend API

This is the Laravel backend API for the Quotation Management System, providing RESTful APIs for quotation, customer, and product management.

## Technology Stack

- **Framework**: Laravel 11.x
- **Database**: MySQL 8.0+ / 9.4+
- **Authentication**: Laravel Sanctum
- **PDF Generation**: DomPDF
- **API**: RESTful JSON APIs

## Database Configuration

The system uses MySQL as the primary database. Ensure your `.env` file is configured:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=quotation_system
DB_USERNAME=root
DB_PASSWORD=
```

## Quick Start

1. **Install dependencies**:
   ```bash
   composer install
   ```

2. **Setup environment**:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Create MySQL database**:
   ```sql
   CREATE DATABASE quotation_system;
   ```

4. **Run migrations and seeders**:
   ```bash
   php artisan migrate
   php artisan db:seed
   ```

5. **Start development server**:
   ```bash
   php artisan serve
   ```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Quotations
- `GET /api/quotations` - List quotations
- `POST /api/quotations` - Create quotation
- `GET /api/quotations/{id}` - Get quotation details
- `PUT /api/quotations/{id}` - Update quotation
- `DELETE /api/quotations/{id}` - Delete quotation

### Products & Customers
- `GET /api/products` - List products
- `GET /api/customers` - List customers
- `GET /api/categories` - List product categories

### Landed Cost Calculator
- `POST /api/landed-cost/calculate` - Calculate landed costs
- `POST /api/landed-cost/create-shipment` - Create shipment
- `GET /api/landed-cost/shipments` - List shipments

## Default Users

After running seeders, you can login with:
- **Admin**: `admin` / `password`
- **Demo**: `demo` / `demo123`

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

We would like to extend our thanks to the following sponsors for funding Laravel development. If you are interested in becoming a sponsor, please visit the [Laravel Partners program](https://partners.laravel.com).

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
