# Testing OAuth with Two Systems on Localhost

This guide shows you how to test OAuth when both systems run on your PC using different ports.

## 🎯 Setup Overview

- **System 1 (HR System - OAuth Provider)**: `http://localhost:8000`
- **System 2 (Accounting System - OAuth Client)**: `http://localhost:3001`

---

## 📋 Step 1: Start Your HR System (OAuth Provider)

### Terminal 1: Start Laravel Application

```bash
# Navigate to your Laravel project
cd C:\Users\arvin\laravel12-react-roles-permissions

# Start Laravel on port 8000
php artisan serve --port=8000
```

You should see:
```
INFO  Server running on [http://127.0.0.1:8000]
```

✅ **Your HR system is now running at:** `http://localhost:8000`

---

## 📋 Step 2: Register the Accounting System as an OAuth Client

### 2.1 Login to HR System

1. Open browser: `http://localhost:8000/login`
2. Login with your account (must have `access-users-module` permission)

### 2.2 Create OAuth Client

1. Go to: `http://localhost:8000/oauth/clients`
2. Click **"Create Client"** button
3. Fill in the form:
   - **Application Name**: `Accounting System`
   - **Redirect URI**: `http://localhost:3001/oauth/callback`
     - ⚠️ **Important**: This must match exactly!
   - **Application Type**: `accounting` (or any type)
4. Click **"Create"**
5. **SAVE THESE CREDENTIALS** (shown only once!):
   - **Client ID**: `1` (or whatever number it shows)
   - **Client Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (long string)

---

## 📋 Step 3: Start the Accounting System (Test Client)

You have two options:

### Option A: Use the Built-in Test Client (Easiest)

The test client is already in your project at `public/test-oauth-client.html`.

#### Terminal 2: Start Simple Web Server

**Using Python:**
```bash
# Navigate to your project's public folder
cd C:\Users\arvin\laravel12-react-roles-permissions\public

# Start Python web server on port 3001
python -m http.server 3001
```

**OR using PHP:**
```bash
# Navigate to your project's public folder
cd C:\Users\arvin\laravel12-react-roles-permissions\public

# Start PHP web server on port 3001
php -S localhost:3001
```

**OR using Node.js (if you have it):**
```bash
# Install http-server globally (one time)
npm install -g http-server

# Then run
cd C:\Users\arvin\laravel12-react-roles-permissions\public
http-server -p 3001
```

You should see:
```
Serving HTTP on 0.0.0.0 port 3001 ...
```

✅ **Your test client is now running at:** `http://localhost:3001`

### Option B: Create a Simple Standalone Test Client

If you want a separate folder for the accounting system, create this:

**Create folder:** `C:\Users\arvin\accounting-system-test`

**Create file:** `C:\Users\arvin\accounting-system-test\index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accounting System - OAuth Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px 0;
        }
        button:hover { background: #0056b3; }
        #result {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
            display: none;
        }
        #result.success { background: #d4edda; }
        #result.error { background: #f8d7da; }
        pre {
            background: #fff;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 12px;
        }
        .config {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 15px 0;
        }
        .config input {
            width: 100%;
            padding: 8px;
            margin: 5px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏦 Accounting System</h1>
        <p>This simulates an external accounting system that uses OAuth to authenticate users.</p>
        
        <div class="config">
            <h3>OAuth Configuration</h3>
            <label>HR System URL:</label>
            <input type="text" id="hrUrl" value="http://localhost:8000">
            
            <label>Client ID:</label>
            <input type="text" id="clientId" placeholder="Enter Client ID from HR system">
            
            <label>Client Secret:</label>
            <input type="text" id="clientSecret" placeholder="Enter Client Secret from HR system">
            
            <label>Redirect URI:</label>
            <input type="text" id="redirectUri" value="http://localhost:3001/oauth/callback">
        </div>

        <button onclick="login()">🔐 Sign in with HR System</button>
        <button onclick="clearResult()">Clear</button>

        <div id="result"></div>
    </div>

    <script>
        // Configuration
        const HR_SYSTEM_URL = 'http://localhost:8000';
        let CLIENT_ID = '';
        let CLIENT_SECRET = '';
        let REDIRECT_URI = 'http://localhost:3001/oauth/callback';

        // Get values from form
        function getConfig() {
            CLIENT_ID = document.getElementById('clientId').value;
            CLIENT_SECRET = document.getElementById('clientSecret').value;
            REDIRECT_URI = document.getElementById('redirectUri').value;
        }

        function showResult(data, isError = false) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.className = isError ? 'error' : 'success';
            resultDiv.innerHTML = `
                <h3>${isError ? '❌ Error' : '✅ Success'}</h3>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
        }

        function clearResult() {
            document.getElementById('result').style.display = 'none';
        }

        function login() {
            getConfig();
            
            if (!CLIENT_ID || !CLIENT_SECRET) {
                alert('Please enter Client ID and Client Secret!');
                return;
            }

            // Store credentials for callback
            sessionStorage.setItem('oauth_client_id', CLIENT_ID);
            sessionStorage.setItem('oauth_client_secret', CLIENT_SECRET);
            sessionStorage.setItem('oauth_redirect_uri', REDIRECT_URI);
            sessionStorage.setItem('oauth_hr_url', document.getElementById('hrUrl').value);

            // Generate state for CSRF protection
            const state = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
            sessionStorage.setItem('oauth_state', state);

            // Build authorization URL
            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                response_type: 'code',
                scope: 'openid profile email accounting',
                state: state,
            });

            // Redirect to HR system
            window.location.href = `${document.getElementById('hrUrl').value}/oauth/authorize?${params}`;
        }

        // Handle OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
            showResult({ 
                error: error, 
                error_description: urlParams.get('error_description') 
            }, true);
        } else if (code && state) {
            // Verify state
            const storedState = sessionStorage.getItem('oauth_state');
            if (state !== storedState) {
                showResult({ error: 'State mismatch! Possible CSRF attack.' }, true);
                return;
            }

            // Get stored credentials
            const clientId = sessionStorage.getItem('oauth_client_id');
            const clientSecret = sessionStorage.getItem('oauth_client_secret');
            const redirectUri = sessionStorage.getItem('oauth_redirect_uri');
            const hrSystemUrl = sessionStorage.getItem('oauth_hr_url');

            // Exchange code for token
            fetch(`${hrSystemUrl}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                }),
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => Promise.reject(err));
                }
                return response.json();
            })
            .then(tokenData => {
                if (tokenData.access_token) {
                    // Get user info
                    return fetch(`${hrSystemUrl}/oauth/userinfo`, {
                        headers: {
                            'Authorization': `Bearer ${tokenData.access_token}`,
                            'Accept': 'application/json',
                        },
                    })
                    .then(response => {
                        if (!response.ok) {
                            return response.json().then(err => Promise.reject(err));
                        }
                        return response.json();
                    })
                    .then(userInfo => {
                        showResult({
                            message: 'Login successful!',
                            token_data: {
                                access_token: tokenData.access_token.substring(0, 30) + '...',
                                token_type: tokenData.token_type,
                                expires_in: tokenData.expires_in,
                            },
                            user_info: userInfo,
                        });
                    });
                } else {
                    throw new Error('No access token received');
                }
            })
            .catch(error => {
                showResult({
                    error: 'Failed to complete OAuth flow',
                    details: error,
                }, true);
            });
        }
    </script>
</body>
</html>
```

**Create file:** `C:\Users\arvin\accounting-system-test\oauth\callback.html` (same content as index.html, or redirect to index.html)

Then start a server in that folder:
```bash
cd C:\Users\arvin\accounting-system-test
python -m http.server 3001
```

---

## 📋 Step 4: Test the OAuth Flow

### 4.1 Open the Accounting System

1. Open browser: `http://localhost:3001/test-oauth-client.html`
   - OR if using Option B: `http://localhost:3001/index.html`

### 4.2 Enter OAuth Credentials

Fill in the form:
- **HR System URL**: `http://localhost:8000`
- **Client ID**: (the ID from Step 2.2)
- **Client Secret**: (the secret from Step 2.2)
- **Redirect URI**: `http://localhost:3001/oauth/callback` (or `http://localhost:3001/test-oauth-client.html`)

### 4.3 Click "Sign in with HR System"

1. You'll be redirected to: `http://localhost:8000/oauth/authorize?...`
2. If not logged in, you'll see the login page
3. After login, you'll see the **authorization approval screen**
4. Click **"Authorize"** button

### 4.4 See the Results

1. You'll be redirected back to: `http://localhost:3001/test-oauth-client.html?code=...&state=...`
2. The page will automatically:
   - Exchange the authorization code for an access token
   - Get your user information from the HR system
   - Display everything on the page

You should see:
- ✅ Success message
- Your access token (truncated)
- Your user information (name, email, roles, permissions, etc.)

---

## 🎯 What Just Happened?

1. ✅ **Accounting System** (localhost:3001) registered as an OAuth client in **HR System** (localhost:8000)
2. ✅ User clicked "Sign in with HR System" in Accounting System
3. ✅ User was redirected to HR System for authentication
4. ✅ User logged in and approved the authorization
5. ✅ HR System redirected back with an authorization code
6. ✅ Accounting System exchanged the code for an access token
7. ✅ Accounting System used the token to get user information
8. ✅ Accounting System now knows who the user is!

---

## 🔍 Troubleshooting

### Issue: "Client not found"
- Make sure you're using the correct Client ID
- Check that the client exists in your database

### Issue: "Invalid redirect URI"
- The redirect URI must match **EXACTLY** what you registered
- Check for:
  - `http` vs `https`
  - Trailing slashes
  - Port numbers
  - Path differences

### Issue: "Invalid authorization code"
- Authorization codes expire quickly (10 minutes)
- They can only be used once
- Get a fresh code by starting the flow again

### Issue: Can't access `/oauth/clients`
- Make sure you're logged in
- Your user needs the `access-users-module` permission

### Issue: Port 3001 already in use
- Use a different port: `python -m http.server 3002`
- Update the redirect URI in the OAuth client registration
- Update the redirect URI in the test client

### Issue: CORS errors
- For localhost testing, CORS shouldn't be an issue
- If you see CORS errors, check `config/cors.php` in Laravel

---

## 📝 Quick Reference

### Terminal Commands

**Terminal 1 - HR System:**
```bash
cd C:\Users\arvin\laravel12-react-roles-permissions
php artisan serve --port=8000
```

**Terminal 2 - Accounting System:**
```bash
# Option A: Use built-in test client
cd C:\Users\arvin\laravel12-react-roles-permissions\public
python -m http.server 3001

# Option B: Use standalone test client
cd C:\Users\arvin\accounting-system-test
python -m http.server 3001
```

### URLs

- **HR System**: `http://localhost:8000`
- **OAuth Clients**: `http://localhost:8000/oauth/clients`
- **Accounting System**: `http://localhost:3001/test-oauth-client.html`

### OAuth Flow

1. User clicks login → Redirects to HR system
2. User approves → Redirects back with code
3. Exchange code → Get access token
4. Use token → Get user info

---

## ✅ Success Checklist

- [ ] HR system running on port 8000
- [ ] Accounting system running on port 3001
- [ ] OAuth client created in HR system
- [ ] Client ID and Secret saved
- [ ] Can complete authorization flow
- [ ] Can get access token
- [ ] Can retrieve user information
- [ ] User info shows correct data

If all checkboxes are checked, your OAuth setup is working! 🎉

---

## 🚀 Next Steps

Once localhost testing works:

1. **Test with different scopes**: Try `payroll` or `hr` scopes
2. **Test with different users**: Login as different users and see their info
3. **Test error cases**: Try invalid credentials, expired codes, etc.
4. **Deploy to staging**: Test with real domains and HTTPS
5. **Integrate with real systems**: Connect actual accounting/payroll systems

