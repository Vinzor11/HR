# OAuth Testing - Quick Start Card

Print this or keep it open while testing!

---

## 🚀 Setup (2 Terminals)

### Terminal 1: HR System
```powershell
cd C:\Users\arvin\laravel12-react-roles-permissions
php artisan serve --port=8000
```
✅ Should see: `Server running on [http://127.0.0.1:8000]`

### Terminal 2: Test Client
```powershell
cd C:\Users\arvin\laravel12-react-roles-permissions\public
python -m http.server 3001
```
✅ Should see: `Serving HTTP on 0.0.0.0 port 3001 ...`

---

## 📝 Step-by-Step Checklist

### Step 1: Login to HR System
- [ ] Open: `http://localhost:8000/login`
- [ ] Enter email and password
- [ ] Click "Login"
- [ ] ✅ See dashboard

### Step 2: Create OAuth Client
- [ ] Go to: `http://localhost:8000/oauth/clients`
- [ ] Click "Create Client"
- [ ] Fill in:
  - Name: `Accounting System`
  - Redirect URI: `http://localhost:3001/test-oauth-client.html`
  - Type: `accounting`
- [ ] Click "Create"
- [ ] **SAVE Client ID and Client Secret** ⚠️

### Step 3: Configure Test Client
- [ ] Open: `http://localhost:3001/test-oauth-client.html`
- [ ] Fill in form:
  - HR System URL: `http://localhost:8000`
  - Client ID: (paste from Step 2)
  - Client Secret: (paste from Step 2)
  - Redirect URI: `http://localhost:3001/test-oauth-client.html`
- [ ] ✅ All fields filled

### Step 4: Test OAuth Flow
- [ ] Click "Sign in with HR System"
- [ ] ✅ Redirected to HR system
- [ ] Login if needed
- [ ] ✅ See authorization approval screen
- [ ] Click "Authorize"
- [ ] ✅ Redirected back to test client
- [ ] ✅ See success message with user info

---

## 🔍 Verification

### What You Should See:

**After clicking "Authorize":**
```
✅ Success

Token Data:
- access_token: abc123...
- token_type: Bearer
- expires_in: 3600

User Info:
- sub: 1
- name: Your Name
- email: your@email.com
- roles: [...]
- permissions: [...]
```

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| Port 8000 in use | Use `--port=8001` and update URLs |
| Port 3001 in use | Use `3002` and update Redirect URI |
| "Client not found" | Check Client ID matches |
| "Invalid redirect URI" | Must match EXACTLY (no trailing slash) |
| "Invalid authorization code" | Get fresh code (try again) |
| Can't access /oauth/clients | Need `access-users-module` permission |

---

## 📍 Important URLs

- HR System: `http://localhost:8000`
- Login: `http://localhost:8000/login`
- OAuth Clients: `http://localhost:8000/oauth/clients`
- Test Client: `http://localhost:3001/test-oauth-client.html`

---

## 🛑 Stop Servers

**Terminal 1:** Press `Ctrl+C`  
**Terminal 2:** Press `Ctrl+C`

---

## ✅ Success = You See Your User Info!

If you see your name, email, roles, and permissions displayed, it's working! 🎉

