# Audit Log Refactoring Guide

## Overview
This document provides guidance for completing the migration from module-specific audit logs to the unified audit logging system.

## Completed Components

### 1. Database & Models
- ✅ Created unified `audit_logs` table migration
- ✅ Created `AuditLog` model
- ✅ Created data migration to move existing logs

### 2. Services & Controllers
- ✅ Created `AuditLogService` for centralized logging
- ✅ Created `AuditLogController` for viewing logs
- ✅ Updated `EmployeeController` to use `AuditLogService`
- ✅ Updated `UserController` to use `AuditLogService`
- ✅ Updated `RegisteredUserController` to use `AuditLogService`

### 3. UI & Navigation
- ✅ Created unified Audit Logs page (`resources/js/pages/audit-logs/index.tsx`)
- ✅ Updated sidebar to remove old log menus and add single "Audit Logs" menu
- ✅ Updated routes to use new `AuditLogController`

## Remaining Work

### 1. Update Organizational Controllers
The following controllers still use `OrganizationalAuditLog::create()` and need to be updated:

- `app/Http/Controllers/FacultyController.php`
- `app/Http/Controllers/DepartmentController.php`
- `app/Http/Controllers/OfficeController.php`
- `app/Http/Controllers/PositionController.php`
- `app/Services/PositionAutoCreationService.php`

**Pattern to follow:**

Replace:
```php
OrganizationalAuditLog::create([
    'unit_type' => 'faculty',
    'unit_id' => $faculty->id,
    'action_type' => 'CREATE',
    'field_changed' => null,
    'old_value' => null,
    'new_value' => "Created a New Faculty Record: {$faculty->name}",
    'action_date' => now(),
    'performed_by' => auth()->user()?->name ?? 'System',
]);
```

With:
```php
app(AuditLogService::class)->logCreated(
    'organizational',
    'Faculty', // or 'Department', 'Office', 'Position'
    (string)$faculty->id,
    "Created a New Faculty Record: {$faculty->name}",
    null,
    $faculty
);
```

### 2. Update Employee Profile Method
The `profile()` method in `EmployeeController` still references `EmployeeAuditLog` for employment history. Update to use `AuditLog`:

```php
// Replace:
$employmentHistory = EmployeeAuditLog::where('employee_id', $employee->id)
    ->whereIn('field_changed', $historyFields)
    ->orderBy('action_date', 'desc')
    ->get();

// With:
$employmentHistory = AuditLog::where('module', 'employees')
    ->where('entity_type', 'Employee')
    ->where('entity_id', $employee->id)
    ->whereIn('description', $historyFields) // Adjust based on how fields are stored
    ->orderBy('created_at', 'desc')
    ->get();
```

### 3. Remove Old Models & Controllers
After all controllers are updated:

1. Delete old models:
   - `app/Models/EmployeeAuditLog.php`
   - `app/Models/UserAuditLog.php`
   - `app/Models/OrganizationalAuditLog.php`

2. Delete old controllers:
   - `app/Http/Controllers/OrganizationalLogController.php`

3. Delete old pages:
   - `resources/js/pages/employees/logs.tsx`
   - `resources/js/pages/users/logs.tsx`
   - `resources/js/pages/organizational/logs.tsx`

4. Create migration to drop old tables (after data migration is complete):
```php
Schema::dropIfExists('employee_audit_log');
Schema::dropIfExists('user_audit_log');
Schema::dropIfExists('organizational_audit_log');
```

### 4. Update Permissions
Ensure the `view-audit-logs` permission exists and is assigned appropriately. The old permissions (`view-employee-log`, `view-user-log`, `view-organizational-log`) can be deprecated.

### 5. Update Mobile Navigation
Update `resources/js/components/mobile-bottom-nav.tsx` to remove old log menu items and add the unified Audit Logs menu.

## AuditLogService Usage Patterns

### Log Creation
```php
app(AuditLogService::class)->logCreated(
    'employees',        // module
    'Employee',         // entity_type
    $employee->id,      // entity_id
    'Description',      // description
    null,               // new_values (optional)
    $employee           // entity model (optional, for snapshot)
);
```

### Log Update
```php
app(AuditLogService::class)->logUpdated(
    'employees',
    'Employee',
    $employee->id,
    'Updated field name',
    ['field' => 'old_value'],  // old_values
    ['field' => 'new_value'],  // new_values
    $employee                  // entity model (optional)
);
```

### Log Deletion
```php
app(AuditLogService::class)->logDeleted(
    'employees',
    'Employee',
    $employee->id,
    'Deleted description',
    null,               // old_values (optional)
    $employee           // entity model (optional)
);
```

### Log Restoration
```php
app(AuditLogService::class)->logRestored(
    'employees',
    'Employee',
    $employee->id,
    'Restored description',
    $employee
);
```

### Log Approval/Rejection
```php
app(AuditLogService::class)->logApproved(
    'requests',
    'Request',
    $request->id,
    'Request approved',
    ['reason' => '...']  // optional additional data
);
```

### Custom Action
```php
app(AuditLogService::class)->log(
    'exported',         // action
    'employees',
    'Employee',
    $employee->id,
    'Exported employee data',
    null,               // old_values
    ['format' => 'csv'] // new_values
);
```

## Testing Checklist

- [ ] Run data migration to move existing logs
- [ ] Verify all new logs use unified system
- [ ] Test audit log viewing with filters
- [ ] Test export functionality
- [ ] Verify permissions work correctly
- [ ] Test contextual logs in employee/user profiles
- [ ] Verify old log routes redirect correctly
- [ ] Test mobile navigation

## Notes

- All logs are append-only (immutable)
- Sensitive fields (passwords, tokens) are automatically masked
- IP address and user agent are automatically captured
- Reference numbers are auto-generated
- Logs preserve history even if entities are deleted (entity_id can be null)
