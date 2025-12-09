# OAuth Login Redirect Fix

## Problem Description

When integrating SSO with external systems, users were experiencing OAuth state mismatch errors. The issue occurred during the OAuth Authorization Code Flow:

1. External system redirects user to: `/oauth/authorize?client_id=...&state=XYZ&redirect_uri=...`
2. HR system redirects unauthenticated user to `/login` (correct behavior)
3. User logs in successfully
4. **BUG**: HR system redirects user to `/dashboard` instead of back to `/oauth/authorize` with original parameters
5. This breaks the OAuth flow and causes "Invalid OAuth state" errors

## Root Cause

The OAuth authorization URL (including critical query parameters like `state`, `client_id`, `redirect_uri`, etc.) was being lost when users were redirected to login. After successful login, the system defaulted to redirecting to the dashboard instead of resuming the OAuth authorization request.

The code in `AuthenticatedSessionController` checked for an `oauth_redirect` session variable but it was never being set, so the check always failed and users were redirected to the dashboard.

## Solution

### 1. Created Middleware to Preserve OAuth Redirect

**File**: `app/Http/Middleware/PreserveOAuthRedirect.php`

This middleware:
- Runs before the `auth` middleware on all web requests
- Detects when an unauthenticated user accesses `/oauth/authorize`
- Stores the full authorization URL (including all query parameters) in the session as `oauth_redirect`

### 2. Registered Middleware

**File**: `bootstrap/app.php`

Added the middleware to the web middleware group so it runs early enough to capture OAuth authorization requests before they're redirected to login.

### 3. Login Controller Enhancement

**File**: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`

The existing code already checked for `oauth_redirect` in the session. Now that the middleware sets it, the login controller will:
1. Check for `oauth_redirect` in session after successful login
2. If present, redirect user back to the stored OAuth authorization URL with all original parameters
3. This allows the OAuth flow to continue and complete successfully

### 4. Two-Factor Authentication Support

**File**: `app/Http/Controllers/Auth/TwoFactorVerificationController.php`

The 2FA controller also checks for `oauth_redirect` after successful 2FA verification, ensuring OAuth flows work even when 2FA is enabled.

## How It Works

```
1. External System → GET /oauth/authorize?client_id=X&state=ABC&...
2. PreserveOAuthRedirect Middleware → Stores full URL in session['oauth_redirect']
3. Auth Middleware → Redirects to /login (user not authenticated)
4. User logs in → AuthenticatedSessionController.store()
5. Controller checks session['oauth_redirect'] → Found!
6. Controller redirects to stored URL → GET /oauth/authorize?client_id=X&state=ABC&...
7. User sees authorization screen → Approves
8. OAuth flow completes successfully ✅
```

## Testing

To verify the fix works:

1. **Test Standard OAuth Flow:**
   - From external system, redirect to `/oauth/authorize?client_id=1&state=test123&redirect_uri=...`
   - Should be redirected to login
   - After login, should return to authorization screen (not dashboard)
   - State parameter should match original value

2. **Test with 2FA Enabled:**
   - Same flow but with 2FA enabled user
   - After 2FA verification, should resume OAuth flow

3. **Test State Preservation:**
   - The `state` parameter from the original request must be preserved
   - Verify callback receives the same state value

## Files Modified

1. `app/Http/Middleware/PreserveOAuthRedirect.php` - **NEW FILE**
2. `bootstrap/app.php` - Added middleware registration
3. `app/Http/Controllers/Auth/AuthenticatedSessionController.php` - Added comment for clarity

## RFC 6749 Compliance

This fix ensures the OAuth 2.0 Authorization Code Flow (RFC 6749) is properly implemented:

- ✅ Authorization request preserved through authentication
- ✅ State parameter maintained end-to-end
- ✅ User redirected back to authorization endpoint after login
- ✅ OAuth session continuity maintained

## Related Issues

This fixes the issue described in `COUNTER.txt` where external systems integrating SSO were experiencing OAuth state mismatches due to the authorization request being lost after login redirect.

