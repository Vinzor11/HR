# OAuth Testing Guide - Ultra Detailed Step-by-Step

This guide walks you through testing OAuth with two systems on your PC, with every single step explained.

---

## 🎯 What We're Doing

We're going to:
1. Run your HR system (OAuth provider) on port 8000
2. Run a test accounting system (OAuth client) on port 3001
3. Register the accounting system in your HR system
4. Test the complete OAuth login flow

---

## 📋 STEP 1: Start Your HR System (OAuth Provider)

### What This Does
This starts your Laravel application so it can act as an OAuth provider.

### Exact Steps

1. **Open PowerShell or Command Prompt**
   - Press `Windows Key + R`
   - Type `powershell` or `cmd`
   - Press Enter

2. **Navigate to your project folder**
   ```powershell
   cd C:\Users\arvin\laravel12-react-roles-permissions
   ```
   Press Enter

3. **Start the Laravel server**
   ```powershell
   php artisan serve --port=8000
   ```
   Press Enter

4. **What You Should See:**
   ```
   INFO  Server running on [http://127.0.0.1:8000]
   
   Press Ctrl+C to stop the server
   ```

5. **✅ Verification:**
   - Open your browser
   - Go to: `http://localhost:8000`
   - You should see your Laravel application homepage
   - **DO NOT CLOSE THIS TERMINAL** - keep it running!

### ⚠️ Troubleshooting Step 1

**Problem:** "php is not recognized"
- **Solution:** PHP is not in your PATH. Use the full path to PHP or install it properly.

**Problem:** Port 8000 is already in use
- **Solution:** Use a different port: `php artisan serve --port=8001`
- Then use `http://localhost:8001` instead of 8000

**Problem:** Nothing happens
- **Solution:** Make sure you're in the correct folder. Check with `dir` (Windows) or `ls` (PowerShell)

---

## 📋 STEP 2: Login to Your HR System

### What This Does
You need to be logged in to create OAuth clients.

### Exact Steps

1. **Open a web browser** (Chrome, Firefox, Edge, etc.)

2. **Go to the login page:**
   ```
   http://localhost:8000/login
   ```
   Type this in your browser's address bar and press Enter

3. **Login with your credentials:**
   - Enter your email
   - Enter your password
   - Click "Login" or press Enter

4. **✅ Verification:**
   - You should be redirected to the dashboard
   - You should see you're logged in (your name/email in the top right, etc.)

### ⚠️ Troubleshooting Step 2

**Problem:** Can't login / Wrong credentials
- **Solution:** Use the correct email and password. If you forgot, you may need to reset it or check your database.

**Problem:** Page not found (404)
- **Solution:** Make sure Step 1 is working. The server must be running.

---

## 📋 STEP 3: Create an OAuth Client

### What This Does
This registers the "Accounting System" as a client that can use OAuth to authenticate users.

### Exact Steps

1. **In your browser, go to the OAuth Clients page:**
   ```
   http://localhost:8000/oauth/clients
   ```
   Type this in your browser's address bar and press Enter

2. **What You Should See:**
   - A page titled "OAuth Clients"
   - A list of existing clients (might be empty)
   - A button that says "Create Client" or similar

3. **Click the "Create Client" button**

4. **Fill in the form:**
   
   **Application Name:**
   - Type: `Accounting System`
   - This is just a label, you can use any name
   
   **Redirect URI:**
   - Type: `http://localhost:3001/test-oauth-client.html`
   - ⚠️ **CRITICAL:** This must be EXACTLY this value (no trailing slash, no typos)
   - This tells the HR system where to send users after they approve
   
   **Application Type:**
   - Select: `accounting` (or any option from the dropdown)
   - This is just for categorization

5. **Click "Create" or "Save" button**

6. **What You Should See:**
   - A success message
   - **IMPORTANT:** You'll see two values displayed:
     - **Client ID**: A number like `1` or `2` or `3`
     - **Client Secret**: A long random string like `abcdefghijklmnopqrstuvwxyz1234567890`
   
7. **⚠️ COPY THESE VALUES NOW:**
   - **Client ID**: Write it down or copy it
   - **Client Secret**: Write it down or copy it
   - ⚠️ **The secret is shown ONLY ONCE** - if you lose it, you'll need to create a new client
   
8. **✅ Verification:**
   - You should see the new client in the list
   - You have the Client ID and Client Secret saved somewhere safe

### ⚠️ Troubleshooting Step 3

**Problem:** Can't access `/oauth/clients` (403 Forbidden or redirects to login)
- **Solution:** Your user account needs the `access-users-module` permission. Ask an admin to grant it, or grant it yourself if you have admin access.

**Problem:** "Create Client" button doesn't work
- **Solution:** Check browser console for errors (F12). Make sure JavaScript is enabled.

**Problem:** Form validation errors
- **Solution:** Make sure Redirect URI is a valid URL starting with `http://` or `https://`

---

## 📋 STEP 4: Start the Test Accounting System

### What This Does
This starts a simple web server to host the test client HTML file that simulates an accounting system.

### Exact Steps

1. **Open a NEW PowerShell or Command Prompt window**
   - Don't close the first terminal (the one running Laravel)
   - Open a new terminal window

2. **Navigate to the public folder:**
   ```powershell
   cd C:\Users\arvin\laravel12-react-roles-permissions\public
   ```
   Press Enter

3. **Check if Python is installed:**
   ```powershell
   python --version
   ```
   Press Enter
   
   **If you see a version number (like `Python 3.11.0`):**
   - ✅ Python is installed, continue to Step 4.4
   
   **If you see "Python is not recognized":**
   - Try: `python3 --version`
   - If that works, use `python3` instead of `python` in the next steps
   - If neither works, use Option B (PHP) or Option C (Node.js) below

4. **Start the web server:**
   
   **Option A: Using Python (Recommended)**
   ```powershell
   python -m http.server 3001
   ```
   Press Enter
   
   **Option B: Using PHP (if Python doesn't work)**
   ```powershell
   php -S localhost:3001
   ```
   Press Enter
   
   **Option C: Using Node.js (if you have it)**
   ```powershell
   npx http-server -p 3001
   ```
   Press Enter

5. **What You Should See:**
   ```
   Serving HTTP on 0.0.0.0 port 3001 ...
   ```
   Or similar message indicating the server is running

6. **✅ Verification:**
   - Open a new browser tab
   - Go to: `http://localhost:3001/test-oauth-client.html`
   - You should see a page titled "Test OAuth Client" with a form
   - **DO NOT CLOSE THIS TERMINAL** - keep it running!

### ⚠️ Troubleshooting Step 4

**Problem:** "python is not recognized"
- **Solution:** 
  - Try `python3` instead
  - Or use PHP: `php -S localhost:3001`
  - Or install Python from python.org

**Problem:** Port 3001 is already in use
- **Solution:** Use a different port: `python -m http.server 3002`
- Then update the Redirect URI in Step 3 to: `http://localhost:3002/test-oauth-client.html`

**Problem:** "No such file or directory"
- **Solution:** Make sure you're in the `public` folder. Check with `dir` (Windows) or `ls` (PowerShell)

**Problem:** Page shows "404 Not Found"
- **Solution:** Make sure the file `test-oauth-client.html` exists in the `public` folder

---

## 📋 STEP 5: Configure the Test Client

### What This Does
You're entering the OAuth credentials so the test client can communicate with your HR system.

### Exact Steps

1. **In your browser, make sure you're on:**
   ```
   http://localhost:3001/test-oauth-client.html
   ```

2. **You should see a form with these fields:**
   - HR System URL
   - Client ID
   - Client Secret
   - Redirect URI

3. **Fill in the form:**

   **HR System URL:**
   - Type or verify: `http://localhost:8000`
   - This is where your HR system is running

   **Client ID:**
   - Paste the Client ID you saved in Step 3
   - It should be a number like `1` or `2`

   **Client Secret:**
   - Paste the Client Secret you saved in Step 3
   - It should be a long random string

   **Redirect URI:**
   - Type or verify: `http://localhost:3001/test-oauth-client.html`
   - ⚠️ **MUST MATCH EXACTLY** what you entered in Step 3

4. **✅ Verification:**
   - All fields are filled in
   - No typos in the URLs
   - Client ID and Secret match what you saved

### ⚠️ Troubleshooting Step 5

**Problem:** Can't paste into the form fields
- **Solution:** Right-click in the field and select "Paste", or use `Ctrl+V`

**Problem:** Form fields are disabled
- **Solution:** Refresh the page (F5)

---

## 📋 STEP 6: Test the OAuth Login Flow

### What This Does
This simulates a user clicking "Sign in with HR System" in an accounting application. You'll go through the complete OAuth flow.

### Exact Steps

1. **On the test client page** (`http://localhost:3001/test-oauth-client.html`)

2. **Click the "Sign in with HR System" button**
   - It might say "🔐 Sign in with HR System" or similar

3. **What Happens Next:**
   - You'll be automatically redirected to your HR system
   - The URL will be something like: `http://localhost:8000/oauth/authorize?client_id=1&redirect_uri=...`

4. **If You're Not Logged In:**
   - You'll see the login page
   - Enter your email and password
   - Click "Login"
   - You'll be redirected to the authorization page

5. **If You're Already Logged In:**
   - You'll go directly to the authorization page

6. **On the Authorization Page, You Should See:**
   - The name of the client: "Accounting System" (or whatever you named it)
   - A list of requested permissions (scopes): "openid", "profile", "email", "accounting"
   - Two buttons: "Authorize" and "Deny" (or similar)

7. **Click the "Authorize" button**
   - This approves the accounting system to access your information

8. **What Happens Next:**
   - You'll be automatically redirected back to the test client
   - The URL will be: `http://localhost:3001/test-oauth-client.html?code=xxxxx&state=xxxxx`
   - The page will automatically process the OAuth flow

9. **Wait a few seconds...**
   - The page is making API calls in the background:
     - Exchanging the authorization code for an access token
     - Getting your user information

10. **What You Should See:**
    - A success message (✅ Success)
    - Your access token (truncated, showing only first few characters)
    - Your user information displayed in JSON format, including:
      - `sub`: Your user ID
      - `name`: Your name
      - `email`: Your email
      - `roles`: Your roles
      - `permissions`: Your permissions
      - And possibly employee information

11. **✅ Verification:**
    - You see a success message
    - You see your user information
    - No error messages

### ⚠️ Troubleshooting Step 6

**Problem:** Redirected but shows error "Client not found"
- **Solution:** 
  - Check that the Client ID in the test client matches the one you created
  - Make sure the client wasn't deleted

**Problem:** Redirected but shows error "Invalid redirect URI"
- **Solution:** 
  - The Redirect URI in the test client must match EXACTLY what you registered
  - Check for:
    - `http` vs `https`
    - Trailing slashes
    - Port numbers
    - Path differences
  - Common mistake: `http://localhost:3001/test-oauth-client.html/` (extra slash)

**Problem:** After clicking Authorize, redirected but shows error "Invalid authorization code"
- **Solution:** 
  - Authorization codes expire quickly (10 minutes)
  - They can only be used once
  - Try the flow again from the beginning

**Problem:** After authorization, page shows error "Failed to complete OAuth flow"
- **Solution:** 
  - Check browser console (F12) for detailed error messages
  - Make sure both servers are still running
  - Verify Client Secret is correct
  - Check that the authorization code wasn't already used

**Problem:** Authorization page doesn't show up / redirects immediately
- **Solution:** 
  - Make sure you're logged into the HR system
  - Check that the authorization endpoint is working: `http://localhost:8000/oauth/authorize?client_id=1&redirect_uri=http://localhost:3001/test-oauth-client.html&response_type=code&scope=openid profile email accounting&state=test`

**Problem:** Can't see user information / shows 401 Unauthorized
- **Solution:** 
  - The access token might be invalid
  - Try the flow again to get a fresh token
  - Check that the token endpoint is working

---

## 📋 STEP 7: Verify Everything Worked

### What This Does
Confirm that the OAuth flow completed successfully and you can see user data.

### Exact Steps

1. **Check the test client page** (`http://localhost:3001/test-oauth-client.html`)

2. **Look for the success message:**
   - Should show: "✅ Success" or similar
   - Should NOT show: "❌ Error"

3. **Check the displayed data:**
   - **Token Data:**
     - `access_token`: Should show a long string (truncated)
     - `token_type`: Should be "Bearer"
     - `expires_in`: Should be a number (like 3600 seconds = 1 hour)
   
   - **User Info:**
     - `sub`: Your user ID (a number)
     - `name`: Your name
     - `email`: Your email address
     - `email_verified`: Should be `true` or `false`
     - `roles`: An array of your roles
     - `permissions`: An array of your permissions
     - Possibly employee information if you have an employee record

4. **✅ Success Checklist:**
   - [ ] Test client page shows success
   - [ ] Access token is displayed
   - [ ] User information is displayed
   - [ ] Your name and email are correct
   - [ ] Roles and permissions are shown

### ⚠️ Troubleshooting Step 7

**Problem:** User info shows but some fields are missing
- **Solution:** This is normal. Not all fields are required. The important ones are `sub`, `name`, and `email`.

**Problem:** Roles/permissions are empty arrays `[]`
- **Solution:** This is normal if your user doesn't have roles/permissions assigned. You can assign them in the HR system.

---

## 🎉 Congratulations!

If you've reached this point and see your user information, **your OAuth system is working correctly!**

### What You Just Accomplished:

1. ✅ Set up your HR system as an OAuth provider
2. ✅ Registered an external system (Accounting System) as an OAuth client
3. ✅ Completed the full OAuth authorization flow
4. ✅ Retrieved user information using OAuth tokens

### What This Means:

- Your HR system can now act as an Identity Provider (IDP)
- Other systems can register and use OAuth to authenticate users
- Users can log in once and access multiple systems (Single Sign-On)
- External systems can get user information securely

---

## 🔄 Testing Again

To test again with a different user or to see the flow again:

1. **Clear your browser session:**
   - Logout from the HR system: `http://localhost:8000/logout`
   - Or use incognito/private browsing mode

2. **Start fresh:**
   - Go back to: `http://localhost:3001/test-oauth-client.html`
   - Click "Sign in with HR System" again
   - Login and approve

3. **Or test with different scopes:**
   - In the test client, you can modify the scope parameter
   - Try: `openid profile email payroll` instead of `accounting`

---

## 🛑 Stopping the Servers

When you're done testing:

1. **Stop the Accounting System server:**
   - Go to Terminal 2 (the one running the test client)
   - Press `Ctrl+C`
   - Press `Y` if asked to confirm

2. **Stop the HR System server:**
   - Go to Terminal 1 (the one running Laravel)
   - Press `Ctrl+C`
   - Press `Y` if asked to confirm

---

## 📝 Quick Reference

### Terminal Commands

**Terminal 1 - HR System:**
```powershell
cd C:\Users\arvin\laravel12-react-roles-permissions
php artisan serve --port=8000
```

**Terminal 2 - Accounting System:**
```powershell
cd C:\Users\arvin\laravel12-react-roles-permissions\public
python -m http.server 3001
```

### Important URLs

- **HR System Home**: `http://localhost:8000`
- **HR System Login**: `http://localhost:8000/login`
- **OAuth Clients Page**: `http://localhost:8000/oauth/clients`
- **Test Client**: `http://localhost:3001/test-oauth-client.html`

### Important Values to Save

- **Client ID**: (from Step 3)
- **Client Secret**: (from Step 3)
- **Redirect URI**: `http://localhost:3001/test-oauth-client.html`

---

## 🆘 Still Having Issues?

### Common Issues and Solutions

1. **Both servers won't start:**
   - Make sure ports 8000 and 3001 are not in use
   - Check with: `netstat -ano | findstr :8000` and `netstat -ano | findstr :3001`
   - Kill processes using those ports if needed

2. **Can't create OAuth client:**
   - Make sure you have the `access-users-module` permission
   - Check that you're logged in

3. **OAuth flow fails:**
   - Check browser console (F12) for errors
   - Verify both servers are running
   - Make sure Redirect URI matches exactly
   - Try clearing browser cache and cookies

4. **Need more help:**
   - Check the browser console (F12) for detailed error messages
   - Check Laravel logs: `storage/logs/laravel.log`
   - Verify database has OAuth tables (run migrations if needed)

---

## ✅ Final Checklist

Before considering the test successful:

- [ ] HR system running on port 8000
- [ ] Test client running on port 3001
- [ ] Can access both in browser
- [ ] OAuth client created successfully
- [ ] Client ID and Secret saved
- [ ] Can complete authorization flow
- [ ] Can see access token
- [ ] Can see user information
- [ ] User information is correct

If all checkboxes are checked, you're done! 🎉

