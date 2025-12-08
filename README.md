# ESSU HRMS - Local Development Setup

Human Resource Management System for Eastern Samar State University

This is a Laravel 12 application with React frontend (using Inertia.js).

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **PHP 8.2 or higher** ([Download PHP](https://windows.php.net/download/))
- **Composer** ([Download Composer](https://getcomposer.org/download/))
- **Node.js 20+ and npm** ([Download Node.js](https://nodejs.org/))
- **MySQL** (optional, SQLite is used by default) or **SQLite**

### Required PHP Extensions

Make sure these PHP extensions are enabled:
- `php8.2-mysql` or `php_pdo_mysql`
- `php8.2-zip`
- `php8.2-gd`
- `php8.2-mbstring`
- `php8.2-curl`
- `php8.2-xml`
- `php8.2-bcmath`
- `php8.2-intl`

## Installation Steps

### 1. Clone the Repository (if not already done)

```bash
cd C:\Users\arvin\HR
```

### 2. Install PHP Dependencies

```bash
composer install
```

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Configure Environment

Create a `.env` file from the default configuration:

**For Windows PowerShell:**
```powershell
if (!(Test-Path .env)) { Copy-Item .env.example .env -ErrorAction SilentlyContinue }
```

**Or manually create `.env` file** with the following content:

```env
APP_NAME="ESSU HRMS"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000

LOG_CHANNEL=stack
LOG_LEVEL=debug

DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_DRIVER=file
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### 5. Generate Application Key

```bash
php artisan key:generate
```

### 6. Create SQLite Database (if using SQLite)

**For Windows PowerShell:**
```powershell
New-Item -ItemType File -Path database\database.sqlite -Force
```

**Or manually create:** Create a file named `database.sqlite` in the `database` folder.

### 7. Run Database Migrations and Seeders

```bash
php artisan migrate
php artisan db:seed
```

This will:
- Create all database tables
- Create a super admin user
- Seed initial data (leave request types, etc.)

### 8. Generate Passport Keys (for OAuth)

```bash
php artisan passport:keys
```

### 9. Create Storage Link

```bash
php artisan storage:link
```

## Running the Application

### Option 1: Using the Dev Script (Recommended - Runs Everything)

This runs the PHP server, queue worker, logs, and Vite dev server simultaneously:

```bash
composer run dev
```

This will start:
- Laravel server on `http://localhost:8000`
- Vite dev server for frontend assets
- Queue worker
- Log viewer

### Option 2: Manual Setup (Run Each Service Separately)

**Terminal 1 - Laravel Server:**
```bash
php artisan serve
```

**Terminal 2 - Vite Dev Server:**
```bash
npm run dev
```

**Terminal 3 - Queue Worker (if needed):**
```bash
php artisan queue:work
```

## Accessing the Application

1. Open your browser and navigate to: `http://localhost:8000`
2. Login with the super admin credentials created by the seeder

## Building for Production

If you need to build the frontend assets:

```bash
npm run build
```

## Troubleshooting

### Permission Issues (Windows)

If you encounter permission errors, ensure:
- The `storage` and `bootstrap/cache` directories are writable
- Your user account has full control over the project directory

### Database Issues

If SQLite isn't working, you can switch to MySQL:

1. Create a MySQL database
2. Update `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=hrms_db
   DB_USERNAME=root
   DB_PASSWORD=your_password
   ```
3. Run migrations: `php artisan migrate`

### PHP Extensions Missing

If you get errors about missing PHP extensions:
1. Edit `php.ini` file
2. Uncomment the required extensions (remove `;` at the start)
3. Restart your web server/PHP

### Port Already in Use

If port 8000 is in use:
```bash
php artisan serve --port=8001
```

## Project Structure

- `app/` - Laravel application code (Controllers, Models, etc.)
- `resources/js/` - React/TypeScript frontend code
- `routes/` - Application routes
- `database/migrations/` - Database migrations
- `database/seeders/` - Database seeders
- `config/` - Configuration files
- `public/` - Public web files

## Additional Commands

```bash
# Clear all caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear

# Run tests
php artisan test

# Run code formatting
composer run pint
npm run format

# Check code types
npm run types
```

## Need Help?

- Check Laravel logs: `storage/logs/laravel.log`
- Check the documentation files in the root directory
- Review the deployment guides for additional configuration options





