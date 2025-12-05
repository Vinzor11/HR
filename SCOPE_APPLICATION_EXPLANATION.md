# Employee Scope: Academic vs Administrative Departments

## How the Scope Applies

### ✅ **Department Head Scope** - Works for BOTH Academic AND Administrative

**Example 1: Academic Department Head**
- User: Head of Computer Science Department (academic, hierarchy_level 8)
- Can View: All employees in Computer Science Department
- Cannot View: Employees from other departments

**Example 2: Administrative Department Head**
- User: Head of HR Office (administrative, hierarchy_level 8)
- Can View: All employees in HR Office
- Cannot View: Employees from other offices/departments

**Implementation:**
- Simply filters by `department_id`
- Works regardless of department type (academic or administrative)

---

### ✅ **Dean Scope** - Works for ACADEMIC Departments ONLY

**Example: Dean of College of Engineering**
- User: Dean (hierarchy_level 10, in College of Engineering faculty)
- Can View:
  - ✅ All employees in academic departments under College of Engineering
    - Computer Science Department
    - Electrical Engineering Department
    - Mechanical Engineering Department
  - ✅ Employees with faculty-level positions in College of Engineering
- Cannot View:
  - ❌ Employees in administrative departments (HR, Finance, etc.)
  - ❌ Employees from other faculties

**Why Administrative Departments are Excluded:**
- Administrative departments have `faculty_id = null`
- They don't belong to any faculty
- Deans manage academic units only, not administrative offices

**Implementation:**
- Filters by `department.faculty_id` AND `department.type = 'academic'`
- Excludes departments where `type = 'administrative'`

---

## Summary Table

| User Role | Academic Departments | Administrative Departments |
|-----------|---------------------|---------------------------|
| **Super Admin/Admin** | ✅ All | ✅ All |
| **Dean** (hierarchy 9-10) | ✅ Their faculty only | ❌ None (not under faculty) |
| **Department Head** (hierarchy 8) | ✅ Their department | ✅ Their department |
| **Regular Employee** | ❌ Only themselves | ❌ Only themselves |

---

## Edge Cases Handled

### 1. **Dean in Administrative Position**
- If a Dean somehow has an administrative department (shouldn't happen, but handled)
- Result: Returns empty scope (no employees visible)
- Reason: Administrative departments have no `faculty_id`

### 2. **Department Head of Administrative Office**
- Head of HR Office (administrative)
- Result: Can see all employees in HR Office
- Works perfectly - uses `department_id` filter

### 3. **Faculty-Level Positions (No Department)**
- Employee has position with `faculty_id` but no `department_id`
- Dean can see them if they're in the same faculty
- Department Head cannot see them (they have no department)

### 4. **Mixed Scenarios**
- Dean who is also a Department Head: Uses Dean scope (higher level)
- Department Head in administrative office: Uses department scope (works for both types)

---

## Code Logic

```php
// Department Head - Works for BOTH
protected function getDepartmentScope(Employee $employee): Builder
{
    // Simply filters by department_id
    // Works for both academic and administrative
    return Employee::where('department_id', $employee->department_id);
}

// Dean - ACADEMIC ONLY
protected function getFacultyScope(Employee $employee): Builder
{
    // Filters by faculty_id AND type='academic'
    // Administrative departments are excluded
    return Employee::whereHas('department', function ($q) use ($facultyId) {
        $q->where('faculty_id', $facultyId)
          ->where('type', 'academic'); // ← Key filter
    });
}
```

---

## Recommendation

**Current implementation is correct!** 

- ✅ Department Heads can manage both academic and administrative departments
- ✅ Deans only manage academic departments (as it should be)
- ✅ Administrative offices are independent and managed by their own heads

This matches real-world organizational structure where:
- Academic units (departments) are under faculties (managed by Deans)
- Administrative offices are independent units (managed by their own heads)

