# OAuth/IDP Testing Guide - Local Development

## ✅ You Can Test Locally!

**No deployment needed!** You can test the entire OAuth flow on your local machine. Here's how:

## 🚀 Quick Start Testing

### Step 1: Start Your Application

Make sure your Laravel app is running:

```bash
php artisan serve
# Or use your dev script
composer run dev
```

Your app should be accessible at: `http://localhost:8000` (or your configured port)

### Step 2: Create a Test OAuth Client

#### Option A: Using the UI (Recommended)

1. **Login to your HR system**: `http://localhost:8000/login`
2. **Navigate to OAuth Clients**: `http://localhost:8000/oauth/clients`
   - You need the `access-users-module` permission
3. **Click "Create Client"**
4. **Fill in the form**:
   - **Name**: "Test Accounting System"
   - **Redirect URI**: `http://localhost:3001/oauth/callback` (or any URL you want)
   - **Type**: "Accounting System"
5. **Save the Client ID and Client Secret** (shown only once!)

#### Option B: Using Tinker (Command Line)

```bash
php artisan tinker
```

```php
$client = \Laravel\Passport\Client::create([
    'user_id' => 1, // Your user ID
    'name' => 'Test Accounting System',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3001/oauth/callback',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);

echo "Client ID: " . $client->id . "\n";
echo "Client Secret: " . $client->secret . "\n";
```

## 🧪 Testing Methods

### Method 1: Browser Testing (Easiest)

This simulates what happens when a user clicks "Sign in with HR System" in an accounting app.

#### Test the Authorization Flow

1. **Build the authorization URL**:
   ```
   http://localhost:8000/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/oauth/callback&response_type=code&scope=openid profile email accounting&state=test123
   ```

   Replace:
   - `YOUR_CLIENT_ID` with the client ID from Step 2
   - `redirect_uri` must match exactly what you registered

2. **Open in browser** - You should see:
   - Login page (if not logged in)
   - Authorization approval screen (if logged in)
   - Shows the app name and requested permissions

3. **Click "Authorize"** - You'll be redirected to:
   ```
   http://localhost:3001/oauth/callback?code=AUTHORIZATION_CODE&state=test123
   ```

4. **Copy the authorization code** from the URL

#### Test Token Exchange (Using Browser Console or Postman)

Open browser console (F12) and run:

```javascript
// Replace with your actual values
const clientId = 'YOUR_CLIENT_ID';
const clientSecret = 'YOUR_CLIENT_SECRET';
const code = 'AUTHORIZATION_CODE_FROM_STEP_3';
const redirectUri = 'http://localhost:3001/oauth/callback';

fetch('http://localhost:8000/oauth/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
    }),
})
.then(response => response.json())
.then(data => {
    console.log('Access Token:', data.access_token);
    console.log('Refresh Token:', data.refresh_token);
    console.log('Full Response:', data);
});
```

#### Test UserInfo Endpoint

```javascript
const accessToken = 'YOUR_ACCESS_TOKEN_FROM_ABOVE';

fetch('http://localhost:8000/oauth/userinfo', {
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
    },
})
.then(response => response.json())
.then(data => {
    console.log('User Info:', data);
});
```

### Method 2: Using Postman (Recommended for API Testing)

#### Test 1: OpenID Connect Discovery

**GET** `http://localhost:8000/.well-known/openid-configuration`

**Expected Response:**
```json
{
  "issuer": "http://localhost:8000",
  "authorization_endpoint": "http://localhost:8000/oauth/authorize",
  "token_endpoint": "http://localhost:8000/oauth/token",
  "userinfo_endpoint": "http://localhost:8000/oauth/userinfo",
  "jwks_uri": "http://localhost:8000/.well-known/jwks.json",
  ...
}
```

#### Test 2: JWKS Endpoint

**GET** `http://localhost:8000/.well-known/jwks.json`

**Expected Response:**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "1",
      "n": "...",
      "e": "..."
    }
  ]
}
```

#### Test 3: Authorization Endpoint

**GET** `http://localhost:8000/oauth/authorize?client_id=1&redirect_uri=http://localhost:3001/oauth/callback&response_type=code&scope=openid profile email accounting&state=test123`

- Must be logged in first
- Will redirect to approval screen
- After approval, redirects with code

#### Test 4: Token Exchange

**POST** `http://localhost:8000/oauth/token`

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
```

**Body (x-www-form-urlencoded):**
```
grant_type: authorization_code
client_id: YOUR_CLIENT_ID
client_secret: YOUR_CLIENT_SECRET
code: AUTHORIZATION_CODE
redirect_uri: http://localhost:3001/oauth/callback
```

**Expected Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "...",
  "refresh_token": "..."
}
```

#### Test 5: UserInfo Endpoint

**GET** `http://localhost:8000/oauth/userinfo`

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
```

**Expected Response:**
```json
{
  "sub": "1",
  "name": "Your Name",
  "email": "your@email.com",
  "email_verified": true,
  "roles": [...],
  "permissions": [...]
}
```

### Method 3: Using cURL (Command Line)

#### Test Discovery Endpoint
```bash
curl http://localhost:8000/.well-known/openid-configuration
```

#### Test JWKS
```bash
curl http://localhost:8000/.well-known/jwks.json
```

#### Test Token Exchange
```bash
curl -X POST http://localhost:8000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3001/oauth/callback"
```

#### Test UserInfo
```bash
curl -X GET http://localhost:8000/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

### Method 4: Create a Simple Test Client (Full Flow)

Create a simple HTML file to simulate an accounting system:

**test-client.html**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Test OAuth Client</title>
</head>
<body>
    <h1>Test Accounting System</h1>
    <button onclick="login()">Sign in with HR System</button>
    <div id="result"></div>

    <script>
        const CLIENT_ID = 'YOUR_CLIENT_ID';
        const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
        const REDIRECT_URI = 'http://localhost:3001/oauth/callback';
        const HR_SYSTEM_URL = 'http://localhost:8000';

        function login() {
            const state = Math.random().toString(36).substring(7);
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                response_type: 'code',
                scope: 'openid profile email accounting',
                state: state,
            });

            // Store state for verification
            sessionStorage.setItem('oauth_state', state);

            // Redirect to HR system
            window.location.href = `${HR_SYSTEM_URL}/oauth/authorize?${params}`;
        }

        // Handle callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state) {
            // Verify state
            const storedState = sessionStorage.getItem('oauth_state');
            if (state !== storedState) {
                alert('State mismatch! Possible CSRF attack.');
                return;
            }

            // Exchange code for token
            fetch(`${HR_SYSTEM_URL}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code: code,
                    redirect_uri: REDIRECT_URI,
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.access_token) {
                    // Get user info
                    return fetch(`${HR_SYSTEM_URL}/oauth/userinfo`, {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`,
                        },
                    });
                } else {
                    throw new Error('No access token received');
                }
            })
            .then(response => response.json())
            .then(userInfo => {
                document.getElementById('result').innerHTML = `
                    <h2>Login Successful!</h2>
                    <pre>${JSON.stringify(userInfo, null, 2)}</pre>
                `;
            })
            .catch(error => {
                document.getElementById('result').innerHTML = `
                    <h2>Error</h2>
                    <p>${error.message}</p>
                `;
            });
        }
    </script>
</body>
</html>
```

**To use:**
1. Save as `test-client.html`
2. Serve it (you can use Python's simple server):
   ```bash
   # Python 3
   python -m http.server 3001
   
   # Or use any local server
   ```
3. Open `http://localhost:3001/test-client.html`
4. Click "Sign in with HR System"
5. Approve the request
6. See the user info displayed

## 🔍 Testing Checklist

### Basic Functionality
- [ ] Can access `/oauth/clients` page
- [ ] Can create a new OAuth client
- [ ] Client ID and Secret are generated
- [ ] Can view list of clients

### Discovery Endpoints
- [ ] `/.well-known/openid-configuration` returns valid JSON
- [ ] `/.well-known/jwks.json` returns valid JWKS

### Authorization Flow
- [ ] `/oauth/authorize` shows login page when not authenticated
- [ ] `/oauth/authorize` shows approval screen when authenticated
- [ ] Can approve authorization request
- [ ] Can deny authorization request
- [ ] Redirects back with authorization code after approval
- [ ] State parameter is preserved

### Token Exchange
- [ ] Can exchange authorization code for access token
- [ ] Token response includes `access_token` and `refresh_token`
- [ ] Token has correct expiration time
- [ ] Invalid code returns error
- [ ] Invalid client credentials return error

### UserInfo Endpoint
- [ ] Returns user information with valid token
- [ ] Returns 401 with invalid/missing token
- [ ] Includes all expected claims (sub, name, email, etc.)
- [ ] Includes employee data if available
- [ ] Includes roles and permissions

### Security
- [ ] State parameter prevents CSRF
- [ ] Invalid redirect_uri is rejected
- [ ] Expired tokens are rejected
- [ ] Revoked tokens are rejected

## 🐛 Common Issues & Solutions

### Issue: "Client not found"
**Solution**: Make sure you're using the correct Client ID from the database

### Issue: "Invalid redirect URI"
**Solution**: The redirect_uri in the authorization request must match exactly what you registered (including http vs https, trailing slashes, etc.)

### Issue: "Invalid authorization code"
**Solution**: 
- Authorization codes are single-use and expire quickly
- Make sure you're using a fresh code
- Don't reuse the same code twice

### Issue: "Unauthenticated" on UserInfo
**Solution**: 
- Make sure you're sending the token in the Authorization header: `Bearer YOUR_TOKEN`
- Check that the token hasn't expired
- Verify the token format is correct

### Issue: CORS errors
**Solution**: For local testing, this is usually fine. In production, configure CORS properly in `config/cors.php`

## 📝 Testing with Real Accounting/Payroll Systems

Once you've tested locally:

1. **Deploy to staging server** (with HTTPS)
2. **Update APP_URL** in `.env` to your staging URL
3. **Create production clients** with production redirect URIs
4. **Provide credentials** to accounting/payroll teams
5. **Test full integration** with their systems

## 🎯 Quick Test Script

Save this as `test-oauth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
CLIENT_ID="YOUR_CLIENT_ID"
CLIENT_SECRET="YOUR_CLIENT_SECRET"

echo "Testing OAuth Endpoints..."
echo ""

echo "1. Testing OpenID Configuration..."
curl -s "$BASE_URL/.well-known/openid-configuration" | jq '.issuer'
echo ""

echo "2. Testing JWKS..."
curl -s "$BASE_URL/.well-known/jwks.json" | jq '.keys[0].kty'
echo ""

echo "3. Testing Token Endpoint (will fail without valid code)..."
curl -s -X POST "$BASE_URL/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=test&redirect_uri=http://localhost:3001/callback" | jq '.'
echo ""

echo "Done! For full flow, use the browser method above."
```

Make it executable: `chmod +x test-oauth.sh`

## ✅ Success Criteria

Your OAuth implementation is working if:
1. ✅ You can create OAuth clients
2. ✅ Authorization flow redirects correctly
3. ✅ Token exchange returns valid tokens
4. ✅ UserInfo endpoint returns user data
5. ✅ All discovery endpoints work

You're ready for production when all tests pass! 🎉







