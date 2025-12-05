<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class JwksController extends Controller
{
    public function __invoke(): JsonResponse
    {
        // Get the public key
        $publicKeyPath = storage_path('oauth-public.key');
        
        if (!file_exists($publicKeyPath)) {
            abort(500, 'OAuth public key not found. Run: php artisan passport:keys');
        }
        
        $publicKey = openssl_pkey_get_public(file_get_contents($publicKeyPath));
        $details = openssl_pkey_get_details($publicKey);
        
        // Convert to JWK format (RFC 7517)
        $jwk = [
            'kty' => 'RSA',
            'use' => 'sig',
            'kid' => '1',
            'n' => rtrim(str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($details['rsa']['n'])), '='),
            'e' => rtrim(str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($details['rsa']['e'])), '='),
        ];
        
        return response()->json([
            'keys' => [$jwk]
        ]);
    }
}

