# Permission Audit Report

## Summary
This report identifies permissions that are seeded but not actually used in the system, as well as permissions that are used but missing from the seeder.

---

## 🔴 Unused Permissions (Seeded but NOT Checked in Controllers)

### 1. User Module Permissions
**Issue:** `UserController` uses role-based checks instead of permission checks.

- ❌ `create-user` - NOT checked in `UserController@store`
- ❌ `edit-user` - NOT checked in `UserController@update`
- ❌ `delete-user` - NOT checked in `UserController@destroy`
- ⚠️ `view-user` - NOT checked in `UserController@index` (but used in frontend table config)

**Location:** `app/Http/Controllers/UserController.php`

**Note:** The controller uses hardcoded role checks (`super-admin`, `admin`, `editor`, `user`) instead of permission-based checks.

---

### 2. Permission Module
- ⚠️ `view-permission` - NOT checked in `PermissionController@index` (but used in frontend table config)

**Location:** `app/Http/Controllers/PermissionController.php`

---

### 3. Role Module
- ⚠️ `view-role` - NOT checked in `RoleController@index` (but used in frontend table config)

**Location:** `app/Http/Controllers/RoleController.php`

---

### 4. Category Module
- ❌ `view-category` - NOT checked anywhere

**Location:** `app/Http/Controllers/CategoryController.php`

---

### 5. Training Module
- ⚠️ `view-training` - NOT checked in `TrainingController` (but used in frontend table config)

**Location:** `app/Http/Controllers/TrainingController.php`

---

### 6. Request Type Module
- ❌ `view-request-type` - NOT checked anywhere

**Location:** `app/Http/Controllers/RequestTypeController.php`

---

### 7. Organizational Structure - View Permissions
These are used in frontend table configurations but NOT checked in controllers:

- ⚠️ `view-faculty` - NOT checked in `FacultyController` (but used in `resources/js/config/tables/faculty-table.ts`)
- ⚠️ `view-department` - NOT checked in `DepartmentController` (but used in `resources/js/config/tables/department-table.ts`)
- ⚠️ `view-office` - NOT checked in `OfficeController` (but used in `resources/js/config/tables/office-table.ts`)
- ⚠️ `view-position` - NOT checked in `PositionController` (but used in `resources/js/config/tables/position-table.tsx`)

---

### 8. Employee Module
- ❌ `delete-employee` - NOT checked in `EmployeeController@destroy`

**Location:** `app/Http/Controllers/EmployeeController.php`

**Note:** Only `force-delete-employee` is checked, but the regular `delete-employee` (soft delete) is not checked in the `destroy` method.

---

## 🟡 Missing Permissions (Used but NOT in Seeder)

### 1. Categories Module
- ❌ `access-categories-module` - **USED** in routes and controller but **NOT** in seeder!

**Where it's used:**
- `routes/web.php` line 37: `Route::resource('categories', CategoryController::class)->middleware('permission:access-categories-module');`
- `app/Http/Controllers/CategoryController.php` line 18: `abort_unless($request->user()->can('access-categories-module'), 403, 'Unauthorized action.');`

**Action Required:** Add this permission to `database/seeders/SuperAdminSeeder.php`

---

## 📊 Statistics

- **Total Unused Permissions:** 15
- **Missing Permissions:** 1
- **Permissions Used Only in Frontend:** 6 (view-* permissions in table configs)

---

## 💡 Recommendations

### High Priority
1. **Add missing permission:** Add `access-categories-module` to the seeder
2. **Fix UserController:** Replace role-based checks with permission checks, or remove user permissions from seeder if role-based approach is intentional
3. **Add delete-employee check:** Add permission check to `EmployeeController@destroy`

### Medium Priority
4. **Add view-* checks:** Consider adding view permission checks in controller index methods for consistency, or remove them from seeder if frontend-only checks are sufficient
5. **Standardize approach:** Decide whether view permissions should be checked in controllers or only in frontend

### Low Priority
6. **Remove unused permissions:** If certain permissions are intentionally not used, consider removing them from the seeder to reduce confusion

---

## 🔍 How to Verify

To verify if a permission is used:
1. **Backend:** Search for `can('permission-name')` or `permission:permission-name` in controllers and routes
2. **Frontend:** Search for `permission: 'permission-name'` or `hasPermission(permissions, 'permission-name')` in React components

---

## Notes

- ⚠️ = Used in frontend but not checked in backend
- ❌ = Not used anywhere
- Permissions marked with ⚠️ may still be useful for frontend-only access control, but they're not enforced at the backend level.
