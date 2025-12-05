# Leave Management System - Implementation Guide

## Overview

This document describes the hybrid leave management system that integrates with your existing Request Builder. The system allows employees to submit leave requests through the Request Builder while maintaining proper leave balance tracking, accrual, and reporting.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           LEAVE MANAGEMENT SYSTEM                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────────┐   │
│  │  Request Builder  │      │  Leave Management     │   │
│  │  (Submission &    │◄─────►│  Module (Core Logic) │   │
│  │   Approval)       │       │                      │   │
│  └──────────────────┘      └──────────────────────┘   │
│         │                            │                  │
│         │                            │                  │
│         ▼                            ▼                  │
│  ┌──────────────────────────────────────────────┐       │
│  │     Leave Balance & Accrual Engine           │       │
│  │     - Balance tracking                       │       │
│  │     - Accrual calculation                     │       │
│  │     - Rules engine                            │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │     Leave Calendar & Reports                  │       │
│  │     - Calendar view                           │       │
│  │     - Analytics                               │       │
│  │     - Reports                                 │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Database Structure

### Tables Created

1. **leave_types** - Types of leave (Vacation, Sick, Personal, etc.)
2. **leave_balances** - Employee leave balances per type per year
3. **leave_requests** - Leave request records (linked to request_submissions)
4. **leave_accruals** - Leave accrual history
5. **holidays** - Holiday calendar for working days calculation

## Setup Instructions

### 1. Run Migrations

```bash
php artisan migrate
```

### 2. Seed Default Leave Types

```bash
php artisan db:seed --class=LeaveTypeSeeder
```

This will create:
- Vacation Leave (VAC) - 15 days/year
- Sick Leave (SICK) - 15 days/year
- Personal Leave (PER) - 5 days/year
- Maternity Leave (MAT) - 105 days/year
- Paternity Leave (PAT) - 7 days/year
- Emergency Leave (EMER) - 5 days/year

### 3. Create Leave Request Type in Request Builder

1. Go to **Requests → Dynamic Builder**
2. Click **Create New Request Type**
3. Name: "Leave Request"
4. Add the following fields:
   - **Leave Type** (Dropdown) - Required
     - Options: VAC, SICK, PER, MAT, PAT, EMER
   - **Start Date** (Date) - Required
   - **End Date** (Date) - Required
   - **Reason** (Textarea) - Required
   - **Medical Certificate** (File) - Optional (for sick leave)
   - **Coverage Notes** (Textarea) - Optional
5. Set up approval workflow:
   - Step 1: Direct Manager (Role-based or User-specific)
   - Step 2: HR Approval (if leave > 5 days) - Optional
6. **Publish** the request type

### 4. Initialize Leave Balances for Employees

You'll need to create initial leave balances for existing employees. You can do this via:

**Option A: Tinker (Quick)**
```bash
php artisan tinker
```

```php
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\LeaveBalance;
use App\Services\LeaveService;

$leaveService = app(LeaveService::class);
$leaveType = LeaveType::where('code', 'VAC')->first();
$year = now()->year;

// For all active employees
Employee::where('status', 'active')->each(function ($employee) use ($leaveType, $year, $leaveService) {
    $leaveService->addAccrual(
        $employee->id,
        $leaveType->id,
        15.0, // 15 days vacation leave
        'manual',
        'Initial leave entitlement for ' . $year
    );
});
```

**Option B: Create a Seeder**
```bash
php artisan make:seeder InitializeLeaveBalancesSeeder
```

## How It Works

### 1. Employee Submits Leave Request

1. Employee goes to **Requests → Request Center → New Request → Leave Request**
2. Fills out the form:
   - Selects Leave Type
   - Enters Start Date and End Date
   - Provides Reason
   - Uploads Medical Certificate (if required)
3. System validates:
   - Minimum notice period
   - Sufficient leave balance
   - Date range validity
4. On submission:
   - Request is created in Request Builder
   - Balance is **reserved** (moved to pending)
   - Leave request record is created (status: pending)

### 2. Manager Approves Leave Request

1. Manager sees leave request in approval queue
2. Manager can see:
   - Employee's leave balance
   - Team calendar (if implemented)
   - Request details
3. Manager approves/rejects
4. On approval:
   - Leave request status → approved
   - Balance is **deducted** (moved from pending to used)
   - Leave appears on calendar

### 3. Leave Balance Tracking

- **Entitled**: Total leave entitlement for the year
- **Accrued**: Leave accrued this period
- **Used**: Approved leave days
- **Pending**: Leave days awaiting approval
- **Balance**: Available = Entitled - Used - Pending

## Key Features

### ✅ Implemented

1. **Leave Balance Tracking**
   - Per employee, per leave type, per year
   - Automatic balance calculation
   - Pending balance reservation

2. **Integration with Request Builder**
   - Leave requests submitted through Request Builder
   - Approval workflow handled by Request Builder
   - Automatic balance deduction on approval

3. **Working Days Calculation**
   - Excludes weekends
   - Excludes holidays (from holidays table)
   - Accurate day count

4. **Leave Service**
   - Balance management
   - Accrual handling
   - Validation
   - Calendar generation

5. **Frontend Pages**
   - Leave Balance view
   - Leave Calendar (basic)
   - Leave History

### 🚧 To Be Implemented

1. **Leave Calendar View** (Enhanced)
   - Full calendar visualization
   - Team/department calendar
   - Conflict detection

2. **Leave Accrual Automation**
   - Monthly accrual job
   - Prorated accrual for new employees
   - Carry-over processing

3. **Leave Reports**
   - Utilization reports
   - Balance reports
   - Trend analysis

4. **Holiday Management**
   - Admin interface for holidays
   - Recurring holidays
   - Local holidays

5. **Leave Request Validation Enhancement**
   - Real-time balance check in form
   - Minimum notice validation
   - Blackout periods

## API Endpoints

### Get Leave Balance
```
GET /api/leaves/balance?year=2025
```

Response:
```json
{
  "balances": [
    {
      "leave_type": {
        "id": 1,
        "name": "Vacation Leave",
        "code": "VAC",
        "color": "#3b82f6"
      },
      "balance": {
        "entitled": 15.0,
        "used": 5.0,
        "pending": 2.0,
        "balance": 8.0,
        "accrued": 15.0
      },
      "available": 8.0,
      "entitled": 15.0,
      "used": 5.0,
      "pending": 2.0,
      "accrued": 15.0
    }
  ],
  "year": 2025
}
```

## Usage Examples

### Adding Leave Accrual

```php
use App\Services\LeaveService;

$leaveService = app(LeaveService::class);

// Add 15 days vacation leave for employee
$leaveService->addAccrual(
    'EMP001',           // employee_id
    1,                  // leave_type_id (Vacation)
    15.0,               // amount
    'annual',           // accrual_type
    'Annual entitlement for 2025'
);
```

### Checking Leave Balance

```php
use App\Services\LeaveService;

$leaveService = app(LeaveService::class);

// Check if employee has sufficient balance
$hasBalance = $leaveService->hasSufficientBalance(
    'EMP001',
    1,  // Vacation leave
    5.0 // days
);
```

### Getting Leave Calendar

```php
use App\Services\LeaveService;
use Carbon\Carbon;

$leaveService = app(LeaveService::class);

$startDate = Carbon::create(2025, 1, 1);
$endDate = Carbon::create(2025, 1, 31);

$leaves = $leaveService->getLeaveCalendar($startDate, $endDate);
```

## Troubleshooting

### Leave Balance Not Deducting

1. Check if LeaveRequestObserver is registered in AppServiceProvider
2. Verify request type name is exactly "Leave Request"
3. Check logs: `storage/logs/laravel.log`
4. Verify employee_id exists on user record

### Balance Calculation Issues

1. Verify holidays are set up correctly
2. Check working days calculation excludes weekends
3. Verify leave type codes match in Request Builder dropdown

### Integration Not Working

1. Ensure RequestSubmission model observer is registered
2. Check that request type name matches exactly
3. Verify field keys in Request Builder match expected values:
   - `leave_type`
   - `start_date`
   - `end_date`
   - `reason`

## Next Steps

1. **Test the System**
   - Create a leave request type in Request Builder
   - Submit a test leave request
   - Approve it and verify balance deduction

2. **Initialize Balances**
   - Run seeder or tinker commands to set initial balances
   - Verify balances appear in Leave Balance page

3. **Enhance Frontend**
   - Complete Leave Calendar view
   - Add Leave History page
   - Add balance validation in request form

4. **Automate Accruals**
   - Create scheduled job for monthly accrual
   - Set up carry-over processing

5. **Add Reports**
   - Leave utilization reports
   - Department leave reports
   - Balance reports

## Support

For issues or questions:
1. Check logs: `storage/logs/laravel.log`
2. Review observer: `app/Observers/LeaveRequestObserver.php`
3. Check service: `app/Services/LeaveService.php`

---

**Implementation Date:** January 2025  
**Status:** Core functionality complete, enhancements pending



