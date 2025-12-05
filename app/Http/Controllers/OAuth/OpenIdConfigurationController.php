<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class OpenIdConfigurationController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $baseUrl = config('app.url');
        
        return response()->json([
            'issuer' => $baseUrl,
            'authorization_endpoint' => $baseUrl . '/oauth/authorize',
            'token_endpoint' => $baseUrl . '/oauth/token',
            'userinfo_endpoint' => $baseUrl . '/oauth/userinfo',
            'jwks_uri' => $baseUrl . '/.well-known/jwks.json',
            'response_types_supported' => ['code'],
            'subject_types_supported' => ['public'],
            'id_token_signing_alg_values_supported' => ['RS256'],
            'scopes_supported' => ['openid', 'profile', 'email', 'accounting', 'payroll', 'hr'],
            'token_endpoint_auth_methods_supported' => ['client_secret_basic', 'client_secret_post'],
            'grant_types_supported' => ['authorization_code', 'refresh_token'],
        ]);
    }
}

