# SSO through OAuth 2.0 Implementation

This document explains how Single Sign-On (SSO) through OAuth 2.0 is implemented in the HR Management System.

## Overview

The HR system implements OAuth 2.0 with OpenID Connect extensions to enable secure SSO between the HR system and external applications (like Accounting and Payroll systems). The implementation uses Laravel Passport as the OAuth 2.0 server.

## Architecture

### Components

1. **HR System** (OAuth Authorization Server & Resource Server)
   - Built with Laravel + Laravel Passport
   - Provides user authentication and authorization
   - Issues access tokens and ID tokens

2. **External Applications** (OAuth Clients)
   - Accounting System
   - Payroll System
   - Other HR-related applications

3. **Database Tables**
   - `oauth_access_tokens` - Stores access tokens
   - `oauth_auth_codes` - Stores authorization codes
   - `oauth_clients` - Stores OAuth client applications
   - `oauth_refresh_tokens` - Stores refresh tokens
   - `oauth_device_codes` - Stores device authorization codes

## OAuth Flow

The implementation follows the **Authorization Code Grant** flow with OpenID Connect extensions:

### 1. Client Registration

External applications must be registered as OAuth clients in the HR system:

```php
// From ClientController@store
$client = $this->clients->createAuthorizationCodeGrantClient(
    $validated['name'],
    [$validated['redirect']],
    true, // confidential
    $request->user(), // user
    false // enable device flow
);
```

Each client receives:
- **Client ID**: Public identifier
- **Client Secret**: Secret key for authentication
- **Redirect URIs**: Allowed callback URLs

### 2. Authorization Request

When a user needs to access an external application:

```
GET /oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code&scope=openid%20profile%20email%20accounting&state={STATE}
```

**Parameters:**
- `client_id`: The registered client ID
- `redirect_uri`: Must match registered URI for security
- `response_type`: Set to `code` for authorization code flow
- `scope`: Requested permissions (openid, profile, email, accounting, payroll, hr)
- `state`: CSRF protection token

### 3. User Authentication

The HR system authenticates the user through its web authentication guard:

```php
// From routes/oauth.php
Route::middleware(['web', 'auth'])->group(function () {
    Route::get('oauth/authorize', [PassportAuthorizationController::class, 'authorize']);
});
```

If the user is not authenticated, they are redirected to the HR system's login page.

### 4. Authorization Consent

After authentication, the user sees an authorization consent screen where they can:
- Review the requesting application
- View requested permissions/scopes
- Approve or deny the authorization

### 5. Authorization Code Grant

Upon approval, the HR system redirects back to the client application with:

```
{REDIRECT_URI}?code={AUTH_CODE}&state={ORIGINAL_STATE}
```

### 6. Token Exchange

The client application exchanges the authorization code for tokens:

```javascript
// From test-oauth-client.html
fetch('/oauth/token', {
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
```

**Response includes:**
- `access_token`: Bearer token for API access
- `refresh_token`: Token to obtain new access tokens
- `token_type`: Usually "Bearer"
- `expires_in`: Token lifetime in seconds

## OpenID Connect Implementation

The system implements OpenID Connect (OIDC) for identity information:

### Discovery Endpoint

```
GET /.well-known/openid-configuration
```

Returns OIDC configuration:

```json
{
    "issuer": "https://hr-system.com",
    "authorization_endpoint": "https://hr-system.com/oauth/authorize",
    "token_endpoint": "https://hr-system.com/oauth/token",
    "userinfo_endpoint": "https://hr-system.com/oauth/userinfo",
    "end_session_endpoint": "https://hr-system.com/oauth/end-session",
    "jwks_uri": "https://hr-system.com/.well-known/jwks.json",
    "response_types_supported": ["code"],
    "scopes_supported": ["openid", "profile", "email", "accounting", "payroll", "hr"]
}
```

### JSON Web Key Set (JWKS)

```
GET /.well-known/jwks.json
```

Provides the public key for verifying JWT tokens:

```json
{
    "keys": [{
        "kty": "RSA",
        "use": "sig",
        "kid": "1",
        "n": "...",
        "e": "..."
    }]
}
```

### UserInfo Endpoint

```
GET /oauth/userinfo
Authorization: Bearer {ACCESS_TOKEN}
```

Returns comprehensive user information:

```json
{
    "sub": "1",
    "name": "John Doe",
    "email": "john.doe@company.com",
    "email_verified": true,
    "employee_id": "EMP001",
    "employee_number": "12345",
    "first_name": "John",
    "last_name": "Doe",
    "middle_name": "Smith",
    "department": "IT Department",
    "position": "Software Engineer",
    "roles": ["employee", "it_staff"],
    "permissions": ["view_profile", "submit_requests", "view_payroll"]
}
```

## Security Features

### 1. State Parameter
- CSRF protection using random state tokens
- Client must verify state matches between request and callback

### 2. PKCE (Proof Key for Code Exchange)
- Supported by Laravel Passport
- Required for public clients (SPA applications)

### 3. Client Authentication
- Confidential clients use client_secret
- Basic authentication or form-encoded credentials

### 4. Token Encryption
- Access tokens encrypted using RSA keys
- Public/private key pair stored securely

### 5. Scopes and Permissions
- Granular permission control
- Role-based access control (RBAC) integration

## Scopes

The system defines several scopes for different access levels:

- `openid`: Required for OpenID Connect
- `profile`: Basic profile information
- `email`: Email address and verification status
- `accounting`: Access to accounting-related data
- `payroll`: Access to payroll information
- `hr`: Full HR system access

## API Authentication

External applications use Bearer tokens for API access:

```javascript
fetch('/api/hr/employees', {
    headers: {
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/json',
    },
})
```

## Token Refresh

Access tokens expire (typically 1 hour). Use refresh tokens to obtain new ones:

```javascript
fetch('/oauth/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    }),
})
```

## SSO Logout Implementation

The HR system implements comprehensive SSO logout functionality supporting both RP-initiated logout and session termination.

### RP-Initiated Logout (End Session Endpoint)

When a user logs out from an external application, they can be redirected to the HR system to terminate the SSO session:

```
GET /oauth/end-session?id_token_hint={ID_TOKEN}&post_logout_redirect_uri={URI}&state={STATE}
```

**Parameters:**
- `id_token_hint`: Optional ID token from the current session
- `post_logout_redirect_uri`: Where to redirect after logout (must be pre-registered)
- `state`: CSRF protection token (echoed back in redirect)

**Process:**
1. Validates `post_logout_redirect_uri` against registered client URIs
2. Revokes all active OAuth access tokens for the user
3. Logs the user out of the HR system
4. Redirects to the specified URI or home page

### Enhanced Logout in HR System

When users logout directly from the HR system, it automatically:
- Terminates the web session
- Revokes all OAuth access tokens
- Logs the activity
- Redirects to home page

### Client-Side Logout Integration

External applications should implement logout as follows:

```javascript
function logout() {
    const hrSystemUrl = 'https://hr-system.com';

    // Option 1: RP-initiated logout (recommended)
    const logoutUrl = `${hrSystemUrl}/oauth/end-session`;
    window.location.href = logoutUrl;

    // Option 2: Custom logout with post_logout_redirect_uri
    const params = new URLSearchParams({
        post_logout_redirect_uri: window.location.origin + '/logged-out',
        state: Math.random().toString(36).substring(2, 15)
    });
    window.location.href = `${logoutUrl}?${params}`;
}
```

### Security Considerations

**Token Revocation:**
- All active access tokens are revoked during logout
- Refresh tokens become invalid
- Prevents continued API access after logout

**URI Validation:**
- `post_logout_redirect_uri` must be pre-registered with the OAuth client
- Prevents open redirect attacks
- Invalid URIs are ignored with fallback to home page

**Session Management:**
- Web session is invalidated
- CSRF tokens are regenerated
- User activity is logged

### Back-Channel Logout (Future Enhancement)

For advanced scenarios, back-channel logout can be implemented:

```
POST /oauth/back-channel-logout
Authorization: Bearer {LOGOUT_TOKEN}
Content-Type: application/x-www-form-urlencoded

logout_token={JWT_TOKEN}
```

This allows the HR system to notify clients when a user logs out, enabling automatic session termination across all applications.

### Testing Logout

The test client (`test-oauth-client.html`) includes logout functionality:

1. Complete the OAuth login flow
2. Click "Logout from HR System" button
3. Observe redirection to end session endpoint
4. Verify tokens are invalidated
5. Confirm redirect to home page

### Logout Flow Sequence

```
Client Application → HR System (end_session_endpoint)
    ↓
Validate Parameters
    ↓
Revoke OAuth Tokens
    ↓
Terminate Web Session
    ↓
Log Activity
    ↓
Redirect to post_logout_redirect_uri (or home)
```

## Testing

A test OAuth client is available at `public/test-oauth-client.html` that simulates:
1. Authorization code flow
2. Token exchange
3. User info retrieval
4. Error handling

## Configuration

### Environment Variables

```env
PASSPORT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----..."
PASSPORT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
AUTH_GUARD=web
```

### Key Generation

```bash
php artisan passport:keys
php artisan passport:client --personal
```

## Integration Examples

### Accounting System Integration

1. Register OAuth client in HR system
2. Configure accounting system with client credentials
3. Implement OAuth flow for user authentication
4. Use access tokens to fetch employee data from HR APIs

### Payroll System Integration

Similar to accounting system, but with payroll-specific scopes and API endpoints.

## Best Practices

1. **Always validate state parameter** to prevent CSRF attacks
2. **Use HTTPS** for all OAuth endpoints
3. **Store client secrets securely** - never in client-side code
4. **Implement proper error handling** for OAuth failures
5. **Regularly rotate keys** for security
6. **Monitor token usage** and implement rate limiting
7. **Use appropriate scopes** - request only needed permissions

## Troubleshooting

### Common Issues

1. **Invalid redirect URI**: Ensure redirect URI exactly matches registered URI
2. **State mismatch**: Implement proper state parameter handling
3. **Token expired**: Use refresh tokens to obtain new access tokens
4. **Insufficient scope**: Request appropriate scopes for required data access
5. **Invalid post_logout_redirect_uri**: Ensure logout redirect URI is pre-registered with the OAuth client
6. **Tokens not revoked**: Check that logout properly terminates both web and API sessions

### Debug Tools

- Check `storage/logs/laravel.log` for server-side errors
- Use browser developer tools to inspect OAuth redirects
- Test with the provided `test-oauth-client.html` file
- Verify JWKS endpoint for token validation issues

## Future Enhancements

1. **Device Authorization Grant** - For IoT devices and smart TVs
2. **JWT Access Tokens** - Self-contained tokens with user claims
3. **Token Introspection** - Real-time token validation
4. **OAuth 2.1** - Latest OAuth specifications
5. **Federated Identity** - Integration with external identity providers
6. **Front-Channel Logout** - Logout notifications via iframe to all client applications
7. **Session Management** - Check Session Iframe (OIDC Session Management)
8. **Logout Token Validation** - Proper JWT validation for back-channel logout tokens
