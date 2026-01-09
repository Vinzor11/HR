# Production Setup Guide for Leave Balance Auto Accrual

## Overview
This system automatically handles:
- **Monthly Leave Accrual**: VL and SL earn 1.25 days per month (15 days/year)
- **Annual Carry-Over**: Unused leave balances carry over to the next year (up to 30 days)

## Required Setup in Production

### 1. Set Up Laravel Scheduler (CRITICAL)

The scheduler must run every minute to execute scheduled tasks. Add this to your crontab:

```bash
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

**For Linux/Unix/Mac:**
```bash
# Edit crontab
crontab -e

# Add this line (replace /path-to-your-project with your actual project path)
* * * * * cd /path-to-your-project && php artisan schedule:run >> /dev/null 2>&1
```

**For Windows (Development):**
Use Windows Task Scheduler to run `php artisan schedule:run` every minute.

**For Railway/Heroku:**
- Railway: Add a worker process that runs `php artisan schedule:run`
- Heroku: Use Heroku Scheduler add-on or a worker dyno

### 2. Scheduled Tasks

The following tasks are automatically scheduled:

#### Monthly Accrual
- **When**: 1st day of each month at 2:00 AM (Asia/Manila timezone)
- **Command**: `php artisan leave:process-monthly-accrual`
- **What it does**: Processes monthly accrual (1.25 days) for all active employees for the previous month
- **Manual run**: `php artisan leave:process-monthly-accrual --month=2026-01`

#### Annual Carry-Over
- **When**: January 1st at 1:00 AM (Asia/Manila timezone)
- **Command**: `php artisan leave:carry-over --all`
- **What it does**: Carries over unused leave balances from previous year (up to 30 days per leave type)
- **Manual run**: `php artisan leave:carry-over --all --year=2026`

### 3. Initial Setup (First Time Only)

If you're setting up the system for the first time or migrating existing data:

#### Step 1: Run Migrations
```bash
php artisan migrate
```

#### Step 2: Process Carry-Over for Current Year
If it's already 2026 and you need to carry over 2025 balances:

```bash
php artisan leave:carry-over --all --year=2026
```

#### Step 3: Process Monthly Accruals for Past Months
If you're setting up mid-year, process accruals for months that have passed:

```bash
# Process January 2026
php artisan leave:process-monthly-accrual --month=2026-01

# Process February 2026
php artisan leave:process-monthly-accrual --month=2026-02

# Continue for each month...
```

### 4. Verify Scheduler is Working

Check if the scheduler is running:

```bash
# View scheduled tasks
php artisan schedule:list

# Test scheduler (runs scheduled tasks that are due)
php artisan schedule:run
```

### 5. Troubleshooting

#### Monthly Accrual Not Running
1. Check if scheduler is running: `php artisan schedule:list`
2. Manually run: `php artisan leave:process-monthly-accrual`
3. Check logs: `storage/logs/laravel.log`

#### Carry-Over Not Working
1. Check if previous year has balances: Query `leave_balances` table
2. Manually run: `php artisan leave:carry-over --all --year=2026`
3. Check if leave type allows carry-over: `can_carry_over = true` in `leave_types` table

#### Permission Cache Issues
If menu items don't appear after role changes:
```bash
php artisan cache:clear
```

### 6. Important Notes

- **VL and SL**: These accrue monthly (1.25 days/month), NOT as annual entitlement
- **SPL**: This is granted annually (3 days/year) on January 1st
- **Carry-Over Cap**: Maximum 30 days per leave type (CSC rule)
- **Annual Entitlement**: Only added for SPL, not for VL/SL (they use monthly accruals)

### 7. Database Maintenance

Periodically check:
- `leave_accruals` table for accrual records
- `leave_balances` table for current balances
- `leave_credits_history` table for historical records

## Commands Reference

```bash
# Monthly accrual
php artisan leave:process-monthly-accrual                    # Process previous month
php artisan leave:process-monthly-accrual --month=2026-01   # Process specific month

# Carry-over
php artisan leave:carry-over --all                          # All employees, current year
php artisan leave:carry-over --employee=EMP001 --year=2026  # Specific employee
php artisan leave:carry-over --all --year=2026              # All employees, specific year

# Cache
php artisan cache:clear                                     # Clear all cache
php artisan config:clear                                    # Clear config cache
php artisan route:clear                                     # Clear route cache
```

## Support

If you encounter issues:
1. Check Laravel logs: `storage/logs/laravel.log`
2. Verify scheduler is running: `php artisan schedule:list`
3. Test commands manually to isolate issues
4. Check database for existing records that might conflict

