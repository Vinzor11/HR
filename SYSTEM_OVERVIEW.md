# ESSU HRMS - System Overview

**Human Resource Management System for Eastern Samar State University**

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Core Modules](#core-modules)
4. [Database Structure](#database-structure)
5. [Key Features](#key-features)
6. [Authentication & Authorization](#authentication--authorization)
7. [API & Integrations](#api--integrations)
8. [File Structure](#file-structure)
9. [Development Workflow](#development-workflow)
10. [Deployment](#deployment)

---

## System Architecture

### Architecture Pattern
- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19 with TypeScript
- **Integration**: Inertia.js (SPA-like experience without API)
- **Database**: SQLite (default) / MySQL
- **Authentication**: Laravel Passport (OAuth 2.0)

### Application Flow
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│              (React + TypeScript + Tailwind)              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP Requests
                       │ Inertia.js
                       ▼
┌─────────────────────────────────────────────────────────┐
│              LARAVEL APPLICATION SERVER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Controllers  │  │   Services   │  │   Models     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Middleware  │  │  Observers   │  │   Policies   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                        │
│              (SQLite / MySQL)                            │
└─────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Framework**: Laravel 12.0
- **PHP Version**: 8.2+
- **Authentication**: Laravel Passport 13.4 (OAuth 2.0)
- **Permissions**: Spatie Laravel Permission 6.18
- **PDF Generation**: TCPDF 6.10
- **Excel Import/Export**: Maatwebsite Excel 3.1
- **Word Documents**: PHPWord 1.4
- **Testing**: Pest PHP 3.8

### Frontend
- **Framework**: React 19.0
- **Language**: TypeScript 5.7
- **UI Framework**: Tailwind CSS 4.0
- **UI Components**: Radix UI (Headless components)
- **State Management**: Inertia.js 2.0
- **Form Validation**: Yup 1.6
- **Icons**: Lucide React 0.475
- **Drag & Drop**: DnD Kit 6.3
- **Notifications**: Sonner 2.0
- **Build Tool**: Vite 6.0

### Development Tools
- **Code Quality**: Laravel Pint, ESLint, Prettier
- **Logging**: Laravel Pail
- **Package Manager**: Composer (PHP), npm (Node.js)

---

## Core Modules

### 1. Employee Management
**Status**: ✅ Fully Implemented

**Features**:
- Comprehensive employee profiles with:
  - Personal information (name, DOB, contact, addresses)
  - Physical attributes (height, weight, blood type)
  - Government IDs (GSIS, Pag-IBIG, PhilHealth, SSS, TIN)
  - Family background (parents, spouse, children)
  - Educational background (multiple entries)
  - Civil service eligibility
  - Work experience history
  - Voluntary work records
  - Learning & development
  - References
  - Other information (skills, hobbies, memberships)
- CS Form 212 Excel import (Philippine government standard)
- Employee audit logs (complete change tracking)
- Soft delete & restore functionality
- Advanced filtering & search
- Employee profile views (admin & self-service)

**Controllers**: `EmployeeController`
**Models**: `Employee`, `EmployeeChildren`, `EmployeeEducationalBackground`, `EmployeeWorkExperience`, etc.

---

### 2. Organizational Structure
**Status**: ✅ Fully Implemented

**Features**:
- **Departments**: Administrative and academic departments
- **Positions**: Job positions with hierarchy
- **Faculties**: Academic faculty management
- **Offices**: Legacy support (redirects to departments)
- Organizational audit logs
- Soft delete & restore

**Controllers**: `DepartmentController`, `PositionController`, `FacultyController`
**Models**: `Department`, `Position`, `Faculty`

---

### 3. User & Access Control
**Status**: ✅ Fully Implemented

**Features**:
- User management
- Role-Based Access Control (RBAC) via Spatie
- Permission management (granular permissions)
- User-role assignments
- Soft delete & restore
- OAuth 2.0 client management

**Controllers**: `UserController`, `RoleController`, `PermissionController`
**Models**: `User`, `Role`, `Permission`

---

### 4. Training & Development
**Status**: ✅ Fully Implemented

**Features**:
- Training program management
- Training applications
- Eligibility checking
- Training logs & history
- Training overview dashboard
- Employee training records

**Controllers**: `TrainingController`
**Models**: `Training`, `TrainingApplication`
**Services**: `TrainingEligibilityService`, `TrainingRequestBuilderService`

---

### 5. Request Management System
**Status**: ✅ Fully Implemented

**Features**:
- **Dynamic Request Builder**: Create custom request types with:
  - Multiple field types (text, textarea, date, file, dropdown, etc.)
  - Custom validation rules
  - Multi-step approval workflows
  - Role-based or user-specific approvers
  - Conditional fields
- Request submission & tracking
- Approval workflow engine
- Request fulfillment
- Certificate generation
- Request export functionality

**Controllers**: `RequestTypeController`, `RequestSubmissionController`
**Models**: `RequestType`, `RequestSubmission`, `RequestField`, `RequestApprovalAction`, `RequestFulfillment`

---

### 6. Certificate Management
**Status**: ✅ Fully Implemented

**Features**:
- Certificate template builder with visual editor
- Text layer management
- PDF generation
- Template preview
- Certificate fulfillment from requests

**Controllers**: `CertificateTemplateController`
**Models**: `CertificateTemplate`, `CertificateTextLayer`
**Services**: `CertificateService`, `CertificateTemplateConverter`

---

### 7. Leave Management
**Status**: ✅ Partially Implemented (Core Complete)

**Features**:
- Leave type management (Vacation, Sick, Personal, Maternity, Paternity, Emergency)
- Leave balance tracking (per employee, per type, per year)
- Leave accrual system
- Integration with Request Builder for leave requests
- Working days calculation (excludes weekends & holidays)
- Leave calendar view
- Leave history
- Leave balance API

**Controllers**: `LeaveController`
**Models**: `LeaveType`, `LeaveBalance`, `LeaveRequest`, `LeaveAccrual`, `Holiday`
**Services**: `LeaveService`

**Note**: Leave requests are submitted through the Request Builder system, maintaining integration with the approval workflow.

---

### 8. Dashboard & Analytics
**Status**: ⚠️ Basic Implementation

**Features**:
- Basic dashboard with key metrics
- Employee statistics
- Training statistics
- Request statistics
- Limited analytics

**Controllers**: `DashboardController`

---

## Database Structure

### Core Tables

#### Employee Management
- `employees` - Main employee records
- `employee_children` - Employee children information
- `employee_educational_background` - Education history
- `employee_work_experience` - Work history
- `employee_civil_service_eligibility` - Civil service records
- `employee_voluntary_work` - Voluntary work records
- `employee_learning_development` - Training records
- `employee_family_background` - Family information
- `employee_other_information` - Additional info
- `employee_audit_log` - Change tracking

#### Organizational Structure
- `departments` - Department/Office records
- `positions` - Job positions
- `faculties` - Academic faculties
- `organizational_audit_log` - Organizational changes

#### User & Access Control
- `users` - User accounts
- `roles` - Role definitions
- `permissions` - Permission definitions
- `model_has_roles` - User-role assignments
- `role_has_permissions` - Role-permission assignments
- `model_has_permissions` - Direct user permissions

#### Training
- `trainings` - Training programs
- `training_applications` - Employee applications
- `questionnaires` - Training questionnaires

#### Request Management
- `request_types` - Request type definitions
- `request_fields` - Dynamic form fields
- `request_submissions` - Submitted requests
- `request_answers` - Form answers
- `request_approval_actions` - Approval workflow
- `request_fulfillments` - Fulfilled requests

#### Certificate Management
- `certificate_templates` - Certificate templates
- `certificate_text_layers` - Template text layers

#### Leave Management
- `leave_types` - Leave type definitions
- `leave_balances` - Employee leave balances
- `leave_requests` - Leave request records
- `leave_accruals` - Accrual history
- `holidays` - Holiday calendar

#### OAuth
- `oauth_clients` - OAuth client applications
- `oauth_access_tokens` - Access tokens
- `oauth_refresh_tokens` - Refresh tokens
- `oauth_auth_codes` - Authorization codes

---

## Key Features

### 1. Comprehensive Employee Records
- Philippine-specific fields (GSIS, Pag-IBIG, PhilHealth, SSS, TIN)
- CS Form 212 import capability
- Complete audit trail
- Soft delete with restore

### 2. Dynamic Request Builder
- Create custom request types without coding
- Flexible approval workflows
- Multi-step approvals
- Conditional field logic
- File attachments

### 3. Certificate Generation
- Visual template editor
- PDF generation
- Text layer positioning
- Template preview

### 4. Leave Management Integration
- Integrated with Request Builder
- Automatic balance tracking
- Working days calculation
- Holiday exclusion

### 5. Training Management
- Eligibility checking
- Application tracking
- Training history

### 6. OAuth 2.0 Support
- Laravel Passport integration
- Client management
- Token-based authentication
- OpenID Connect support

### 7. Audit Logging
- Employee change tracking
- Organizational change tracking
- Complete history

---

## Authentication & Authorization

### Authentication
- **Method**: Laravel's built-in authentication
- **OAuth**: Laravel Passport for API authentication
- **Session**: Database-driven sessions

### Authorization
- **RBAC**: Spatie Laravel Permission
- **Granular Permissions**: Module-level and action-level permissions
- **Role Hierarchy**: Support for role-based access
- **Direct Permissions**: Users can have direct permissions

### Permission Structure
Permissions follow the pattern: `{action}-{resource}`

Examples:
- `access-employees-module`
- `view-employee-log`
- `restore-employee`
- `force-delete-employee`
- `access-trainings-module`
- `access-request-types-module`

---

## API & Integrations

### OAuth 2.0 Endpoints
- `/oauth/authorize` - Authorization endpoint
- `/oauth/token` - Token endpoint
- `/oauth/clients` - Client management
- `/.well-known/openid-configuration` - OpenID Connect discovery
- `/.well-known/jwks.json` - JSON Web Key Set

### Internal APIs
- `/api/roles` - Get all roles
- `/api/leaves/balance` - Get leave balance

### Integration Points
- Request Builder can be extended for various request types
- Certificate generation can be triggered from requests
- Leave management integrates with Request Builder

---

## File Structure

```
HR/
├── app/
│   ├── Console/Commands/        # Artisan commands
│   ├── Http/
│   │   ├── Controllers/          # Application controllers
│   │   ├── Middleware/           # Custom middleware
│   │   ├── Requests/             # Form request validation
│   │   └── Responses/            # Response classes
│   ├── Imports/                  # Excel import classes
│   ├── Models/                   # Eloquent models
│   ├── Notifications/            # Email notifications
│   ├── Observers/                # Model observers
│   ├── Providers/                # Service providers
│   ├── Rules/                    # Custom validation rules
│   └── Services/                 # Business logic services
├── bootstrap/                    # Application bootstrap
├── config/                       # Configuration files
├── database/
│   ├── factories/                # Model factories
│   ├── migrations/               # Database migrations
│   └── seeders/                  # Database seeders
├── public/                       # Public web files
├── resources/
│   ├── css/                      # Stylesheets
│   ├── js/                       # React/TypeScript frontend
│   │   ├── components/           # React components
│   │   ├── config/               # Configuration
│   │   ├── contexts/             # React contexts
│   │   ├── hooks/                # Custom hooks
│   │   ├── layouts/              # Layout components
│   │   ├── lib/                  # Utilities
│   │   ├── pages/                # Page components
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Helper functions
│   └── views/                    # Blade templates
├── routes/                       # Route definitions
├── storage/                      # Storage (logs, cache, files)
├── tests/                        # Test files
└── vendor/                       # Composer dependencies
```

---

## Development Workflow

### Local Development Setup

1. **Install Dependencies**
   ```bash
   composer install
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

3. **Database Setup**
   ```bash
   # For SQLite
   touch database/database.sqlite
   
   # Run migrations
   php artisan migrate
   php artisan db:seed
   ```

4. **OAuth Setup**
   ```bash
   php artisan passport:keys
   ```

5. **Storage Link**
   ```bash
   php artisan storage:link
   ```

### Running Development Server

**Option 1: All-in-one (Recommended)**
```bash
composer run dev
```
This runs:
- Laravel server (port 8000)
- Vite dev server
- Queue worker
- Log viewer (Pail)

**Option 2: Separate Terminals**
```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev

# Terminal 3 (if needed)
php artisan queue:work
```

### Code Quality

```bash
# PHP
composer run pint

# TypeScript/React
npm run format
npm run lint
npm run types
```

### Testing

```bash
php artisan test
```

---

## Deployment

### Supported Platforms
- Railway (primary)
- Docker
- Traditional VPS/Server

### Deployment Files
- `nixpacks.toml` - Railway/Nixpacks configuration
- `railway.json` - Railway-specific config
- `Dockerfile.simple` - Docker configuration
- `deploy.sh` - Deployment script

### Environment Variables
Key environment variables required:
- `APP_KEY` - Application encryption key
- `DB_CONNECTION` - Database type
- `DB_DATABASE` - Database name
- `PASSPORT_PRIVATE_KEY` - OAuth private key
- `PASSPORT_PUBLIC_KEY` - OAuth public key

### Build Process
```bash
# Frontend build
npm run build

# Production optimizations
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## System Status Summary

### ✅ Fully Implemented Modules
1. Employee Management
2. Organizational Structure
3. User & Access Control
4. Training & Development
5. Request Management System
6. Certificate Management
7. OAuth 2.0 Integration

### ⚠️ Partially Implemented Modules
1. Leave Management (Core complete, enhancements pending)
2. Dashboard & Analytics (Basic implementation)

### ❌ Missing Modules (From Standard HRIS)
1. Attendance & Time Management
2. Performance Management
3. Recruitment & ATS
4. Benefits Management
5. Advanced Reporting & Analytics
6. Employee Self-Service Portal (Enhanced)
7. Document Management (Enhanced)
8. Mobile Application

---

## Documentation Files

The system includes extensive documentation:
- `README.md` - Setup and installation guide
- `HR_SYSTEM_EVALUATION.md` - Feature comparison with standard HRIS
- `LEAVE_MANAGEMENT_IMPLEMENTATION.md` - Leave system guide
- `CERTIFICATE_GENERATION_GUIDE.md` - Certificate system guide
- `OAUTH_*` - OAuth implementation guides
- `DEPLOYMENT_*` - Deployment guides
- Various troubleshooting and feature guides

---

## Key Design Decisions

1. **Inertia.js**: Provides SPA-like experience without separate API development
2. **Request Builder**: Flexible system for handling various request types
3. **Spatie Permissions**: Industry-standard RBAC implementation
4. **Laravel Passport**: OAuth 2.0 for API and SSO capabilities
5. **Soft Deletes**: Data retention and recovery capability
6. **Audit Logs**: Complete change tracking for compliance
7. **Philippine-Specific**: CS Form 212 support and local government IDs

---

## System Strengths

1. **Comprehensive Employee Records**: Extensive employee data model
2. **Flexible Request System**: Dynamic builder for various request types
3. **Modern Tech Stack**: Latest Laravel and React versions
4. **Good Code Organization**: Clear separation of concerns
5. **Audit Trail**: Complete change tracking
6. **OAuth Support**: Ready for SSO and API integrations
7. **Philippine-Specific**: Localized for Philippine government requirements

---

## Areas for Enhancement

1. **Leave Management**: Complete calendar view and automation
2. **Attendance System**: Time tracking and attendance management
3. **Performance Management**: Reviews, goals, and KPIs
4. **Advanced Analytics**: Better reporting and dashboards
5. **Mobile App**: Native mobile application
6. **Document Management**: Enhanced document storage and organization
7. **Employee Self-Service**: Enhanced employee portal features

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Status**: Production Ready (Core Modules)

