# HR System as IDP: Integrating Accounting & Payroll

## Architecture Overview

```
┌─────────────────────────────────────┐
│      Your HR System (The IDP)       │
│  - Employee Management              │
│  - Roles & Permissions              │
│  - Training                         │
│  - Leaves                           │
│  - Requests                         │
│                                     │
│  + OAuth 2.0 / OIDC Server         │
│  + User Authentication              │
└──────────────┬──────────────────────┘
               │
               │ OAuth Tokens
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────────┐      ┌─────▼──────┐
│ Accounting │      │  Payroll   │
│  System    │      │  System    │
│            │      │            │
│ Uses HR    │      │ Uses HR    │
│ for auth   │      │ for auth   │
└────────────┘      └────────────┘

Employee logs in ONCE to HR System
→ Can access Accounting & Payroll without re-login
```

## Implementation Plan

### Phase 1: Set Up Your HR System as IDP

#### Step 1: Install Laravel Passport

```bash
composer require laravel/passport
php artisan migrate
php artisan passport:install --uuids
```

This creates:
- `oauth_clients` table (for accounting/payroll apps)
- `oauth_access_tokens` table
- `oauth_refresh_tokens` table
- Encryption keys for signing tokens

#### Step 2: Configure Passport

Update `app/Models/User.php`:

```php
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ... existing code
}
```

Update `app/Providers/AppServiceProvider.php`:

```php
use Laravel\Passport\Passport;

public function boot(): void
{
    // Token expiration times
    Passport::tokensExpireIn(now()->addHours(1));
    Passport::refreshTokensExpireIn(now()->addDays(30));
    
    // Enable password grant (if needed for service-to-service)
    Passport::enablePasswordGrant();
    
    // Scopes for different systems
    Passport::tokensCan([
        'accounting' => 'Access accounting system',
        'payroll' => 'Access payroll system',
        'hr' => 'Access HR system',
    ]);
    
    // Default scope
    Passport::setDefaultScope(['hr']);
}
```

#### Step 3: Create OAuth Routes

Create `routes/oauth.php`:

```php
<?php

use App\Http\Controllers\OAuth\AuthorizationController;
use App\Http\Controllers\OAuth\UserInfoController;
use App\Http\Controllers\OAuth\OpenIdConfigurationController;
use App\Http\Controllers\OAuth\JwksController;
use Illuminate\Support\Facades\Route;

// OAuth 2.0 endpoints
Route::middleware(['web', 'auth'])->group(function () {
    // Authorization endpoint (user approves access)
    Route::get('/oauth/authorize', [AuthorizationController::class, 'authorize'])
        ->name('oauth.authorize');
    
    Route::post('/oauth/authorize', [AuthorizationController::class, 'approve'])
        ->name('oauth.approve');
    
    Route::delete('/oauth/authorize', [AuthorizationController::class, 'deny'])
        ->name('oauth.deny');
});

// Token endpoint (public, but requires client credentials)
Route::post('/oauth/token', [\Laravel\Passport\Http\Controllers\AccessTokenController::class, 'issueToken'])
    ->middleware('throttle');

// OpenID Connect endpoints
Route::get('/.well-known/openid-configuration', [OpenIdConfigurationController::class, '__invoke']);
Route::get('/.well-known/jwks.json', [JwksController::class, '__invoke']);

// UserInfo endpoint (protected by Bearer token)
Route::middleware(['auth:api'])->group(function () {
    Route::get('/oauth/userinfo', [UserInfoController::class, '__invoke']);
});
```

Add to `bootstrap/app.php`:

```php
Route::middleware('api')->group(base_path('routes/oauth.php'));
```

#### Step 4: Create OAuth Controllers

**Authorization Controller** (`app/Http/Controllers/OAuth/AuthorizationController.php`):

```php
<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Passport\ClientRepository;
use Laravel\Passport\Http\Controllers\AuthorizationController as PassportAuthorizationController;

class AuthorizationController extends Controller
{
    public function __construct(
        protected ClientRepository $clients
    ) {}

    public function authorize(Request $request)
    {
        // Get the client
        $client = $this->clients->find($request->client_id);
        
        if (!$client) {
            abort(404, 'Client not found');
        }

        // Check if user already approved this client
        $token = $request->user()->tokens()
            ->where('client_id', $client->id)
            ->where('revoked', false)
            ->first();

        // Show approval screen
        return inertia('OAuth/Authorize', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
            ],
            'scopes' => $request->scope ? explode(' ', $request->scope) : [],
            'request' => $request->only(['client_id', 'redirect_uri', 'response_type', 'scope', 'state']),
        ]);
    }

    public function approve(Request $request)
    {
        // Use Passport's built-in approval logic
        return app(PassportAuthorizationController::class)->approve($request);
    }

    public function deny(Request $request)
    {
        return app(PassportAuthorizationController::class)->deny($request);
    }
}
```

**UserInfo Controller** (`app/Http/Controllers/OAuth/UserInfoController.php`):

```php
<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserInfoController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Get user's employee data if exists
        $employee = $user->employee ?? null;
        
        // Base claims (OpenID Connect standard)
        $claims = [
            'sub' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => $user->hasVerifiedEmail(),
        ];
        
        // Add employee-specific claims if available
        if ($employee) {
            $claims['employee_id'] = (string) $employee->id;
            $claims['employee_number'] = $employee->employee_number ?? null;
            $claims['department'] = $employee->department->name ?? null;
            $claims['position'] = $employee->position->name ?? null;
        }
        
        // Add role/permission claims
        $claims['roles'] = $user->getRoleNames()->toArray();
        $claims['permissions'] = $user->getAllPermissions()->pluck('name')->toArray();
        
        return response()->json($claims);
    }
}
```

**OpenID Configuration Controller** (`app/Http/Controllers/OAuth/OpenIdConfigurationController.php`):

```php
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
```

**JWKS Controller** (`app/Http/Controllers/OAuth/JwksController.php`):

```php
<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

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
```

#### Step 5: Create Client Registration System

**Controller** (`app/Http/Controllers/OAuth/ClientController.php`):

```php
<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\ClientRepository;

class ClientController extends Controller
{
    public function __construct(
        protected ClientRepository $clients
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect' => 'required|url',
            'type' => 'required|in:accounting,payroll,other',
        ]);
        
        $client = $this->clients->create(
            $request->user()->id,
            $validated['name'],
            $validated['redirect'],
            null, // secret (will be generated)
            false, // personal access client
            false, // password client
            true   // authorization code grant
        );
        
        return response()->json([
            'client_id' => $client->id,
            'client_secret' => $client->secret,
            'redirect_uri' => $validated['redirect'],
            'type' => $validated['type'],
        ], 201);
    }

    public function index(Request $request)
    {
        $clients = $this->clients->forUser($request->user()->id);
        
        return inertia('OAuth/Clients', [
            'clients' => $clients->map(fn($client) => [
                'id' => $client->id,
                'name' => $client->name,
                'redirect' => $client->redirect,
                'created_at' => $client->created_at,
            ]),
        ]);
    }
}
```

**Route** (add to `routes/web.php`):

```php
Route::middleware(['auth'])->group(function () {
    Route::get('/oauth/clients', [\App\Http\Controllers\OAuth\ClientController::class, 'index'])
        ->name('oauth.clients');
    Route::post('/oauth/clients', [\App\Http\Controllers\OAuth\ClientController::class, 'store'])
        ->name('oauth.clients.store');
});
```

### Phase 2: Register Accounting & Payroll Systems

#### For Accounting System:

1. **Admin registers the accounting system:**
   - Go to `/oauth/clients`
   - Create new client:
     - Name: "Accounting System"
     - Redirect URI: `https://accounting.yourcompany.com/oauth/callback`
     - Type: "accounting"
   - Save the `client_id` and `client_secret`

2. **Accounting system configuration:**
   - Client ID: `[from registration]`
   - Client Secret: `[from registration]`
   - Authorization URL: `https://hr.yourcompany.com/oauth/authorize`
   - Token URL: `https://hr.yourcompany.com/oauth/token`
   - UserInfo URL: `https://hr.yourcompany.com/oauth/userinfo`
   - Scope: `openid profile email accounting`

#### For Payroll System:

Same process, but:
- Name: "Payroll System"
- Redirect URI: `https://payroll.yourcompany.com/oauth/callback`
- Type: "payroll"
- Scope: `openid profile email payroll`

### Phase 3: Integration Flow Example

#### Accounting System Integration (Example in PHP/Laravel):

```php
// In Accounting System

// Step 1: Redirect user to HR system for authorization
Route::get('/login', function () {
    $params = [
        'client_id' => config('oauth.client_id'),
        'redirect_uri' => config('oauth.redirect_uri'),
        'response_type' => 'code',
        'scope' => 'openid profile email accounting',
        'state' => Str::random(40), // CSRF protection
    ];
    
    $authUrl = config('oauth.authorization_url') . '?' . http_build_query($params);
    
    return redirect($authUrl);
});

// Step 2: Handle callback from HR system
Route::get('/oauth/callback', function (Request $request) {
    // Exchange authorization code for tokens
    $response = Http::asForm()->post(config('oauth.token_url'), [
        'grant_type' => 'authorization_code',
        'client_id' => config('oauth.client_id'),
        'client_secret' => config('oauth.client_secret'),
        'code' => $request->code,
        'redirect_uri' => config('oauth.redirect_uri'),
    ]);
    
    $tokens = $response->json();
    
    // Step 3: Get user info
    $userInfo = Http::withToken($tokens['access_token'])
        ->get(config('oauth.userinfo_url'))
        ->json();
    
    // Step 4: Create or update user session in accounting system
    $user = User::firstOrCreate(
        ['email' => $userInfo['email']],
        [
            'name' => $userInfo['name'],
            'hr_user_id' => $userInfo['sub'],
            'employee_id' => $userInfo['employee_id'] ?? null,
        ]
    );
    
    Auth::login($user);
    
    return redirect('/dashboard');
});
```

### Phase 4: Security Best Practices

1. **Use HTTPS everywhere** - Required for OAuth
2. **Validate state parameter** - Prevent CSRF attacks
3. **Store tokens securely** - Encrypt refresh tokens in database
4. **Implement token refresh** - Automatically refresh expired tokens
5. **Rate limiting** - Protect OAuth endpoints
6. **Scope validation** - Only grant requested scopes
7. **Audit logging** - Log all OAuth authorization events

### Phase 5: User Experience

#### Authorization Approval Screen

Create `resources/js/pages/OAuth/Authorize.tsx`:

```tsx
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthorizeProps {
    client: {
        id: string;
        name: string;
    };
    scopes: string[];
    request: {
        client_id: string;
        redirect_uri: string;
        response_type: string;
        scope: string;
        state: string;
    };
}

export default function Authorize({ client, scopes, request }: AuthorizeProps) {
    const { post, delete: destroy, processing } = useForm();

    const approve = () => {
        post('/oauth/authorize', {
            data: request,
        });
    };

    const deny = () => {
        destroy('/oauth/authorize', {
            data: request,
        });
    };

    return (
        <>
            <Head title="Authorize Application" />
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Authorize Application</CardTitle>
                        <CardDescription>
                            {client.name} wants to access your account
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium mb-2">This application will be able to:</p>
                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                {scopes.map((scope) => (
                                    <li key={scope}>
                                        {scope === 'openid' && 'Verify your identity'}
                                        {scope === 'profile' && 'Access your profile information'}
                                        {scope === 'email' && 'Access your email address'}
                                        {scope === 'accounting' && 'Access accounting system'}
                                        {scope === 'payroll' && 'Access payroll system'}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={approve} disabled={processing} className="flex-1">
                                Authorize
                            </Button>
                            <Button onClick={deny} variant="outline" disabled={processing} className="flex-1">
                                Deny
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
```

## Testing the Integration

### 1. Create Test Clients

```bash
php artisan tinker
```

```php
// Create accounting client
$accounting = \Laravel\Passport\Client::create([
    'user_id' => 1,
    'name' => 'Accounting System',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3001/oauth/callback',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);

// Create payroll client
$payroll = \Laravel\Passport\Client::create([
    'user_id' => 1,
    'name' => 'Payroll System',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3002/oauth/callback',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);
```

### 2. Test Authorization Flow

Visit:
```
http://your-hr-system.com/oauth/authorize?client_id=1&redirect_uri=http://localhost:3001/oauth/callback&response_type=code&scope=openid profile email accounting&state=test123
```

### 3. Test Token Exchange

```bash
curl -X POST http://your-hr-system.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=1&client_secret=YOUR_SECRET&code=AUTHORIZATION_CODE&redirect_uri=http://localhost:3001/oauth/callback"
```

## Benefits

✅ **Single Sign-On** - Employees log in once, access all systems
✅ **Centralized User Management** - All user data in HR system
✅ **Unified Permissions** - Roles/permissions from HR system
✅ **Better Security** - Centralized authentication
✅ **Easier Onboarding** - New employees automatically have access
✅ **Easier Offboarding** - Revoke access from one place

## Next Steps

1. Install and configure Laravel Passport
2. Create the OAuth controllers and routes
3. Build the authorization approval UI
4. Register accounting and payroll systems as clients
5. Provide integration documentation to accounting/payroll teams
6. Test the full flow
7. Deploy to production with HTTPS

