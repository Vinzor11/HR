# OAuth Testing Guide - Step by Step

## 🎯 Goal
Test OAuth by having another system (like an Accounting System) register in your HR system, then use it to authenticate users.

---

## 📋 Step 1: Register the Other System as an OAuth Client

### Option A: Using the Web UI (Easiest)

1. **Start your Laravel application:**
   ```bash
   php artisan serve
   # Or
   composer run dev
   ```

2. **Login to your HR system:**
   - Go to: `http://localhost:8000/login`
   - Login with an account that has `access-users-module` permission

3. **Navigate to OAuth Clients:**
   - Go to: `http://localhost:8000/oauth/clients`
   - Or add it to your navigation menu

4. **Create a new OAuth client:**
   - Click "Create Client" button
   - Fill in the form:
     - **Application Name**: `Test Accounting System` (or any name)
     - **Redirect URI**: `http://localhost:3001/test-oauth-client.html`
       - ⚠️ **Important**: This must match exactly what you'll use in the test client
     - **Application Type**: Select `accounting` (or any type)
   - Click "Create"

5. **Save the credentials:**
   - **Client ID**: Copy this (e.g., `1`)
   - **Client Secret**: Copy this immediately (shown only once!)
   - ⚠️ **Save these somewhere safe!**

### Option B: Using Tinker (Command Line)

```bash
php artisan tinker
```

```php
$client = \Laravel\Passport\Client::create([
    'user_id' => 1, // Your user ID
    'name' => 'Test Accounting System',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3001/test-oauth-client.html',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);

echo "Client ID: " . $client->id . "\n";
echo "Client Secret: " . $client->secret . "\n";
```

---

## 🧪 Step 2: Test the OAuth Flow

You have a test client HTML file already! Here's how to use it:

### Method 1: Using the Built-in Test Client (Recommended)

1. **Start a simple web server** on port 3001:
   
   **Option A: Python**
   ```bash
   # Python 3
   python -m http.server 3001
   
   # Or Python 2
   python -m SimpleHTTPServer 3001
   ```
   
   **Option B: PHP**
   ```bash
   php -S localhost:3001 -t public
   ```
   
   **Option C: Node.js (http-server)**
   ```bash
   npx http-server -p 3001
   ```

2. **Open the test client:**
   - Go to: `http://localhost:3001/test-oauth-client.html`
   - You should see a form with configuration fields

3. **Enter your OAuth client credentials:**
   - **HR System URL**: `http://localhost:8000` (or your Laravel app URL)
   - **Client ID**: The ID from Step 1 (e.g., `1`)
   - **Client Secret**: The secret from Step 1
   - **Redirect URI**: `http://localhost:3001/test-oauth-client.html` (must match what you registered!)

4. **Click "Sign in with HR System"**
   - You'll be redirected to your HR system
   - If not logged in, you'll see the login page
   - After login, you'll see the authorization approval screen

5. **Approve the request:**
   - Click "Authorize" button
   - You'll be redirected back to the test client
   - The page will automatically:
     - Exchange the authorization code for an access token
     - Get your user information
     - Display the results

6. **See the results:**
   - You should see your user information displayed
   - This proves the OAuth flow worked!

### Method 2: Manual Browser Testing

1. **Build the authorization URL:**
   ```
   http://localhost:8000/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3001/test-oauth-client.html&response_type=code&scope=openid profile email accounting&state=test123
   ```
   Replace `YOUR_CLIENT_ID` with your actual client ID.

2. **Open in browser:**
   - You'll see the login page (if not logged in)
   - After login, you'll see the approval screen
   - Click "Authorize"

3. **Copy the authorization code:**
   - You'll be redirected to: `http://localhost:3001/test-oauth-client.html?code=AUTHORIZATION_CODE&state=test123`
   - Copy the `code` parameter value

4. **Exchange code for token** (using browser console or Postman):
   
   **Browser Console:**
   ```javascript
   fetch('http://localhost:8000/oauth/token', {
       method: 'POST',
       headers: {
           'Content-Type': 'application/x-www-form-urlencoded',
       },
       body: new URLSearchParams({
           grant_type: 'authorization_code',
           client_id: 'YOUR_CLIENT_ID',
           client_secret: 'YOUR_CLIENT_SECRET',
           code: 'AUTHORIZATION_CODE_FROM_STEP_3',
           redirect_uri: 'http://localhost:3001/test-oauth-client.html',
       }),
   })
   .then(response => response.json())
   .then(data => console.log(data));
   ```

5. **Get user info:**
   ```javascript
   fetch('http://localhost:8000/oauth/userinfo', {
       headers: {
           'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
           'Accept': 'application/json',
       },
   })
   .then(response => response.json())
   .then(data => console.log(data));
   ```

---

## 🔍 Step 3: Verify Everything Works

### Checklist:

- ✅ Can create OAuth client in `/oauth/clients`
- ✅ Client ID and Secret are generated
- ✅ Authorization URL redirects correctly
- ✅ Approval screen shows client name and requested scopes
- ✅ After approval, redirects back with authorization code
- ✅ Can exchange code for access token
- ✅ Can get user info with access token
- ✅ User info includes: name, email, roles, permissions

### Expected UserInfo Response:

```json
{
  "sub": "1",
  "name": "Your Name",
  "email": "your@email.com",
  "email_verified": true,
  "employee_id": "123",
  "employee_number": "EMP001",
  "department": "IT Department",
  "position": "Software Developer",
  "roles": ["employee", "user"],
  "permissions": ["access-dashboard", "view-profile"]
}
```

---

## 🌐 Step 4: Test with a Real External System

Once local testing works, you can integrate with a real external system:

### Information to Provide to External System Developers:

```
OAuth Provider Details:
- Authorization URL: https://your-hr-system.com/oauth/authorize
- Token URL: https://your-hr-system.com/oauth/token
- UserInfo URL: https://your-hr-system.com/oauth/userinfo
- OpenID Configuration: https://your-hr-system.com/.well-known/openid-configuration
- JWKS URL: https://your-hr-system.com/.well-known/jwks.json

Client Credentials:
- Client ID: [from Step 1]
- Client Secret: [from Step 1]
- Redirect URI: [must match exactly what they register]

Scopes:
- openid profile email accounting (or payroll, hr)
```

### OAuth Flow for External System:

1. User clicks "Sign in with HR System" in external app
2. External app redirects to: `https://your-hr-system.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=...&state=...`
3. User logs in and approves
4. User redirected back with authorization code
5. External app exchanges code for access token
6. External app uses token to get user info
7. External app creates session for user

---

## 🐛 Troubleshooting

### Issue: "Client not found"
- **Solution**: Make sure you're using the correct Client ID from the database

### Issue: "Invalid redirect URI"
- **Solution**: The redirect_uri in the authorization request must match EXACTLY what you registered (including http vs https, trailing slashes, etc.)

### Issue: "Invalid authorization code"
- **Solution**: 
  - Authorization codes are single-use and expire quickly (usually 10 minutes)
  - Make sure you're using a fresh code
  - Don't reuse the same code twice

### Issue: "Unauthenticated" on UserInfo
- **Solution**: 
  - Make sure you're sending the token in the Authorization header: `Bearer YOUR_TOKEN`
  - Check that the token hasn't expired
  - Verify the token format is correct

### Issue: CORS errors
- **Solution**: For local testing, this is usually fine. In production, configure CORS properly in `config/cors.php`

### Issue: Can't access `/oauth/clients`
- **Solution**: Make sure your user has the `access-users-module` permission

---

## 📝 Quick Reference

### Create Client (Tinker)
```php
$client = \Laravel\Passport\Client::create([
    'user_id' => 1,
    'name' => 'Test System',
    'secret' => \Illuminate\Support\Str::random(40),
    'redirect' => 'http://localhost:3001/callback',
    'personal_access_client' => false,
    'password_client' => false,
    'revoked' => false,
]);
```

### Authorization URL
```
http://localhost:8000/oauth/authorize?client_id=1&redirect_uri=http://localhost:3001/callback&response_type=code&scope=openid profile email accounting&state=random123
```

### Token Exchange (cURL)
```bash
curl -X POST http://localhost:8000/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=1" \
  -d "client_secret=YOUR_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=http://localhost:3001/callback"
```

### UserInfo (cURL)
```bash
curl -X GET http://localhost:8000/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

---

## ✅ Success!

If you can:
1. ✅ Create an OAuth client
2. ✅ Complete the authorization flow
3. ✅ Get an access token
4. ✅ Retrieve user information

Then your OAuth system is working correctly! 🎉

