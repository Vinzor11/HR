<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\PositionController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\TrainingController;
use App\Http\Controllers\RequestTypeController;
use App\Http\Controllers\RequestSubmissionController;
use App\Http\Controllers\LeaveController;
use App\Http\Controllers\OrganizationalLogController;
use App\Http\Controllers\OfficeController;
use App\Http\Controllers\CertificateTemplateController;
use App\Http\Controllers\EmployeeDocumentController;
use App\Http\Controllers\SectorController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\EmployeeDesignationController;
use App\Http\Controllers\EmployeePromotionController;
use App\Http\Controllers\EmployeeRankPromotionController;
use App\Http\Controllers\EmployeeGradeChangeController;
use App\Http\Controllers\UnitPositionController;
use App\Http\Controllers\AcademicRankController;
use App\Http\Controllers\StaffGradeController;

// Simple test route to check if Laravel is working
Route::get('/test', function () {
    try {
        DB::connection()->getPdo();
        $database = 'connected';
        $dbError = null;
    } catch (\Throwable $e) {
        $database = 'error';
        $dbError = $e->getMessage();
    }

    return response()->json([
        'status' => 'ok',
        'message' => 'Laravel is working',
        'database' => $database,
        'db_error' => $dbError,
    ]);
});

Route::get('/', function () {
    try {
        return Inertia::render('welcome');
    } catch (\Throwable $e) {
        // Fallback if Inertia or welcome page fails
        return response()->json([
            'error' => 'Welcome page error',
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 500);
    }
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [App\Http\Controllers\DashboardController::class, 'index'])->name('dashboard');

    // IMPORTANT: Define specific routes BEFORE resource routes to avoid conflicts
    Route::get('/employees/create', [EmployeeController::class, 'create'])->name('employees.create');
    Route::get('/employees/{employee}/profile', [EmployeeController::class, 'profile'])->name('employees.profile');
    Route::get('/my-profile', [EmployeeController::class, 'myProfile'])->name('employees.my-profile');
    Route::post('/employees/import/cs-form-212', [EmployeeController::class, 'importCsForm212'])
        ->name('employees.import.cs_form_212')
        ->middleware('permission:access-employees-module');
    // Unified Audit Logs (replaces all module-specific logs)
    Route::get('/audit-logs', [App\Http\Controllers\AuditLogController::class, 'index'])->name('audit-logs.index')->middleware('permission:view-audit-logs');
    Route::get('/audit-logs/export', [App\Http\Controllers\AuditLogController::class, 'export'])->name('audit-logs.export')->middleware('permission:view-audit-logs');
    
    // Legacy log routes (deprecated - redirect to unified audit logs)
    Route::get('/employees/logs', function () {
        return redirect()->route('audit-logs.index', ['module' => 'employees']);
    })->name('employees.logs')->middleware('permission:view-audit-logs');
    Route::get('/organizational/logs', function () {
        return redirect()->route('audit-logs.index', ['module' => 'organizational']);
    })->name('organizational.logs')->middleware('permission:view-audit-logs');
    Route::get('/users/logs', function () {
        return redirect()->route('audit-logs.index', ['module' => 'users']);
    })->name('users.logs')->middleware('permission:view-audit-logs');
    Route::get('/users/activities', [App\Http\Controllers\UserActivitiesController::class, 'activities'])->name('users.activities')->middleware('permission:view-user-activities');
    Route::post('/employees/{id}/restore', [EmployeeController::class, 'restore'])->name('employees.restore')->middleware('permission:restore-employee');
    Route::delete('/employees/{id}/force-delete', [EmployeeController::class, 'forceDelete'])->name('employees.force-delete')->middleware('permission:force-delete-employee');
    // Legacy Faculty routes removed - use new org structure (Sectors/Units) instead
    
    // New Organizational Structure Routes (Sectors and Units)
    Route::resource('sectors', SectorController::class)->middleware('permission:access-sector');
    Route::post('/sectors/{id}/restore', [SectorController::class, 'restore'])->name('sectors.restore')->middleware('permission:restore-sector');
    Route::delete('/sectors/{id}/force-delete', [SectorController::class, 'forceDelete'])->name('sectors.force-delete')->middleware('permission:force-delete-sector');
    
    Route::resource('units', UnitController::class)->middleware('permission:access-unit');
    Route::post('/units/{id}/restore', [UnitController::class, 'restore'])->name('units.restore')->middleware('permission:restore-unit');
    Route::delete('/units/{id}/force-delete', [UnitController::class, 'forceDelete'])->name('units.force-delete')->middleware('permission:force-delete-unit');
    
    // Unit-Position Whitelist Management
    Route::resource('unit-positions', UnitPositionController::class)->middleware('permission:access-unit-position');
    Route::post('/unit-positions/{id}/restore', [UnitPositionController::class, 'restore'])->name('unit-positions.restore')->middleware('permission:restore-unit-position');
    Route::delete('/unit-positions/{id}/force-delete', [UnitPositionController::class, 'forceDelete'])->name('unit-positions.force-delete')->middleware('permission:force-delete-unit-position');
    Route::post('/unit-positions/bulk', [UnitPositionController::class, 'bulkStore'])->name('unit-positions.bulk-store')->middleware('permission:create-unit-position');
    
    // Academic Ranks Management
    Route::resource('academic-ranks', AcademicRankController::class)->middleware('permission:access-academic-rank');
    Route::post('/academic-ranks/{id}/restore', [AcademicRankController::class, 'restore'])->name('academic-ranks.restore')->middleware('permission:restore-academic-rank');
    Route::delete('/academic-ranks/{id}/force-delete', [AcademicRankController::class, 'forceDelete'])->name('academic-ranks.force-delete')->middleware('permission:force-delete-academic-rank');
    
    // Staff Grades Management
    Route::resource('staff-grades', StaffGradeController::class)->middleware('permission:access-staff-grade');
    Route::post('/staff-grades/{id}/restore', [StaffGradeController::class, 'restore'])->name('staff-grades.restore')->middleware('permission:restore-staff-grade');
    Route::delete('/staff-grades/{id}/force-delete', [StaffGradeController::class, 'forceDelete'])->name('staff-grades.force-delete')->middleware('permission:force-delete-staff-grade');
    
    // Employee Designations Management
    Route::get('/employees/{employee}/designations/manage', [EmployeeDesignationController::class, 'page'])->name('employees.designations.page')->middleware('permission:access-employees-module');
    Route::get('/employees/{employee}/designations', [EmployeeDesignationController::class, 'index'])->name('employees.designations.index')->middleware('permission:access-employees-module');
    Route::post('/employees/{employee}/designations', [EmployeeDesignationController::class, 'store'])->name('employees.designations.store')->middleware('permission:edit-employee');
    Route::put('/employees/{employee}/designations/{designation}', [EmployeeDesignationController::class, 'update'])->name('employees.designations.update')->middleware('permission:edit-employee');
    Route::delete('/employees/{employee}/designations/{designation}', [EmployeeDesignationController::class, 'destroy'])->name('employees.designations.destroy')->middleware('permission:edit-employee');
    Route::post('/employees/{employee}/designations/{designation}/set-primary', [EmployeeDesignationController::class, 'setPrimary'])->name('employees.designations.set-primary')->middleware('permission:edit-employee');
    Route::get('/employees/{employee}/designations/form-options', [EmployeeDesignationController::class, 'getFormOptions'])->name('employees.designations.form-options')->middleware('permission:access-employees-module');
    
    // Employee Grade/Rank Change Management (Promotion & Correction)
    Route::get('/employees/{employee}/designations/{designation}/grade-history', [EmployeeGradeChangeController::class, 'history'])->name('employees.designations.grade-history')->middleware('permission:access-employees-module');
    Route::post('/employees/{employee}/designations/{designation}/promote', [EmployeeGradeChangeController::class, 'promote'])->name('employees.designations.promote')->middleware('permission:promote-grade');
    Route::post('/employees/{employee}/designations/{designation}/correct', [EmployeeGradeChangeController::class, 'correct'])->name('employees.designations.correct')->middleware('permission:correct-grade');
    Route::get('/employees/{employee}/designations/{designation}/grade-form-options', [EmployeeGradeChangeController::class, 'getFormOptions'])->name('employees.designations.grade-form-options')->middleware('permission:access-employees-module');
    
    // Employee Promotions Management (Staff Grade)
    Route::get('/employees/{employee}/promotions', [EmployeePromotionController::class, 'index'])->name('employees.promotions.index')->middleware('permission:access-employees-module');
    Route::post('/employees/{employee}/promotions', [EmployeePromotionController::class, 'store'])->name('employees.promotions.store')->middleware('permission:promote-employee');
    Route::get('/employees/{employee}/promotions/form-options', [EmployeePromotionController::class, 'getFormOptions'])->name('employees.promotions.form-options')->middleware('permission:access-employees-module');
    
    // Employee Rank Promotions Management (Academic Rank)
    Route::get('/employees/{employee}/rank-promotions', [EmployeeRankPromotionController::class, 'index'])->name('employees.rank-promotions.index')->middleware('permission:access-employees-module');
    Route::post('/employees/{employee}/rank-promotions', [EmployeeRankPromotionController::class, 'store'])->name('employees.rank-promotions.store')->middleware('permission:promote-employee');
    Route::get('/employees/{employee}/rank-promotions/form-options', [EmployeeRankPromotionController::class, 'getFormOptions'])->name('employees.rank-promotions.form-options')->middleware('permission:access-employees-module');
    // Legacy Department, Faculty, and Office routes removed - use new org structure (Sectors/Units) instead
    Route::resource('positions', PositionController::class)->middleware('permission:access-position');
    Route::post('/positions/{id}/restore', [PositionController::class, 'restore'])->name('positions.restore')->middleware('permission:restore-position');
    Route::delete('/positions/{id}/force-delete', [PositionController::class, 'forceDelete'])->name('positions.force-delete')->middleware('permission:force-delete-position');
    Route::resource('employees', EmployeeController::class)->middleware('permission:access-employees-module');
    Route::get('employees/{employee}/documents', [EmployeeDocumentController::class, 'index'])->name('employees.documents.index')->middleware('permission:access-employees-module');
    Route::post('employees/{employee}/documents', [EmployeeDocumentController::class, 'store'])->name('employees.documents.store')->middleware('permission:access-employees-module');
    Route::get('employees/{employee}/documents/{document}/download', [EmployeeDocumentController::class, 'download'])->name('employees.documents.download')->middleware('permission:access-employees-module');
    Route::delete('employees/{employee}/documents/{document}', [EmployeeDocumentController::class, 'destroy'])->name('employees.documents.destroy')->middleware('permission:access-employees-module');
    Route::resource('permissions', PermissionController::class)->middleware('permission:access-permissions-module');
    Route::resource('roles', RoleController::class)->middleware('permission:access-roles-module');
    Route::resource('users', UserController::class)->middleware('permission:access-users-module');
    Route::post('/users/{id}/restore', [UserController::class, 'restore'])->name('users.restore')->middleware('permission:restore-user');
    Route::delete('/users/{id}/force-delete', [UserController::class, 'forceDelete'])->name('users.force-delete')->middleware('permission:force-delete-user');
    Route::post('request-types/{request_type}/publish', [RequestTypeController::class, 'publish'])
        ->name('request-types.publish')
        ->middleware('permission:access-request-types-module');
    Route::resource('request-types', RequestTypeController::class)->middleware('permission:access-request-types-module');
    Route::resource('certificate-templates', CertificateTemplateController::class)->middleware('permission:access-request-types-module');
    Route::post('certificate-templates/preview', [CertificateTemplateController::class, 'preview'])->name('certificate-templates.preview')->middleware('permission:access-request-types-module');
    Route::get('requests', [RequestSubmissionController::class, 'index'])->name('requests.index');
    Route::get('requests/export', [RequestSubmissionController::class, 'export'])->name('requests.export');
    Route::get('requests/type/{requestType}/create', [RequestSubmissionController::class, 'create'])->name('requests.create');
    Route::post('requests/type/{requestType}', [RequestSubmissionController::class, 'store'])->name('requests.store');
    Route::get('requests/{submission}', [RequestSubmissionController::class, 'show'])->name('requests.show');
    Route::post('requests/{submission}/approve', [RequestSubmissionController::class, 'approve'])->name('requests.approve');
    Route::post('requests/{submission}/reject', [RequestSubmissionController::class, 'reject'])->name('requests.reject');
    Route::post('requests/{submission}/withdraw', [RequestSubmissionController::class, 'withdraw'])->name('requests.withdraw');
    Route::post('requests/{submission}/comment', [RequestSubmissionController::class, 'addComment'])->name('requests.comment');
    Route::post('requests/{submission}/fulfill', [RequestSubmissionController::class, 'fulfill'])->name('requests.fulfill');
    Route::get('requests/{submission}/fulfillment/download', [RequestSubmissionController::class, 'downloadFulfillment'])->name('requests.fulfillment.download');
    
    // Approval Delegations (in Settings)
    Route::get('settings/delegations', [App\Http\Controllers\ApprovalDelegationController::class, 'index'])->name('settings.delegations');
    Route::post('settings/delegations', [App\Http\Controllers\ApprovalDelegationController::class, 'store'])->name('settings.delegations.store');
    Route::delete('settings/delegations/{id}', [App\Http\Controllers\ApprovalDelegationController::class, 'destroy'])->name('settings.delegations.destroy');
    Route::get('api/delegations/active', [App\Http\Controllers\ApprovalDelegationController::class, 'getActiveDelegation'])->name('api.delegations.active');
    Route::get('api/delegations/to-me', [App\Http\Controllers\ApprovalDelegationController::class, 'getDelegationsToMe'])->name('api.delegations.to-me');
    
    Route::get('trainings/join', [TrainingController::class, 'join'])->name('trainings.join');
    Route::post('trainings/join', [TrainingController::class, 'apply'])->name('trainings.apply');
    Route::get('trainings/logs', [TrainingController::class, 'logs'])->name('trainings.logs');
    Route::get('trainings/overview', [TrainingController::class, 'overview'])
        ->name('trainings.overview')
        ->middleware('permission:access-trainings-module');
    Route::resource('trainings', TrainingController::class)->middleware('permission:access-trainings-module');
    Route::post('/trainings/{id}/restore', [TrainingController::class, 'restore'])->name('trainings.restore')->middleware('permission:restore-training');
    Route::delete('/trainings/{id}/force-delete', [TrainingController::class, 'forceDelete'])->name('trainings.force-delete')->middleware('permission:force-delete-training');
    Route::get('/api/roles', [RoleController::class, 'getAllRoles'])->name('roles.api');

    // Leave Management Routes (CS Form No. 6 Compliant)
    Route::get('leaves/balance', [LeaveController::class, 'myBalance'])->name('leaves.balance');
    Route::get('leaves/calendar', [LeaveController::class, 'calendar'])->name('leaves.calendar')
        ->middleware('permission:access-leave-calendar');
    Route::get('leaves/history', [LeaveController::class, 'myHistory'])->name('leaves.history');
    // Leave API endpoints
    Route::get('api/leaves/balance', [LeaveController::class, 'getBalance'])->name('api.leaves.balance');
    Route::get('api/leaves/credits', [LeaveController::class, 'getLeaveCredits'])->name('api.leaves.credits');
    Route::get('api/leaves/types', [LeaveController::class, 'getAvailableLeaveTypes'])->name('api.leaves.types');
    Route::get('api/leaves/history', [LeaveController::class, 'getLeaveHistory'])->name('api.leaves.history');

    // Admin Leave Balance Management Routes
    Route::middleware('permission:manage-leave-balances')->prefix('admin/leave-balances')->name('admin.leave-balances.')->group(function () {
        Route::get('/', [App\Http\Controllers\LeaveBalanceAdminController::class, 'index'])->name('index');
        Route::get('/special-leave-types', [App\Http\Controllers\LeaveBalanceAdminController::class, 'getSpecialLeaveTypes'])->name('special-leave-types');
        Route::get('/{employee}', [App\Http\Controllers\LeaveBalanceAdminController::class, 'show'])->name('show');
        Route::get('/{employee}/balance', [App\Http\Controllers\LeaveBalanceAdminController::class, 'getEmployeeBalance'])->name('get-balance');
        Route::post('/{employee}/initial-balance', [App\Http\Controllers\LeaveBalanceAdminController::class, 'setInitialBalance'])->name('set-initial-balance');
        Route::post('/{employee}/adjust', [App\Http\Controllers\LeaveBalanceAdminController::class, 'adjustBalance'])->name('adjust');
        Route::post('/{employee}/grant-special', [App\Http\Controllers\LeaveBalanceAdminController::class, 'grantSpecialLeave'])->name('grant-special');
        Route::post('/bulk-initial-balances', [App\Http\Controllers\LeaveBalanceAdminController::class, 'bulkSetInitialBalances'])->name('bulk-initial-balances');
    });

    // OAuth Client Management
    Route::get('oauth/clients', [App\Http\Controllers\OAuth\ClientController::class, 'index'])
        ->name('oauth.clients')
        ->middleware('permission:access-oauth-clients');
    Route::get('oauth/clients/test', [App\Http\Controllers\OAuth\ClientController::class, 'testPage'])
        ->name('oauth.clients.test')
        ->middleware('permission:access-oauth-clients');
    Route::get('oauth/clients/userinfo-preview', [App\Http\Controllers\OAuth\ClientController::class, 'userinfoPreview'])
        ->name('oauth.clients.userinfo-preview')
        ->middleware('permission:access-oauth-clients');
    Route::post('oauth/clients', [App\Http\Controllers\OAuth\ClientController::class, 'store'])
        ->name('oauth.clients.store')
        ->middleware('permission:access-oauth-clients');
    Route::get('oauth/clients/{id}/edit', [App\Http\Controllers\OAuth\ClientController::class, 'edit'])
        ->name('oauth.clients.edit')
        ->middleware('permission:access-oauth-clients');
    Route::get('oauth/clients/{id}/form-data', [App\Http\Controllers\OAuth\ClientController::class, 'formData'])
        ->name('oauth.clients.form-data')
        ->middleware('permission:access-oauth-clients');
    Route::put('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'update'])
        ->name('oauth.clients.update')
        ->middleware('permission:access-oauth-clients');
    Route::get('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'show'])
        ->name('oauth.clients.show')
        ->middleware('permission:access-oauth-clients');
    Route::delete('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'destroy'])
        ->name('oauth.clients.destroy')
        ->middleware('permission:delete-oauth-client');

    // Log Viewer Routes (Super Admin only)
    Route::get('admin/logs', [App\Http\Controllers\LogViewController::class, 'index'])
        ->name('admin.logs.view')
        ->middleware('role:super-admin');
    Route::post('admin/logs/clear', [App\Http\Controllers\LogViewController::class, 'clear'])
        ->name('admin.logs.clear')
        ->middleware('role:super-admin');
    Route::get('admin/logs/download', [App\Http\Controllers\LogViewController::class, 'download'])
        ->name('admin.logs.download')
        ->middleware('role:super-admin');

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/oauth.php';
