# Two-Factor Authentication Integration Guide for Laravel

This guide will help you integrate two-factor authentication (2FA) into your Laravel application, following the same implementation used in HIMS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [User Model Configuration](#user-model-configuration)
5. [Fortify Configuration](#fortify-configuration)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [API Integration](#api-integration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Laravel 10+ or Laravel 11+
- PHP 8.2+
- Composer
- A database (MySQL, PostgreSQL, SQLite, etc.)

---

## Installation

### Step 1: Install Laravel Fortify

```bash
composer require laravel/fortify
```

### Step 2: Publish Fortify Resources

```bash
php artisan vendor:publish --provider="Laravel\Fortify\FortifyServiceProvider"
```

This will create:
- `config/fortify.php` - Fortify configuration file
- `app/Actions/Fortify/` - Action classes directory

### Step 3: Register Fortify Service Provider

In `bootstrap/providers.php` (Laravel 11) or `config/app.php` (Laravel 10), add:

```php
return [
    App\Providers\AppServiceProvider::class,
    Laravel\Fortify\FortifyServiceProvider::class,
];
```

---

## Database Setup

### Step 1: Create Migration

Create a migration to add 2FA columns to your users table:

```bash
php artisan make:migration add_two_factor_columns_to_users_table
```

### Step 2: Migration Content

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->after('password')->nullable();
            $table->text('two_factor_recovery_codes')->after('two_factor_secret')->nullable();
            $table->timestamp('two_factor_confirmed_at')->after('two_factor_recovery_codes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ]);
        });
    }
};
```

### Step 3: Run Migration

```bash
php artisan migrate
```

---

## User Model Configuration

### Step 1: Update User Model

Update your `app/Models/User.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
```

**Key Points:**
- Add `TwoFactorAuthenticatable` trait
- Hide `two_factor_secret` and `two_factor_recovery_codes` in `$hidden`
- Cast `two_factor_confirmed_at` as datetime

---

## Fortify Configuration

### Step 1: Enable 2FA Feature

Update `config/fortify.php`:

```php
<?php

use Laravel\Fortify\Features;

return [
    // ... other configuration ...

    'features' => [
        Features::registration(),
        Features::resetPasswords(),
        Features::emailVerification(),
        Features::twoFactorAuthentication([
            'confirm' => true,              // Require confirmation before enabling
            'confirmPassword' => true,      // Require password confirmation
            // 'window' => 0,               // Time window for OTP (optional)
        ]),
    ],

    'limiters' => [
        'login' => 'login',
        'two-factor' => 'two-factor',       // Rate limiting for 2FA
    ],
];
```

### Step 2: Configure Rate Limiting

In `app/Providers/FortifyServiceProvider.php` (or create it):

```php
<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });
    }
}
```

---

## Backend Implementation

### Step 1: Create 2FA Settings Controller

```bash
php artisan make:controller Settings/TwoFactorAuthenticationController
```

```php
<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Laravel\Fortify\Features;

class TwoFactorAuthenticationController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return Features::optionEnabled(Features::twoFactorAuthentication(), 'confirmPassword')
            ? [new Middleware('password.confirm', only: ['show'])]
            : [];
    }

    public function show(Request $request)
    {
        return response()->json([
            'twoFactorEnabled' => $request->user()->hasEnabledTwoFactorAuthentication(),
            'requiresConfirmation' => Features::optionEnabled(
                Features::twoFactorAuthentication(),
                'confirm'
            ),
        ]);
    }
}
```

### Step 2: Add Routes

In `routes/web.php` or `routes/api.php`:

```php
use App\Http\Controllers\Settings\TwoFactorAuthenticationController;

Route::middleware(['auth'])->group(function () {
    Route::get('/settings/two-factor', [TwoFactorAuthenticationController::class, 'show'])
        ->name('two-factor.show');
});
```

### Step 3: Fortify Routes (Automatic)

Laravel Fortify automatically registers these routes:

- `POST /user/two-factor-authentication` - Enable 2FA
- `DELETE /user/two-factor-authentication` - Disable 2FA
- `GET /user/two-factor-qr-code` - Get QR code for setup
- `GET /user/two-factor-secret-key` - Get secret key
- `GET /user/two-factor-recovery-codes` - Get recovery codes
- `POST /user/two-factor-recovery-codes` - Regenerate recovery codes
- `POST /two-factor-challenge` - Verify 2FA code during login

---

## Frontend Implementation

### Step 1: Install QR Code Library (Optional)

For generating QR codes on the frontend:

```bash
npm install qrcode
# or
yarn add qrcode
```

### Step 2: Create 2FA Setup Component

Example using React/Inertia:

```tsx
// resources/js/pages/settings/two-factor.tsx
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TwoFactorProps {
    twoFactorEnabled: boolean;
    qrCode?: string;
    secretKey?: string;
    recoveryCodes?: string[];
}

export default function TwoFactorSettings({ 
    twoFactorEnabled: initialEnabled,
    qrCode: initialQrCode,
    secretKey: initialSecretKey,
    recoveryCodes: initialRecoveryCodes 
}: TwoFactorProps) {
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(initialEnabled);
    const [qrCode, setQrCode] = useState(initialQrCode);
    const [secretKey, setSecretKey] = useState(initialSecretKey);
    const [recoveryCodes, setRecoveryCodes] = useState(initialRecoveryCodes);
    const [verificationCode, setVerificationCode] = useState('');
    const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

    const enableTwoFactor = () => {
        router.post('/user/two-factor-authentication', {}, {
            onSuccess: (page) => {
                // Fetch QR code and secret
                fetch('/user/two-factor-qr-code')
                    .then(res => res.json())
                    .then(data => {
                        setQrCode(data.svg);
                        setSecretKey(data.secretKey);
                    });
                
                // Fetch recovery codes
                fetch('/user/two-factor-recovery-codes')
                    .then(res => res.json())
                    .then(data => {
                        setRecoveryCodes(data);
                        setShowRecoveryCodes(true);
                    });
            }
        });
    };

    const confirmTwoFactor = () => {
        router.post('/user/confirmed-two-factor-authentication', {
            code: verificationCode
        }, {
            onSuccess: () => {
                setTwoFactorEnabled(true);
                setVerificationCode('');
            }
        });
    };

    const disableTwoFactor = () => {
        router.delete('/user/two-factor-authentication', {
            onSuccess: () => {
                setTwoFactorEnabled(false);
                setQrCode(undefined);
                setSecretKey(undefined);
                setRecoveryCodes(undefined);
            }
        });
    };

    const regenerateRecoveryCodes = () => {
        router.post('/user/two-factor-recovery-codes', {}, {
            onSuccess: (page) => {
                setRecoveryCodes(page.props.recoveryCodes);
            }
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
                <p className="text-muted-foreground">
                    Add an additional layer of security to your account
                </p>
            </div>

            {!twoFactorEnabled ? (
                <div className="space-y-4">
                    <p>Two-factor authentication is not enabled.</p>
                    <Button onClick={enableTwoFactor}>Enable Two-Factor Authentication</Button>
                    
                    {qrCode && (
                        <div className="space-y-4">
                            <div>
                                <p>Scan this QR code with your authenticator app:</p>
                                <div dangerouslySetInnerHTML={{ __html: qrCode }} />
                            </div>
                            
                            <div>
                                <p>Or enter this secret key manually:</p>
                                <code className="block p-2 bg-gray-100 rounded">
                                    {secretKey}
                                </code>
                            </div>

                            <div>
                                <Input
                                    type="text"
                                    placeholder="Enter verification code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                />
                                <Button onClick={confirmTwoFactor} className="mt-2">
                                    Confirm
                                </Button>
                            </div>

                            {showRecoveryCodes && recoveryCodes && (
                                <div className="space-y-2">
                                    <p className="font-semibold">Recovery Codes (save these!):</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        {recoveryCodes.map((code, index) => (
                                            <li key={index} className="font-mono">{code}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-green-600">Two-factor authentication is enabled.</p>
                    
                    <div className="space-y-2">
                        <Button variant="outline" onClick={regenerateRecoveryCodes}>
                            Regenerate Recovery Codes
                        </Button>
                        <Button variant="destructive" onClick={disableTwoFactor}>
                            Disable Two-Factor Authentication
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
```

### Step 3: Create 2FA Challenge Page (Login)

```tsx
// resources/js/pages/auth/two-factor-challenge.tsx
import { Form, Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function TwoFactorChallenge() {
    return (
        <>
            <Head title="Two-Factor Authentication" />
            
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
                    <p className="text-muted-foreground">
                        Please confirm access to your account by entering the authentication code
                    </p>
                </div>

                <Form
                    method="post"
                    action="/two-factor-challenge"
                    className="space-y-4"
                >
                    <div>
                        <Label htmlFor="code">Authentication Code</Label>
                        <Input
                            id="code"
                            name="code"
                            type="text"
                            inputMode="numeric"
                            autoFocus
                            required
                            placeholder="000000"
                        />
                    </div>

                    <div>
                        <Label htmlFor="recovery_code">Or use a recovery code</Label>
                        <Input
                            id="recovery_code"
                            name="recovery_code"
                            type="text"
                            placeholder="Recovery code"
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        Verify
                    </Button>
                </Form>
            </div>
        </>
    );
}
```

---

## API Integration

### Step 1: Enable 2FA via API

```php
// In your API controller
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

public function enableTwoFactor(Request $request)
{
    $user = $request->user();
    
    // Enable 2FA
    $user->forceFill([
        'two_factor_secret' => encrypt($user->twoFactorSecret()),
        'two_factor_recovery_codes' => encrypt(
            json_encode($user->recoveryCodes())
        ),
    ])->save();
    
    return response()->json([
        'qr_code' => $user->twoFactorQrCodeSvg(),
        'secret_key' => decrypt($user->two_factor_secret),
        'recovery_codes' => json_decode(decrypt($user->two_factor_recovery_codes)),
    ]);
}
```

### Step 2: Verify 2FA Code

```php
use PragmaRX\Google2FA\Google2FA;

public function verifyTwoFactor(Request $request)
{
    $request->validate([
        'code' => 'required|string|size:6',
    ]);
    
    $user = $request->user();
    $google2fa = new Google2FA();
    
    $valid = $google2fa->verifyKey(
        decrypt($user->two_factor_secret),
        $request->code
    );
    
    if ($valid) {
        $user->forceFill([
            'two_factor_confirmed_at' => now(),
        ])->save();
        
        return response()->json(['message' => '2FA enabled successfully']);
    }
    
    return response()->json(['error' => 'Invalid code'], 422);
}
```

### Step 3: Challenge During Login

```php
use Laravel\Fortify\TwoFactorAuthenticatable;

public function challenge(Request $request)
{
    $request->validate([
        'code' => 'required_without:recovery_code|string|size:6',
        'recovery_code' => 'required_without:code|string',
    ]);
    
    $user = $request->user();
    
    if ($request->has('code')) {
        // Verify OTP code
        if ($user->confirmTwoFactorAuthentication($request->code)) {
            return response()->json(['message' => 'Verified']);
        }
    } elseif ($request->has('recovery_code')) {
        // Verify recovery code
        if ($user->recoveryCodes()->contains($request->recovery_code)) {
            $user->recoveryCodes()->remove($request->recovery_code);
            return response()->json(['message' => 'Verified']);
        }
    }
    
    return response()->json(['error' => 'Invalid code'], 422);
}
```

---

## Testing

### Step 1: Create Test

```bash
php artisan make:test TwoFactorAuthenticationTest
```

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class TwoFactorAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_enable_two_factor_authentication()
    {
        if (!Features::canManageTwoFactorAuthentication()) {
            $this->markTestSkipped('2FA is not enabled.');
        }

        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/user/two-factor-authentication');

        $response->assertStatus(200);
        $this->assertNotNull($user->fresh()->two_factor_secret);
    }

    public function test_user_can_disable_two_factor_authentication()
    {
        if (!Features::canManageTwoFactorAuthentication()) {
            $this->markTestSkipped('2FA is not enabled.');
        }

        $user = User::factory()->create();
        $user->forceFill([
            'two_factor_secret' => encrypt('secret'),
            'two_factor_confirmed_at' => now(),
        ])->save();

        $response = $this->actingAs($user)
            ->deleteJson('/user/two-factor-authentication');

        $response->assertStatus(200);
        $this->assertNull($user->fresh()->two_factor_secret);
    }
}
```

---

## Troubleshooting

### Issue: QR Code Not Displaying

**Solution:** Ensure the `two_factor_secret` is properly encrypted and the QR code endpoint is accessible.

### Issue: Invalid Code Errors

**Solution:** 
- Check time synchronization between server and authenticator app
- Verify the code is 6 digits
- Check if the secret key matches

### Issue: Recovery Codes Not Working

**Solution:** Ensure recovery codes are properly encrypted/decrypted and stored correctly.

### Issue: 2FA Not Triggering on Login

**Solution:** 
- Verify `hasEnabledTwoFactorAuthentication()` returns true
- Check Fortify middleware is applied
- Ensure `two_factor_confirmed_at` is set

---

## Security Best Practices

1. **Always encrypt secrets** - Never store 2FA secrets in plain text
2. **Rate limiting** - Implement rate limiting on 2FA endpoints
3. **Recovery codes** - Store recovery codes securely and allow regeneration
4. **Session management** - Clear sessions on 2FA failure
5. **Logging** - Log 2FA attempts for security monitoring

---

## Additional Resources

- [Laravel Fortify Documentation](https://laravel.com/docs/fortify)
- [Google Authenticator](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)
- [Authy](https://authy.com/)

---

## Support

For issues or questions, refer to:
- Laravel Fortify GitHub: https://github.com/laravel/fortify
- Laravel Documentation: https://laravel.com/docs

