# ESSU HRMS Local Setup Script for Windows
# Run this script from PowerShell: .\setup.ps1

Write-Host "Setting up ESSU HRMS locally..." -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    
    $envContent = @"
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
MAIL_FROM_NAME="`${APP_NAME}"
"@
    
    $envContent | Out-File -FilePath .env -Encoding UTF8
    Write-Host "[OK] .env file created!" -ForegroundColor Green
} else {
    Write-Host "[INFO] .env file already exists, skipping..." -ForegroundColor Blue
}

# Check if SQLite database exists
if (!(Test-Path "database\database.sqlite")) {
    Write-Host "Creating SQLite database..." -ForegroundColor Yellow
    New-Item -ItemType File -Path "database\database.sqlite" -Force | Out-Null
    Write-Host "[OK] Database file created!" -ForegroundColor Green
} else {
    Write-Host "[INFO] SQLite database already exists, skipping..." -ForegroundColor Blue
}

# Install Composer dependencies
Write-Host ""
Write-Host "Installing PHP dependencies with Composer..." -ForegroundColor Yellow
composer install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Composer dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install Composer dependencies!" -ForegroundColor Red
    exit 1
}

# Install NPM dependencies
Write-Host ""
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] NPM dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to install NPM dependencies!" -ForegroundColor Red
    exit 1
}

# Generate app key
Write-Host ""
Write-Host "Generating application key..." -ForegroundColor Yellow
php artisan key:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Application key generated!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to generate application key!" -ForegroundColor Red
    exit 1
}

# Run migrations
Write-Host ""
Write-Host "Running database migrations..." -ForegroundColor Yellow
php artisan migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Migrations completed!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Migrations may have failed. Check the error above." -ForegroundColor Yellow
}

# Run seeders
Write-Host ""
Write-Host "Seeding database..." -ForegroundColor Yellow
php artisan db:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database seeded!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Seeding may have failed. Check the error above." -ForegroundColor Yellow
}

# Generate Passport keys
Write-Host ""
Write-Host "Generating Passport keys..." -ForegroundColor Yellow
php artisan passport:keys
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Passport keys generated!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Passport keys may already exist. Continuing..." -ForegroundColor Yellow
}

# Create storage link
Write-Host ""
Write-Host "Creating storage link..." -ForegroundColor Yellow
php artisan storage:link
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Storage link created!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Storage link may already exist. Continuing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To run the application:" -ForegroundColor Cyan
Write-Host "  Option 1 (Recommended): composer run dev" -ForegroundColor White
Write-Host "  Option 2: php artisan serve (in one terminal) + npm run dev (in another)" -ForegroundColor White
Write-Host ""
Write-Host "Then open: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
