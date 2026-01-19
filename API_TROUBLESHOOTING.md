# API Troubleshooting Guide

## Error: "Employee endpoint not available. The /api/employees/me endpoint may not exist"

This error typically indicates an **authentication issue**, not that the endpoint doesn't exist. The endpoint exists and is registered, but the request is failing authentication.

## Common Causes & Solutions

### 1. Missing or Invalid Bearer Token

**Symptom:** External system gets 401 Unauthorized

**Check:**
- Is the `Authorization` header being sent?
- Is the token format correct: `Bearer {token}` (note the space after "Bearer")
- Is the token valid and not expired?

**Solution:**
```javascript
// Correct format
headers: {
  'Authorization': `Bearer ${accessToken}`,  // ✅ Correct
  'Accept': 'application/json'
}

// Wrong formats
'Authorization': accessToken  // ❌ Missing "Bearer "
'Authorization': `Bearer${accessToken}`  // ❌ Missing space
'Authorization': `bearer ${accessToken}`  // ❌ Should be "Bearer" (capital B)
```

### 2. Token Not Obtained from OAuth Flow

**Symptom:** Using a token that wasn't properly obtained from OAuth

**Check:**
- Did the OAuth flow complete successfully?
- Was the authorization code exchanged for an access token?
- Is the token stored correctly?

**Solution:**
Ensure you complete the full OAuth flow:
1. Redirect to `/oauth/authorize`
2. User authorizes
3. Receive authorization code
4. Exchange code for token at `/oauth/token`
5. Use the received `access_token` in API calls

### 3. User Has No Employee Record

**Symptom:** 404 error with message "No employee record found for this user"

**Check:**
- Does the authenticated user have an `employee_id` in the `users` table?
- Is the user linked to an employee record?

**Solution:**
- Verify the user has an `employee_id` set in the database
- Link the user to an employee record if missing

### 4. Employee Status is Not Active

**Symptom:** 404 error with message "Employee not found or is inactive"

**Check:**
- Is the employee's `status` field set to `'active'`?
- Only active employees are returned by the API

**Solution:**
- Update the employee status to `'active'` in the database
- Or use a different endpoint that doesn't filter by status

### 5. CORS Issues (Browser-based requests)

**Symptom:** CORS error in browser console, request fails before reaching server

**Check:**
- Is the request coming from a browser?
- Are CORS headers configured on the HR System?

**Solution:**
- Contact HR System administrator to add your domain to CORS whitelist
- Or make requests from server-side (not browser)

### 6. Route Not Accessible (Wrong URL)

**Symptom:** 404 Not Found

**Check:**
- Is the base URL correct?
- Is the endpoint path correct: `/api/employees/me` (not `/api/api/employees/me`)

**Solution:**
Verify the full URL:
```
✅ Correct: https://hr-system.example.com/api/employees/me
❌ Wrong:   https://hr-system.example.com/api/api/employees/me
❌ Wrong:   https://hr-system.example.com/employees/me
```

## How to Debug

### Step 1: Verify Endpoint Exists

Test with curl (replace with your actual token):

```bash
curl -X GET "https://your-hr-system.com/api/employees/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json" \
  -v
```

**Expected responses:**
- **200 OK**: Success, employee data returned
- **401 Unauthorized**: Authentication failed (check token)
- **404 Not Found**: Employee not found or inactive

### Step 2: Check Token Validity

Test the token with the OAuth userinfo endpoint:

```bash
curl -X GET "https://your-hr-system.com/oauth/userinfo" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

If this returns 401, your token is invalid or expired.

### Step 3: Verify User Has Employee Record

Check the database:
```sql
SELECT u.id, u.email, u.employee_id, e.id as emp_id, e.status
FROM users u
LEFT JOIN employees e ON u.employee_id = e.id
WHERE u.id = YOUR_USER_ID;
```

The user should have:
- `employee_id` set (not NULL)
- Employee record exists
- Employee `status` = 'active'

### Step 4: Check Server Logs

Check Laravel logs for detailed error messages:
```bash
tail -f storage/logs/laravel.log
```

Look for:
- Authentication errors
- Authorization failures
- Missing employee records

## Testing Checklist

Use this checklist to verify your integration:

- [ ] OAuth authorization URL is correct
- [ ] OAuth redirect URI matches exactly (including protocol, domain, path)
- [ ] Authorization code is received after user login
- [ ] Authorization code is exchanged for access token successfully
- [ ] Access token is stored correctly
- [ ] API request includes `Authorization: Bearer {token}` header
- [ ] API request URL is correct: `/api/employees/me`
- [ ] User has `employee_id` set in database
- [ ] Employee record exists and status is 'active'
- [ ] No CORS errors in browser console (if browser-based)
- [ ] Server logs show no errors

## Quick Test Script

Use this JavaScript snippet to test the API:

```javascript
async function testEmployeeAPI() {
  const HR_SYSTEM_URL = 'https://your-hr-system.com';
  const accessToken = 'YOUR_ACCESS_TOKEN';
  
  console.log('Testing OAuth UserInfo endpoint...');
  try {
    const userInfoResponse = await fetch(`${HR_SYSTEM_URL}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      console.log('✅ Token is valid');
      console.log('User Info:', userInfo);
      console.log('Employee ID:', userInfo.employee_id);
    } else {
      console.error('❌ Token is invalid or expired');
      console.error('Status:', userInfoResponse.status);
      const error = await userInfoResponse.json();
      console.error('Error:', error);
      return;
    }
  } catch (error) {
    console.error('❌ Error testing userinfo:', error);
    return;
  }
  
  console.log('\nTesting Employee API endpoint...');
  try {
    const employeeResponse = await fetch(`${HR_SYSTEM_URL}/api/employees/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });
    
    if (employeeResponse.ok) {
      const employee = await employeeResponse.json();
      console.log('✅ Employee data retrieved successfully');
      console.log('Employee:', employee);
    } else {
      console.error('❌ Failed to retrieve employee data');
      console.error('Status:', employeeResponse.status);
      const error = await employeeResponse.json();
      console.error('Error:', error);
      
      if (employeeResponse.status === 404) {
        if (error.message?.includes('employee record')) {
          console.error('\n💡 Solution: User does not have an employee_id set');
        } else if (error.message?.includes('inactive')) {
          console.error('\n💡 Solution: Employee status is not "active"');
        }
      } else if (employeeResponse.status === 401) {
        console.error('\n💡 Solution: Token is invalid or expired. Re-authenticate.');
      }
    }
  } catch (error) {
    console.error('❌ Error testing employee API:', error);
  }
}

// Run the test
testEmployeeAPI();
```

## Common Error Messages & Solutions

| Error Message | HTTP Status | Cause | Solution |
|--------------|-------------|-------|----------|
| "Unauthenticated" | 401 | Missing/invalid token | Check Authorization header, re-authenticate |
| "No employee record found for this user" | 404 | User has no employee_id | Link user to employee record |
| "Employee not found or is inactive" | 404 | Employee status ≠ 'active' | Set employee status to 'active' |
| "You do not have permission" | 403 | Insufficient permissions | Check user role/permissions |
| "Rate limit exceeded" | 429 | Too many requests | Wait and retry, implement caching |

## Still Having Issues?

If you've checked all the above and still have issues:

1. **Verify the endpoint exists:**
   ```bash
   php artisan route:list --path=api/employees
   ```
   Should show: `api/employees/me`

2. **Check if API routes are registered:**
   - Verify `bootstrap/app.php` includes: `api: __DIR__.'/../routes/api.php'`
   - Verify `routes/api.php` file exists

3. **Test with a known working token:**
   - Use a token from a successful OAuth flow
   - Test with Postman or curl first

4. **Contact HR System Administrator:**
   - Provide the exact error message
   - Include the HTTP status code
   - Share the request headers (without the token)
   - Include relevant logs

## Additional Resources

- [API Documentation](./API_DOCUMENTATION.md) - Complete API reference
- [Integration Guide](./API_INTEGRATION_GUIDE.md) - Step-by-step integration instructions

