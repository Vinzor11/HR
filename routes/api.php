<?php

use App\Http\Controllers\Api\EmployeeApiController;
use App\Http\Controllers\Api\ResearchApiController;
use App\Http\Controllers\Api\SectorApiController;
use App\Http\Controllers\Api\UnitApiController;
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
    
    // Sector endpoints (new org structure)
    Route::get('/sectors', [SectorApiController::class, 'index'])
        ->name('api.sectors.index');
    
    Route::get('/sectors/{id}', [SectorApiController::class, 'show'])
        ->name('api.sectors.show')
        ->where('id', '[0-9]+');
    
    // Unit endpoints (new org structure - replaces departments/offices/faculties)
    Route::get('/units', [UnitApiController::class, 'index'])
        ->name('api.units.index');
    
    Route::get('/units/{id}', [UnitApiController::class, 'show'])
        ->name('api.units.show')
        ->where('id', '[0-9]+');

    // Research Office API - Admin endpoints (no role check; access controlled by OAuth client)
    Route::prefix('research')->group(function () {
        Route::get('/coordinators', [ResearchApiController::class, 'coordinators'])
            ->name('api.research.coordinators');
    });

    Route::get('/designations', [ResearchApiController::class, 'designations'])
        ->name('api.designations.index');

    // Research Office API - Coordinator endpoint (must be Research Coordinator via SSO)
    Route::get('/research/unit-employees', [ResearchApiController::class, 'unitEmployees'])
        ->middleware('research.coordinator')
        ->name('api.research.unit-employees');
});
