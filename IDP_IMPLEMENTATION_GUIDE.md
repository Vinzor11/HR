# How to Become an Identity Provider (IDP) - Implementation Guide

## Overview

To become an Identity Provider like Google, you need to implement **OAuth 2.0** and **OpenID Connect (OIDC)** protocols. This allows other websites (called "Relying Parties" or "Clients") to authenticate users through your system.

## Key Concepts

### 1. **OAuth 2.0**
- Authorization framework that allows third-party applications to obtain limited access to user accounts
- Uses access tokens to grant permissions
- Four main roles:
  - **Resource Owner**: The user
  - **Client**: The third-party application wanting access
  - **Authorization Server**: Your application (the IDP)
  - **Resource Server**: Your application (where user data lives)

### 2. **OpenID Connect (OIDC)**
- Built on top of OAuth 2.0
- Adds authentication layer (not just authorization)
- Provides identity information via ID tokens
- Standard endpoints:
  - `/oauth/authorize` - Authorization endpoint
  - `/oauth/token` - Token endpoint
  - `/oauth/userinfo` - User info endpoint
  - `/.well-known/openid-configuration` - Discovery endpoint

## Implementation Steps

### Step 1: Install Laravel Passport

Laravel Passport provides a full OAuth2 server implementation:

```bash
composer require laravel/passport
php artisan migrate
php artisan passport:install
```

### Step 2: Configure Passport

Update your `User` model to use `HasApiTokens`:

```php
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

In `AppServiceProvider`:

```php
use Laravel\Passport\Passport;

public function boot(): void
{
    Passport::tokensExpireIn(now()->addDays(15));
    Passport::refreshTokensExpireIn(now()->addDays(30));
    Passport::personalAccessTokensExpireIn(now()->addMonths(6));
}
```

### Step 3: Set Up Routes

Add to `routes/api.php`:

```php
use Laravel\Passport\Http\Controllers\AccessTokenController;
use Laravel\Passport\Http\Controllers\AuthorizationController;
use Laravel\Passport\Http\Controllers\TransientTokenController;

Route::post('/oauth/token', [AccessTokenController::class, 'issueToken']);
Route::get('/oauth/authorize', [AuthorizationController::class, 'authorize']);
Route::post('/oauth/authorize', [AuthorizationController::class, 'approve']);
Route::delete('/oauth/authorize', [AuthorizationController::class, 'deny']);
Route::get('/oauth/tokens', [AuthorizedAccessTokenController::class, 'forUser']);
Route::delete('/oauth/tokens/{token_id}', [AuthorizedAccessTokenController::class, 'destroy']);
```

### Step 4: Implement OpenID Connect Endpoints

Create controllers for OIDC-specific endpoints:

#### UserInfo Endpoint (`/oauth/userinfo`)

```php
namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserInfoController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        
        return response()->json([
            'sub' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
            // Add other claims as needed
        ]);
    }
}
```

#### Discovery Endpoint (`/.well-known/openid-configuration`)

```php
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
            'response_types_supported' => ['code', 'token', 'id_token'],
            'subject_types_supported' => ['public'],
            'id_token_signing_alg_values_supported' => ['RS256'],
            'scopes_supported' => ['openid', 'profile', 'email'],
        ]);
    }
}
```

#### JWKS Endpoint (`/.well-known/jwks.json`)

```php
namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\ClientRepository;

class JwksController extends Controller
{
    public function __invoke(ClientRepository $clients): JsonResponse
    {
        $key = \Storage::disk('local')->get('oauth-private.key');
        $publicKey = openssl_pkey_get_public($key);
        $details = openssl_pkey_get_details($publicKey);
        
        // Convert to JWK format
        $jwk = [
            'kty' => 'RSA',
            'use' => 'sig',
            'kid' => '1',
            'n' => base64_encode($details['rsa']['n']),
            'e' => base64_encode($details['rsa']['e']),
        ];
        
        return response()->json([
            'keys' => [$jwk]
        ]);
    }
}
```

### Step 5: Client Registration

Allow third-party applications to register as OAuth clients:

```php
namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Passport\ClientRepository;

class ClientRegistrationController extends Controller
{
    public function store(Request $request, ClientRepository $clients): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect' => 'required|url',
        ]);
        
        $client = $clients->create(
            $request->user()->id,
            $validated['name'],
            $validated['redirect'],
            null, // secret (null for public clients)
            false, // personal access client
            false, // password client
            true   // authorization code grant
        );
        
        return response()->json([
            'client_id' => $client->id,
            'client_secret' => $client->secret,
            'redirect_uri' => $validated['redirect'],
        ], 201);
    }
}
```

### Step 6: Authorization Flow

The typical OAuth 2.0 Authorization Code flow:

1. **Client redirects user to**: `/oauth/authorize?client_id=xxx&redirect_uri=xxx&response_type=code&scope=openid profile email&state=xxx`

2. **User authenticates** (if not already logged in)

3. **User approves/denies** the authorization request

4. **Redirect back to client** with authorization code: `redirect_uri?code=xxx&state=xxx`

5. **Client exchanges code for tokens**: `POST /oauth/token` with `grant_type=authorization_code`

6. **Client uses access token** to call `/oauth/userinfo`

## Security Considerations

1. **HTTPS Required**: All OAuth endpoints must use HTTPS in production
2. **PKCE (Proof Key for Code Exchange)**: Implement for mobile/public clients
3. **State Parameter**: Always validate to prevent CSRF attacks
4. **Token Expiration**: Set appropriate expiration times
5. **Scope Validation**: Validate requested scopes
6. **Rate Limiting**: Protect endpoints from abuse
7. **Client Authentication**: Verify client credentials

## Testing Your IDP

### 1. Register a Test Client

```php
php artisan tinker
$client = \Laravel\Passport\Client::create([
    'user_id' => 1,
    'name' => 'Test Client',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3000/callback',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);
```

### 2. Test Authorization Flow

Visit: `http://your-app.com/oauth/authorize?client_id=1&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid profile email`

### 3. Exchange Code for Token

```bash
curl -X POST http://your-app.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "client_id": "1",
    "client_secret": "your-secret",
    "code": "authorization-code",
    "redirect_uri": "http://localhost:3000/callback"
  }'
```

## Additional Features

### 1. **Consent Screen**
Customize the authorization approval page to match your branding

### 2. **Token Revocation**
Allow users to revoke access from their account settings

### 3. **Refresh Tokens**
Implement refresh token rotation for better security

### 4. **Device Flow**
For devices without browsers (OAuth 2.0 Device Authorization Grant)

### 5. **Admin Dashboard**
Build an admin interface for managing OAuth clients

## Documentation for Clients

Provide documentation for developers wanting to integrate:

- Authorization endpoint URL
- Token endpoint URL
- UserInfo endpoint URL
- Supported scopes
- Client registration process
- Example code snippets
- Security best practices

## Compliance

Consider implementing:
- **GDPR compliance**: User data handling, consent management
- **SOC 2**: Security controls and audits
- **OIDC Certification**: Test with OpenID Foundation's certification

## Next Steps

1. Install Laravel Passport
2. Implement the endpoints above
3. Create a consent/approval UI
4. Set up client registration system
5. Write integration documentation
6. Test with sample client applications
7. Deploy with HTTPS
8. Consider security audits

