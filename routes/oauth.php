<?php

use App\Http\Controllers\OAuth\UserInfoController;
use App\Http\Controllers\OAuth\OpenIdConfigurationController;
use App\Http\Controllers\OAuth\JwksController;
use App\Http\Controllers\OAuth\EndSessionController;
use Laravel\Passport\Http\Controllers\AuthorizationController as PassportAuthorizationController;
use Laravel\Passport\Http\Controllers\ApproveAuthorizationController as PassportApproveAuthorizationController;
use Laravel\Passport\Http\Controllers\DenyAuthorizationController as PassportDenyAuthorizationController;
use App\Http\Middleware\LogOAuthAuthorization;
use Illuminate\Support\Facades\Route;

// OpenID Connect discovery endpoints (public)
Route::get('.well-known/openid-configuration', [OpenIdConfigurationController::class, '__invoke']);
Route::get('.well-known/jwks.json', [JwksController::class, '__invoke']);

// OAuth 2.0 authorization endpoint (requires authentication)
Route::middleware(['web', 'auth', LogOAuthAuthorization::class])->group(function () {
    Route::get('oauth/authorize', [PassportAuthorizationController::class, 'authorize'])
        ->name('oauth.authorize');
    
    Route::post('oauth/authorize', [PassportApproveAuthorizationController::class, 'approve'])
        ->name('oauth.approve');
    
    Route::delete('oauth/authorize', [PassportDenyAuthorizationController::class, 'deny'])
        ->name('oauth.deny');
});

// Token endpoint (public, but requires client credentials)
Route::post('oauth/token', [\Laravel\Passport\Http\Controllers\AccessTokenController::class, 'issueToken'])
    ->middleware('throttle');

// UserInfo endpoint (protected by Bearer token)
Route::middleware(['auth:api'])->group(function () {
    Route::get('oauth/userinfo', [UserInfoController::class, '__invoke']);
});

// End session endpoint (OpenID Connect RP-initiated logout)
Route::get('oauth/end-session', [EndSessionController::class, 'endSession'])
    ->name('oauth.end-session');

// Back-channel logout endpoint (optional)
Route::post('oauth/back-channel-logout', [EndSessionController::class, 'backChannelLogout'])
    ->name('oauth.back-channel-logout');

