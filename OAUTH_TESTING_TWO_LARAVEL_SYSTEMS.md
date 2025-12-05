# Testing OAuth with Two Laravel Systems

**Your Setup:**
- **HR System (OAuth Provider)**: Port 8000
- **HIMS System (OAuth Client)**: Port 3001

---

## 📋 STEP 1: Make Sure HR System is Running

### In a NEW Terminal Window:

```powershell
cd C:\Users\arvin\laravel12-react-roles-permissions
php artisan serve --port=8000
```

**✅ You should see:**
```
INFO  Server running on [http://127.0.0.1:8000]
```

**Keep this terminal open!**

---

## 📋 STEP 2: Verify HIMS is Running

You already did this! ✅

**Your HIMS is running on:** `http://localhost:3001`

**Keep that terminal open too!**

---

## 📋 STEP 3: Register HIMS as OAuth Client in HR System

### 3.1 Login to HR System

1. **Open browser**
2. **Go to:** `http://localhost:8000/login`
3. **Login** with your credentials
4. **✅ You should see the dashboard**

### 3.2 Create OAuth Client

1. **Go to:** `http://localhost:8000/oauth/clients`
   - Type this in your browser address bar

2. **Click "Create Client" button**

3. **Fill in the form:**
   
   **Application Name:**
   ```
   HIMS System
   ```
   
   **Redirect URI:**
   ```
   http://localhost:3001/oauth/callback
   ```
   ⚠️ **IMPORTANT:** This must match exactly what you'll use in HIMS!
   
   **Application Type:**
   - Select: `other` or any option

4. **Click "Create"**

5. **⚠️ SAVE THESE VALUES (shown only once!):**
   - **Client ID**: `1` (or whatever number)
   - **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (long string)
   
   **Write them down or copy them!**

6. **✅ Verification:**
   - You see the new client in the list
   - You have Client ID and Secret saved

---

## 📋 STEP 4: Configure HIMS to Use OAuth

Now you need to add OAuth login functionality to your HIMS system.

### Option A: Add OAuth Callback Route in HIMS

You need to create a route in HIMS that handles the OAuth callback.

**In your HIMS project** (`C:\Users\arvin\HIMS`):

1. **Add route to `routes/web.php` or create `routes/oauth.php`:**

```php
<?php

use Illuminate\Support\Facades\Route;

// OAuth callback route
Route::get('/oauth/callback', function (Request $request) {
    $code = $request->get('code');
    $state = $request->get('state');
    
    if (!$code) {
        return redirect('/login')->with('error', 'Authorization failed');
    }
    
    // Exchange code for token
    $response = Http::asForm()->post('http://localhost:8000/oauth/token', [
        'grant_type' => 'authorization_code',
        'client_id' => env('OAUTH_CLIENT_ID'),
        'client_secret' => env('OAUTH_CLIENT_SECRET'),
        'code' => $code,
        'redirect_uri' => 'http://localhost:3001/oauth/callback',
    ]);
    
    if (!$response->successful()) {
        return redirect('/login')->with('error', 'Token exchange failed');
    }
    
    $tokenData = $response->json();
    $accessToken = $tokenData['access_token'];
    
    // Get user info
    $userResponse = Http::withToken($accessToken)
        ->get('http://localhost:8000/oauth/userinfo');
    
    if (!$userResponse->successful()) {
        return redirect('/login')->with('error', 'Failed to get user info');
    }
    
    $userInfo = $userResponse->json();
    
    // Find or create user in HIMS
    $user = \App\Models\User::firstOrCreate(
        ['email' => $userInfo['email']],
        [
            'name' => $userInfo['name'],
            'email' => $userInfo['email'],
            'password' => bcrypt(Str::random(32)), // Random password since OAuth
        ]
    );
    
    // Login the user
    Auth::login($user);
    
    return redirect('/dashboard');
})->name('oauth.callback');
```

2. **Add to `.env` file in HIMS:**

```env
OAUTH_CLIENT_ID=1
OAUTH_CLIENT_SECRET=your_client_secret_here
OAUTH_PROVIDER_URL=http://localhost:8000
```

Replace `your_client_secret_here` with the Client Secret from Step 3.2

3. **Add "Login with HR System" button to your login page**

**In your HIMS login page** (probably `resources/js/pages/auth/login.tsx` or similar):

Add a button:

```tsx
<button
    onClick={() => {
        const params = new URLSearchParams({
            client_id: import.meta.env.VITE_OAUTH_CLIENT_ID || '1',
            redirect_uri: 'http://localhost:3001/oauth/callback',
            response_type: 'code',
            scope: 'openid profile email',
            state: Math.random().toString(36).substring(7),
        });
        window.location.href = `http://localhost:8000/oauth/authorize?${params}`;
    }}
    className="..."
>
    Sign in with HR System
</button>
```

4. **Add to HIMS `.env`:**

```env
VITE_OAUTH_CLIENT_ID=1
```

---

## 📋 STEP 5: Test the OAuth Flow

### 5.1 Test the Flow

1. **Go to HIMS login page:**
   ```
   http://localhost:3001/login
   ```

2. **Click "Sign in with HR System" button**

3. **What should happen:**
   - You're redirected to: `http://localhost:8000/oauth/authorize?...`
   - If not logged in, you see login page
   - After login, you see authorization approval screen
   - Click "Authorize"

4. **After authorization:**
   - You're redirected back to: `http://localhost:3001/oauth/callback?code=...&state=...`
   - HIMS exchanges code for token
   - HIMS gets user info
   - HIMS logs you in
   - You're redirected to HIMS dashboard

5. **✅ Verification:**
   - You're logged into HIMS
   - Your user info matches your HR system account

---

## 🔧 Quick Implementation Guide

### Minimal OAuth Controller for HIMS

**Create:** `app/Http/Controllers/Auth/OAuthController.php`

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class OAuthController extends Controller
{
    public function redirect()
    {
        $state = Str::random(40);
        session(['oauth_state' => $state]);
        
        $params = [
            'client_id' => config('services.oauth.client_id'),
            'redirect_uri' => config('services.oauth.redirect_uri'),
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'state' => $state,
        ];
        
        $url = config('services.oauth.provider_url') . '/oauth/authorize?' . http_build_query($params);
        
        return redirect($url);
    }
    
    public function callback(Request $request)
    {
        // Verify state
        if ($request->get('state') !== session('oauth_state')) {
            return redirect('/login')->with('error', 'Invalid state parameter');
        }
        
        // Exchange code for token
        $response = Http::asForm()->post(config('services.oauth.provider_url') . '/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => config('services.oauth.client_id'),
            'client_secret' => config('services.oauth.client_secret'),
            'code' => $request->get('code'),
            'redirect_uri' => config('services.oauth.redirect_uri'),
        ]);
        
        if (!$response->successful()) {
            return redirect('/login')->with('error', 'Failed to get access token');
        }
        
        $tokenData = $response->json();
        
        // Get user info
        $userResponse = Http::withToken($tokenData['access_token'])
            ->get(config('services.oauth.provider_url') . '/oauth/userinfo');
        
        if (!$userResponse->successful()) {
            return redirect('/login')->with('error', 'Failed to get user info');
        }
        
        $userInfo = $userResponse->json();
        
        // Find or create user
        $user = \App\Models\User::firstOrCreate(
            ['email' => $userInfo['email']],
            [
                'name' => $userInfo['name'],
                'password' => bcrypt(Str::random(32)),
            ]
        );
        
        // Login
        Auth::login($user);
        
        return redirect('/dashboard');
    }
}
```

**Add to `config/services.php` in HIMS:**

```php
'oauth' => [
    'provider_url' => env('OAUTH_PROVIDER_URL', 'http://localhost:8000'),
    'client_id' => env('OAUTH_CLIENT_ID'),
    'client_secret' => env('OAUTH_CLIENT_SECRET'),
    'redirect_uri' => env('OAUTH_REDIRECT_URI', 'http://localhost:3001/oauth/callback'),
],
```

**Add routes in HIMS `routes/web.php`:**

```php
Route::get('/oauth/redirect', [App\Http\Controllers\Auth\OAuthController::class, 'redirect'])
    ->name('oauth.redirect');

Route::get('/oauth/callback', [App\Http\Controllers\Auth\OAuthController::class, 'callback'])
    ->name('oauth.callback');
```

**Add to HIMS `.env`:**

```env
OAUTH_PROVIDER_URL=http://localhost:8000
OAUTH_CLIENT_ID=1
OAUTH_CLIENT_SECRET=your_secret_here
OAUTH_REDIRECT_URI=http://localhost:3001/oauth/callback
```

**Add button to login page:**

```tsx
<a href={route('oauth.redirect')} className="...">
    Sign in with HR System
</a>
```

---

## ✅ Checklist

- [ ] HR system running on port 8000
- [ ] HIMS system running on port 3001
- [ ] OAuth client created in HR system
- [ ] Client ID and Secret saved
- [ ] OAuth routes added to HIMS
- [ ] OAuth controller created in HIMS
- [ ] Environment variables configured in HIMS
- [ ] "Sign in with HR System" button added to HIMS login page
- [ ] Can complete OAuth flow
- [ ] User is logged into HIMS after OAuth

---

## 🐛 Troubleshooting

### "Invalid redirect URI"
- Make sure the Redirect URI in HR system matches exactly: `http://localhost:3001/oauth/callback`
- Check for trailing slashes, http vs https, port numbers

### "Client not found"
- Verify Client ID in HIMS `.env` matches the one in HR system

### "Invalid authorization code"
- Codes expire quickly and can only be used once
- Try the flow again

### CORS errors
- For localhost, this shouldn't be an issue
- If you see CORS errors, check `config/cors.php` in HR system

---

## 🎉 Success!

If you can click "Sign in with HR System" in HIMS and get logged in, it's working! 🎉

