<?php

use App\Http\Controllers\Api\DepartmentApiController;
use App\Http\Controllers\Api\EmployeeApiController;
use App\Http\Controllers\Api\FacultyApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are loaded by the RouteServiceProvider and are protected
| by authentication middleware. All routes require OAuth Bearer token.
|
*/

Route::middleware(['auth:api', 'throttle:60,1'])->group(function () {
    // Employee endpoints
    Route::get('/employees', [EmployeeApiController::class, 'index'])
        ->name('api.employees.index');
    
    Route::get('/employees/me', [EmployeeApiController::class, 'getCurrentEmployee'])
        ->name('api.employees.me');
    
    Route::get('/employees/{employee_id}', [EmployeeApiController::class, 'getEmployee'])
        ->name('api.employees.show')
        ->where('employee_id', '[A-Z0-9]+');
    
    // Department/Office endpoints
    Route::get('/departments', [DepartmentApiController::class, 'index'])
        ->name('api.departments.index');
    
    Route::get('/departments/{id}', [DepartmentApiController::class, 'show'])
        ->name('api.departments.show')
        ->where('id', '[0-9]+');
    
    // Faculty endpoints
    Route::get('/faculties', [FacultyApiController::class, 'index'])
        ->name('api.faculties.index');
    
    Route::get('/faculties/{id}', [FacultyApiController::class, 'show'])
        ->name('api.faculties.show')
        ->where('id', '[0-9]+');
});

