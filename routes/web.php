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
    Route::get('/employees/logs', [EmployeeController::class, 'logs'])->name('employees.logs')->middleware('permission:view-employee-log');
    Route::get('/organizational/logs', [OrganizationalLogController::class, 'logs'])->name('organizational.logs')->middleware('permission:view-organizational-log');
    Route::get('/users/logs', [UserController::class, 'logs'])->name('users.logs')->middleware('permission:view-user-log');
    Route::get('/users/activities', [App\Http\Controllers\UserActivitiesController::class, 'activities'])->name('users.activities')->middleware('permission:view-user-activities');
    Route::post('/employees/{id}/restore', [EmployeeController::class, 'restore'])->name('employees.restore')->middleware('permission:restore-employee');
    Route::delete('/employees/{id}/force-delete', [EmployeeController::class, 'forceDelete'])->name('employees.force-delete')->middleware('permission:force-delete-employee');
    Route::resource('faculties', FacultyController::class)->middleware('permission:access-faculty');
    Route::post('/faculties/{id}/restore', [FacultyController::class, 'restore'])->name('faculties.restore')->middleware('permission:restore-faculty');
    Route::delete('/faculties/{id}/force-delete', [FacultyController::class, 'forceDelete'])->name('faculties.force-delete')->middleware('permission:force-delete-faculty');
    // Redirect all office routes to departments (offices are now managed through departments)
    Route::get('/offices', function () {
        return redirect()->route('departments.index', ['type' => 'administrative']);
    })->name('offices.index')->middleware('permission:access-office');
    
    Route::get('/offices/create', function () {
        return redirect()->route('departments.index', ['type' => 'administrative']);
    })->name('offices.create')->middleware('permission:create-office');
    
    Route::get('/offices/{office}', function ($office) {
        return redirect()->route('departments.show', $office);
    })->name('offices.show')->middleware('permission:view-office');
    
    Route::get('/offices/{office}/edit', function ($office) {
        return redirect()->route('departments.edit', $office);
    })->name('offices.edit')->middleware('permission:edit-office');
    Route::resource('departments', DepartmentController::class)->middleware('permission:access-department');
    Route::post('/departments/{id}/restore', [DepartmentController::class, 'restore'])->name('departments.restore')->middleware('permission:restore-department');
    Route::delete('/departments/{id}/force-delete', [DepartmentController::class, 'forceDelete'])->name('departments.force-delete')->middleware('permission:force-delete-department');
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
    Route::post('requests/{submission}/fulfill', [RequestSubmissionController::class, 'fulfill'])->name('requests.fulfill');
    Route::get('requests/{submission}/fulfillment/download', [RequestSubmissionController::class, 'downloadFulfillment'])->name('requests.fulfillment.download');
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

    // OAuth Client Management
    Route::get('oauth/clients', [App\Http\Controllers\OAuth\ClientController::class, 'index'])
        ->name('oauth.clients')
        ->middleware('permission:access-users-module');
    Route::post('oauth/clients', [App\Http\Controllers\OAuth\ClientController::class, 'store'])
        ->name('oauth.clients.store')
        ->middleware('permission:access-users-module');
    Route::get('oauth/clients/{id}/edit', [App\Http\Controllers\OAuth\ClientController::class, 'edit'])
        ->name('oauth.clients.edit')
        ->middleware('permission:access-users-module');
    Route::put('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'update'])
        ->name('oauth.clients.update')
        ->middleware('permission:access-users-module');
    Route::get('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'show'])
        ->name('oauth.clients.show')
        ->middleware('permission:access-users-module');
    Route::delete('oauth/clients/{id}', [App\Http\Controllers\OAuth\ClientController::class, 'destroy'])
        ->name('oauth.clients.destroy')
        ->middleware('permission:access-users-module');

    // Log Viewer Routes (Super Admin only)
    Route::get('admin/logs', [App\Http\Controllers\LogViewController::class, 'index'])
        ->name('admin.logs.view')
        ->middleware('role:Super Admin');
    Route::post('admin/logs/clear', [App\Http\Controllers\LogViewController::class, 'clear'])
        ->name('admin.logs.clear')
        ->middleware('role:Super Admin');
    Route::get('admin/logs/download', [App\Http\Controllers\LogViewController::class, 'download'])
        ->name('admin.logs.download')
        ->middleware('role:Super Admin');

});

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/oauth.php';
