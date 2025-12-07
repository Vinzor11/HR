# OAuth System - What It Sends

This document details what data your OAuth implementation sends at each endpoint.

---

## 📍 Endpoints Overview

Your OAuth system provides the following endpoints:

1. **OpenID Connect Discovery** - `/.well-known/openid-configuration`
2. **JSON Web Key Set** - `/.well-known/jwks.json`
3. **Authorization** - `/oauth/authorize`
4. **Token Exchange** - `/oauth/token`
5. **User Info** - `/oauth/userinfo`

---

## 1. OpenID Connect Discovery Endpoint

**URL**: `GET /.well-known/openid-configuration`

**What it sends:**

```json
{
  "issuer": "https://your-hr-system.com",
  "authorization_endpoint": "https://your-hr-system.com/oauth/authorize",
  "token_endpoint": "https://your-hr-system.com/oauth/token",
  "userinfo_endpoint": "https://your-hr-system.com/oauth/userinfo",
  "jwks_uri": "https://your-hr-system.com/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": [
    "openid",
    "profile",
    "email",
    "accounting",
    "payroll",
    "hr"
  ],
  "token_endpoint_auth_methods_supported": [
    "client_secret_basic",
    "client_secret_post"
  ],
  "grant_types_supported": [
    "authorization_code",
    "refresh_token"
  ]
}
```

**Purpose**: Allows OAuth clients to automatically discover your OAuth configuration.

---

## 2. JSON Web Key Set (JWKS) Endpoint

**URL**: `GET /.well-known/jwks.json`

**What it sends:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "1",
      "n": "base64url-encoded-modulus",
      "e": "base64url-encoded-exponent"
    }
  ]
}
```

**Purpose**: Provides the public key for verifying JWT tokens. Used for token signature validation.

**Note**: The `n` and `e` values are base64url-encoded RSA public key components.

---

## 3. Authorization Endpoint

**URL**: `GET /oauth/authorize`

**Request Parameters** (what clients send):
- `client_id` - OAuth client ID
- `redirect_uri` - Callback URL
- `response_type` - Always `code` (Authorization Code flow)
- `scope` - Requested scopes (e.g., `openid profile email accounting`)
- `state` - CSRF protection token (optional but recommended)

**What it sends back**:

After user approval/denial, redirects to `redirect_uri` with:

**On Approval:**
```
https://client-app.com/oauth/callback?code=AUTHORIZATION_CODE&state=STATE_VALUE
```

**On Denial:**
```
https://client-app.com/oauth/callback?error=access_denied&error_description=...&state=STATE_VALUE
```

**Authorization Code**:
- Short-lived (typically 10 minutes)
- Single-use
- Exchanged for access token

---

## 4. Token Exchange Endpoint

**URL**: `POST /oauth/token`

**Request** (what clients send):
```json
{
  "grant_type": "authorization_code",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "https://client-app.com/oauth/callback"
}
```

**What it sends back:**

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def50200a1b2c3d4e5f6..."
}
```

**Token Details**:
- **Access Token**: JWT token, expires in **1 hour** (3600 seconds)
- **Refresh Token**: Used to get new access tokens, expires in **30 days**
- **Token Type**: Always `Bearer`

**For Refresh Token Grant**:
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET"
}
```

Returns the same response format with new tokens.

---

## 5. UserInfo Endpoint

**URL**: `GET /oauth/userinfo`

**Authentication**: Bearer token in `Authorization` header:
```
Authorization: Bearer ACCESS_TOKEN
```

**What it sends:**

### Standard OpenID Connect Claims

```json
{
  "sub": "1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "email_verified": true
}
```

### Employee-Specific Claims (if user has employee record)

```json
{
  "sub": "1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "email_verified": true,
  "employee_id": "123",
  "employee_number": "EMP001",
  "department": "IT Department",
  "position": "Software Developer"
}
```

### Full Response with Roles & Permissions

```json
{
  "sub": "1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "email_verified": true,
  "employee_id": "123",
  "employee_number": "EMP001",
  "department": "IT Department",
  "position": "Software Developer",
  "roles": [
    "Employee",
    "Manager"
  ],
  "permissions": [
    "access-dashboard",
    "access-employees-module",
    "view-employee-log",
    "access-trainings-module"
  ]
}
```

**Claim Descriptions**:

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | Subject identifier (user ID) |
| `name` | string | User's full name |
| `email` | string | User's email address |
| `email_verified` | boolean | Whether email is verified |
| `employee_id` | string | Employee record ID (if exists) |
| `employee_number` | string | Employee number (if exists) |
| `department` | string | Department name (if employee has department) |
| `position` | string | Position name (if employee has position) |
| `roles` | array | Array of role names (from Spatie Permissions) |
| `permissions` | array | Array of all permissions (direct + via roles) |

---

## 🔐 OAuth Scopes

Your system supports the following scopes:

| Scope | Description | Purpose |
|-------|-------------|---------|
| `openid` | OpenID Connect | Required for OIDC flow |
| `profile` | Profile information | Access to name and profile data |
| `email` | Email address | Access to email and verification status |
| `accounting` | Accounting system | Access for accounting integration |
| `payroll` | Payroll system | Access for payroll integration |
| `hr` | HR system | Access to HR system (default scope) |

**Default Scope**: `hr` (automatically included if no scope specified)

---

## 📋 Complete OAuth Flow Example

### Step 1: Client Redirects User
```
GET /oauth/authorize?
  client_id=1&
  redirect_uri=https://accounting.example.com/callback&
  response_type=code&
  scope=openid profile email accounting&
  state=xyz123
```

### Step 2: User Approves
User is redirected back with authorization code:
```
https://accounting.example.com/callback?
  code=AUTH_CODE_123&
  state=xyz123
```

### Step 3: Client Exchanges Code for Token
```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "1",
  "client_secret": "CLIENT_SECRET",
  "code": "AUTH_CODE_123",
  "redirect_uri": "https://accounting.example.com/callback"
}
```

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def50200a1b2c3d4e5f6..."
}
```

### Step 4: Client Gets User Info
```http
GET /oauth/userinfo
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc...
```

**Response:**
```json
{
  "sub": "1",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "email_verified": true,
  "employee_id": "123",
  "employee_number": "EMP001",
  "department": "IT Department",
  "position": "Software Developer",
  "roles": ["Employee", "Manager"],
  "permissions": ["access-dashboard", "access-employees-module"]
}
```

---

## 🔄 Token Refresh Flow

When access token expires, client can refresh:

```http
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "client_id": "1",
  "client_secret": "CLIENT_SECRET"
}
```

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "NEW_ACCESS_TOKEN...",
  "refresh_token": "NEW_REFRESH_TOKEN..."
}
```

---

## ⚙️ Token Expiration Settings

Configured in `app/Providers/AppServiceProvider.php`:

- **Access Token**: 1 hour (3600 seconds)
- **Refresh Token**: 30 days

---

## 🛡️ Security Features

1. **HTTPS Required**: In production, all endpoints require HTTPS
2. **Client Secret**: Required for token exchange
3. **State Parameter**: CSRF protection in authorization flow
4. **Token Expiration**: Short-lived access tokens
5. **Rate Limiting**: Token endpoint is rate-limited
6. **Scope-Based Access**: Clients can only request approved scopes

---

## 📝 Notes

1. **Employee Data**: Employee-specific claims (`employee_id`, `department`, `position`) are only included if:
   - User has an associated employee record
   - Employee record exists and is loaded

2. **Roles & Permissions**: Always included in userinfo response, regardless of scope

3. **Email Verification**: `email_verified` reflects Laravel's email verification status

4. **Default Scope**: If no scope is requested, `hr` scope is automatically included

5. **JWT Tokens**: Access tokens are JWT tokens that can be decoded (but not verified without the public key from JWKS endpoint)

---

## 🧪 Testing

To test what your OAuth sends:

1. **Check Discovery**:
   ```bash
   curl https://your-hr-system.com/.well-known/openid-configuration
   ```

2. **Check JWKS**:
   ```bash
   curl https://your-hr-system.com/.well-known/jwks.json
   ```

3. **Get User Info** (requires valid access token):
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        https://your-hr-system.com/oauth/userinfo
   ```

---

**Last Updated**: January 2025

