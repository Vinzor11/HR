# Employee Scope Implementation Guide

## Overview
This document explains how to implement hierarchical employee viewing restrictions so that Department Heads and Deans can only view employees under their management.

## Solution Architecture

### 1. **Position-Based Approach (Recommended)**
Uses the existing organizational hierarchy structure:
- **Dean** (hierarchy_level 9-10): Views all employees in their faculty
- **Department Head** (hierarchy_level 8 OR matches `department.head_position_id`): Views all employees in their department
- **Regular Employees**: Can only view themselves
- **Super Admin/Admin**: Views all employees

### 2. **Why Position-Based?**
- ✅ More reliable than role-based (positions are tied to actual organizational structure)
- ✅ Automatically handles organizational changes
- ✅ Uses existing `hierarchy_level` and `head_position_id` fields
- ✅ Works with your existing `HierarchicalApproverService` logic

## Implementation Details

### Service: `EmployeeScopeService`

**Key Methods:**

1. **`getEmployeeScope(User $user)`** - Returns a query builder with scoped conditions
   - Returns `null` for super-admin/admin (no restrictions)
   - Returns scoped query for hierarchical users
   - Returns empty query for unauthorized users

2. **`getFacultyScope(Employee $employee)`** - For Deans
   - Returns employees in departments belonging to the dean's faculty
   - Includes faculty-level positions (no department) in the same faculty

3. **`getDepartmentScope(Employee $employee)`** - For Department Heads
   - Returns all employees in the same department

4. **`canViewEmployee(User $user, Employee $targetEmployee)`** - Check specific access

5. **`getManageableDepartmentIds(User $user)`** - Get department IDs user can manage
   - Useful for filtering dropdowns in forms

6. **`getManageableFacultyIds(User $user)`** - Get faculty IDs user can manage
   - Useful for filtering dropdowns in forms

### Usage in Controllers

```php
// In EmployeeController
$scopeQuery = $this->scopeService->getEmployeeScope($request->user());

$employees = Employee::with($relationshipsToLoad)
    ->when($scopeQuery !== null, function ($query) use ($scopeQuery) {
        $query->whereIn('id', $scopeQuery->select('id'));
    })
    // ... rest of your query
```

## Specific Scenarios for Your System

### Scenario 1: Dean Views Employees
**User:** Dean of College of Engineering (hierarchy_level 10)
**Can View:**
- All employees in departments under College of Engineering
- Employees with faculty-level positions in College of Engineering
- Cannot view employees from other faculties

**Implementation:**
- Checks if `position.hierarchy_level` is 9 or 10
- Gets faculty_id from employee's department or position
- Filters employees by `department.faculty_id` or `position.faculty_id`

### Scenario 2: Department Head Views Employees
**User:** Head of Computer Science Department (hierarchy_level 8)
**Can View:**
- All employees in Computer Science Department
- Cannot view employees from other departments

**Implementation:**
- Checks if `position.hierarchy_level` is 8
- OR checks if `department.head_position_id` matches user's position_id
- Filters employees by `department_id`

### Scenario 3: Regular Employee
**User:** Regular faculty member
**Can View:**
- Only themselves

**Implementation:**
- Returns query with `where('id', $employee->id)`

## Additional Recommendations

### 1. **Apply to Other Modules**

You should apply this scope to:
- **Training Overview** - Department heads should only see trainings for their department
- **Leave Requests** - Filter by manageable employees
- **Request Submissions** - Filter by scope
- **Reports** - Limit data to manageable scope

**Example for Training Overview:**
```php
// In TrainingController@overview
$manageableDeptIds = $this->scopeService->getManageableDepartmentIds($request->user());

$trainings = Training::with(['applications.employee'])
    ->when(!empty($manageableDeptIds), function ($query) use ($manageableDeptIds) {
        $query->whereHas('applications.employee', function ($q) use ($manageableDeptIds) {
            $q->whereIn('department_id', $manageableDeptIds);
        });
    })
    ->get();
```

### 2. **Frontend Filtering**

Update frontend dropdowns to respect scope:
```php
// In controller
$manageableDeptIds = $this->scopeService->getManageableDepartmentIds($request->user());
$departments = Department::whereIn('id', $manageableDeptIds)->get();
```

### 3. **Middleware Approach (Alternative)**

You could create middleware to automatically apply scope:
```php
// app/Http/Middleware/ScopeEmployeeAccess.php
public function handle($request, Closure $next)
{
    if ($request->route()->parameter('employee')) {
        $employee = Employee::findOrFail($request->route()->parameter('employee'));
        if (!$this->scopeService->canViewEmployee($request->user(), $employee)) {
            abort(403, 'You do not have permission to view this employee.');
        }
    }
    return $next($request);
}
```

### 4. **Edge Cases to Handle**

1. **Faculty-Level Positions (No Department)**
   - Deans can see them if they're in the same faculty
   - Department heads cannot see them (they have no department)

2. **Administrative Departments**
   - Department heads of administrative departments can see all employees in that department
   - Deans cannot see administrative departments (they have no faculty_id)

3. **Multiple Roles**
   - If user has both "Department Head" role AND "Dean" role, use the highest hierarchy level
   - Current implementation uses position hierarchy_level, which handles this

4. **Position Changes**
   - When an employee's position changes, their scope automatically updates
   - No manual role assignment needed

## Testing Checklist

- [ ] Dean can view all employees in their faculty
- [ ] Dean cannot view employees from other faculties
- [ ] Department Head can view all employees in their department
- [ ] Department Head cannot view employees from other departments
- [ ] Regular employee can only view themselves
- [ ] Super Admin can view all employees
- [ ] Faculty-level positions (no department) are visible to Dean
- [ ] Administrative departments work correctly
- [ ] Scope applies to employee list, training overview, leave requests

## Migration Path

1. ✅ Create `EmployeeScopeService`
2. ✅ Integrate into `EmployeeController@index`
3. ⏳ Apply to other controllers (Training, Leave, etc.)
4. ⏳ Update frontend filters
5. ⏳ Add middleware for route protection
6. ⏳ Test with real users

## Benefits

1. **Automatic**: No manual role assignment needed - uses organizational structure
2. **Maintainable**: Changes to org structure automatically update access
3. **Secure**: Prevents unauthorized access at the query level
4. **Flexible**: Easy to extend for other modules
5. **Consistent**: Uses same logic as `HierarchicalApproverService`

