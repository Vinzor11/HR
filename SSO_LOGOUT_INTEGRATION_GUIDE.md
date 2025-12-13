# SSO Logout Integration Guide

This guide explains how to integrate Single Sign-On (SSO) logout functionality into your application when using the HR Management System as your identity provider.

## 🎯 Overview

When users can authenticate through multiple methods (direct login or SSO via HR system), your application's logout behavior must be consistent regardless of how they authenticated. This guide shows you how to implement SSO logout that works seamlessly with both authentication methods.

## 🔑 Understanding SSO Logout

### Traditional Logout Flow
```
User clicks logout → Clear local session → Redirect to login page
```

### SSO Logout Flow
```
User clicks logout → Clear local session → Redirect to HR system logout → HR system clears SSO session → Redirect back to your app
```

### Key Principle
**Logout should work identically regardless of login method.** Users shouldn't need to know or care whether they logged in directly or via SSO - the logout experience should be the same.

## 🚀 Quick Start Implementation

### Basic SSO Logout (Recommended)

Replace your existing logout logic with this:

```javascript
function logout() {
    // Always clear local session first
    clearLocalSession();

    // Check if user logged in via SSO
    const isSSOUser = checkIfSSOUser();

    if (isSSOUser) {
        // SSO logout - redirect to HR system
        redirectToSSOLogout();
    } else {
        // Direct logout - redirect to your login page
        redirectToLoginPage();
    }
}
```

## 🔧 Implementation Steps

### Step 1: Detect Authentication Method

Your application needs to track how the user authenticated:

```javascript
// When user logs in via SSO
function handleSSOLogin(tokens, userInfo) {
    localStorage.setItem('auth_method', 'sso');
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('hr_system_url', 'https://hr-production-eaf1.up.railway.app');
    // ... rest of login logic
}

// When user logs in directly
function handleDirectLogin(credentials) {
    localStorage.setItem('auth_method', 'direct');
    // ... rest of login logic
}

// Check authentication method
function checkIfSSOUser() {
    return localStorage.getItem('auth_method') === 'sso';
}
```

### Step 2: Implement SSO Logout Function

```javascript
function performSSOLogout() {
    // Clear all local authentication data
    clearLocalSession();

    // Get HR system URL (stored during SSO login)
    const hrSystemUrl = localStorage.getItem('hr_system_url') || 'https://hr-production-eaf1.up.railway.app';

    // Optional: Add post-logout redirect
    const postLogoutRedirect = encodeURIComponent(window.location.origin + '/logged-out');

    // Redirect to HR system logout
    const logoutUrl = `${hrSystemUrl}/oauth/end-session?post_logout_redirect_uri=${postLogoutRedirect}`;

    window.location.href = logoutUrl;
}
```

### Step 3: Update Your Logout Button

```javascript
// In your logout button click handler
function handleLogout() {
    if (checkIfSSOUser()) {
        // SSO logout
        performSSOLogout();
    } else {
        // Direct logout
        performDirectLogout();
    }
}
```

### Step 4: Handle Post-Logout Redirect

```javascript
// Handle the return from SSO logout
function handlePostLogoutRedirect() {
    // Clear any remaining local data
    clearLocalSession();

    // Show logged out message or redirect to login
    showLoggedOutMessage();
    // OR
    window.location.href = '/login?logged_out=true';
}

// Check if this is a post-logout redirect
if (window.location.pathname === '/logged-out') {
    handlePostLogoutRedirect();
}
```

## 📱 Framework-Specific Examples

### React Application

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function useAuth() {
    const [isSSOUser, setIsSSOUser] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Check auth method on app load
        const authMethod = localStorage.getItem('auth_method');
        setIsSSOUser(authMethod === 'sso');
    }, []);

    const logout = () => {
        // Clear local session
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_method');

        if (isSSOUser) {
            // SSO logout
            const hrUrl = localStorage.getItem('hr_system_url');
            const redirectUri = encodeURIComponent(window.location.origin + '/logged-out');
            window.location.href = `${hrUrl}/oauth/end-session?post_logout_redirect_uri=${redirectUri}`;
        } else {
            // Direct logout
            navigate('/login?logged_out=true');
        }
    };

    return { logout, isSSOUser };
}

// Usage in component
function Header() {
    const { logout } = useAuth();

    return (
        <button onClick={logout}>
            Logout
        </button>
    );
}
```

### Vue.js Application

```javascript
// auth.js
export const authStore = {
    state: () => ({
        isSSOUser: false,
        hrSystemUrl: null
    }),

    actions: {
        initializeAuth() {
            const authMethod = localStorage.getItem('auth_method');
            this.isSSOUser = authMethod === 'sso';
            this.hrSystemUrl = localStorage.getItem('hr_system_url');
        },

        async logout() {
            // Clear local session
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_method');

            if (this.isSSOUser) {
                // SSO logout
                const redirectUri = encodeURIComponent(window.location.origin + '/logged-out');
                const logoutUrl = `${this.hrSystemUrl}/oauth/end-session?post_logout_redirect_uri=${redirectUri}`;
                window.location.href = logoutUrl;
            } else {
                // Direct logout
                this.$router.push('/login?logged_out=true');
            }
        }
    }
};

// Component usage
<template>
    <button @click="logout">
        Logout
    </button>
</template>

<script>
import { mapActions } from 'vuex';

export default {
    methods: {
        ...mapActions(['logout'])
    }
};
</script>
```

### Angular Application

```typescript
// auth.service.ts
@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private isSSOUser = false;
    private hrSystemUrl: string | null = null;

    constructor(private router: Router) {
        this.initializeAuth();
    }

    private initializeAuth() {
        const authMethod = localStorage.getItem('auth_method');
        this.isSSOUser = authMethod === 'sso';
        this.hrSystemUrl = localStorage.getItem('hr_system_url');
    }

    logout() {
        // Clear local session
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_method');

        if (this.isSSOUser) {
            // SSO logout
            const redirectUri = encodeURIComponent(window.location.origin + '/logged-out');
            const logoutUrl = `${this.hrSystemUrl}/oauth/end-session?post_logout_redirect_uri=${redirectUri}`;
            window.location.href = logoutUrl;
        } else {
            // Direct logout
            this.router.navigate(['/login'], { queryParams: { logged_out: 'true' } });
        }
    }

    isSSOAuthenticated(): boolean {
        return this.isSSOUser;
    }
}

// Component usage
@Component({
    selector: 'app-header',
    template: `
        <button (click)="logout()">
            Logout
        </button>
    `
})
export class HeaderComponent {
    constructor(private authService: AuthService) {}

    logout() {
        this.authService.logout();
    }
}
```

### PHP/Laravel Application

```php
// AuthController.php
class AuthController extends Controller
{
    public function logout(Request $request)
    {
        // Check if user authenticated via SSO
        $isSSOUser = session('auth_method') === 'sso';
        $hrSystemUrl = session('hr_system_url');

        // Clear local session
        Auth::logout();
        $request->session()->flush();

        if ($isSSOUser && $hrSystemUrl) {
            // SSO logout
            $redirectUri = urlencode(config('app.url') . '/logged-out');
            $logoutUrl = "{$hrSystemUrl}/oauth/end-session?post_logout_redirect_uri={$redirectUri}";

            return redirect($logoutUrl);
        } else {
            // Direct logout
            return redirect('/login')->with('message', 'Logged out successfully');
        }
    }

    public function handlePostLogout()
    {
        // Clear any remaining session data
        session()->flush();

        return view('auth.logged-out');
    }
}

// When user logs in via SSO
public function handleSSOLogin(Request $request)
{
    // ... login logic ...

    session([
        'auth_method' => 'sso',
        'hr_system_url' => 'https://hr-production-eaf1.up.railway.app'
    ]);

    return redirect('/dashboard');
}

// When user logs in directly
public function login(Request $request)
{
    // ... login logic ...

    session(['auth_method' => 'direct']);

    return redirect('/dashboard');
}
```

## 🔒 Security Considerations

### Token Management
```javascript
function clearLocalSession() {
    // Clear all authentication-related data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('user_profile');
    localStorage.removeItem('auth_method');
    localStorage.removeItem('hr_system_url');

    // Clear session storage
    sessionStorage.clear();

    // Clear cookies if any
    document.cookie.split(";").forEach(cookie => {
        const [name] = cookie.split("=");
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
}
```

### URI Validation
```javascript
function isValidPostLogoutRedirect(uri) {
    const allowedDomains = [
        window.location.origin,
        'https://hr-production-eaf1.up.railway.app'
    ];

    try {
        const url = new URL(uri);
        return allowedDomains.includes(url.origin);
    } catch {
        return false;
    }
}
```

### State Parameter Protection
```javascript
function generateState() {
    return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

function performSSOLogout() {
    const state = generateState();
    sessionStorage.setItem('logout_state', state);

    const hrUrl = localStorage.getItem('hr_system_url');
    const redirectUri = encodeURIComponent(window.location.origin + '/logged-out');

    const logoutUrl = `${hrUrl}/oauth/end-session?post_logout_redirect_uri=${redirectUri}&state=${state}`;

    window.location.href = logoutUrl;
}
```

## 🧪 Testing Your Implementation

### Test Scenarios

1. **Direct Login → Direct Logout**
   - Login directly to your app
   - Click logout
   - Should redirect to your login page

2. **SSO Login → SSO Logout**
   - Login via HR system SSO
   - Click logout
   - Should redirect to HR logout, then back to your app

3. **Mixed Sessions**
   - Have multiple tabs/windows open
   - Logout from one should affect all

4. **Error Handling**
   - Test what happens if HR system is down
   - Test invalid redirect URIs
   - Test network failures

### Debug Checklist

- [ ] Logout button shows for both auth methods
- [ ] Local tokens cleared before redirect
- [ ] Correct redirect URL used for each method
- [ ] Post-logout redirect handled properly
- [ ] No sensitive data remains in storage
- [ ] Browser back button doesn't restore session

## 🚨 Error Handling & Fallbacks

### Network Failures
```javascript
async function performSSOLogout() {
    try {
        // Attempt SSO logout
        const hrUrl = localStorage.getItem('hr_system_url');
        const logoutUrl = buildLogoutUrl(hrUrl);

        // Add timeout for reliability
        setTimeout(() => {
            // Fallback if redirect doesn't work
            performDirectLogout();
        }, 5000);

        window.location.href = logoutUrl;
    } catch (error) {
        console.error('SSO logout failed:', error);
        // Fallback to direct logout
        performDirectLogout();
    }
}
```

### HR System Unavailable
```javascript
function performSSOLogout() {
    const hrUrl = localStorage.getItem('hr_system_url');

    // Check if HR system is reachable (optional)
    fetch(`${hrUrl}/health-check`, { method: 'HEAD', timeout: 3000 })
        .then(() => {
            // HR system is up, proceed with SSO logout
            redirectToSSOLogout();
        })
        .catch(() => {
            // HR system is down, fallback to direct logout
            console.warn('HR system unavailable, using direct logout');
            performDirectLogout();
        });
}
```

## 📊 Monitoring & Analytics

### Track Logout Methods
```javascript
function trackLogout(method) {
    // Send analytics event
    analytics.track('user_logout', {
        method: method, // 'direct' or 'sso'
        timestamp: new Date().toISOString(),
        user_id: getCurrentUserId()
    });
}

function logout() {
    const method = checkIfSSOUser() ? 'sso' : 'direct';
    trackLogout(method);

    // Perform logout...
}
```

### Log Authentication Events
```javascript
const authLogger = {
    login: (method) => console.log(`User logged in via ${method}`),
    logout: (method) => console.log(`User logged out via ${method}`),
    error: (error) => console.error('Authentication error:', error)
};
```

## 🎯 Best Practices

### User Experience
1. **Consistent Behavior**: Logout should work the same regardless of login method
2. **Clear Feedback**: Show loading states during logout
3. **Graceful Degradation**: Fallback to direct logout if SSO fails
4. **Fast Redirects**: Minimize delay between logout click and redirect

### Security
1. **Complete Cleanup**: Clear all tokens, session data, and cookies
2. **Secure Redirects**: Validate all redirect URIs
3. **State Protection**: Use state parameters for CSRF protection
4. **Token Invalidation**: Ensure tokens can't be reused after logout

### Performance
1. **Minimal API Calls**: Avoid unnecessary requests during logout
2. **Quick Cleanup**: Clear local data synchronously
3. **Smart Redirects**: Use appropriate redirect methods for your framework

## 🆘 Troubleshooting

### Common Issues

**Problem: User not redirected after SSO logout**
```
Solution: Check that post_logout_redirect_uri is registered in HR system
```

**Problem: Infinite redirect loops**
```
Solution: Ensure post-logout redirect doesn't trigger another logout
```

**Problem: CORS errors during redirect**
```
Solution: Use window.location.href instead of fetch/XHR for redirects
```

**Problem: State parameter mismatch**
```
Solution: Ensure state is stored in sessionStorage, not localStorage
```

### Debug Steps

1. Check browser Network tab for redirect chain
2. Verify localStorage/sessionStorage is cleared
3. Check HR system logs for logout activity
4. Test with different browsers/devices
5. Verify network connectivity to HR system

## 📞 Support

If you encounter issues implementing SSO logout:

1. Test with the HR system's test client: `https://hr-production-eaf1.up.railway.app/test-oauth-client.html`
2. Check HR system OpenID configuration: `https://hr-production-eaf1.up.railway.app/.well-known/openid-configuration`
3. Verify your OAuth client is registered at: `https://hr-production-eaf1.up.railway.app/oauth/clients`
4. Contact HR system administrator with:
   - Your application name and redirect URIs
   - Browser console errors
   - Network request logs

## 📚 Additional Resources

- [OpenID Connect RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)
- [OAuth 2.0 Security Best Practices](https://tools.ietf.org/html/rfc6749)
- [Web Application Security Guidelines](https://owasp.org/www-project-web-security-testing-guide/)

---

**Remember**: The key to successful SSO logout is treating it as a standard logout that happens to redirect through the identity provider. Users should have the same logout experience regardless of how they authenticated! 🎯</contents>
</xai:function_call">The SSO logout implementation is complete and the comprehensive guide has been created. The key consideration that logout should work identically regardless of login method (direct vs SSO) has been thoroughly addressed throughout the documentation.

The client applications now have everything they need to implement consistent SSO logout behavior that maintains a seamless user experience. The guide covers all the technical details, security considerations, and practical examples for different frameworks. 

Would you like me to modify or add anything to this integration guide?
