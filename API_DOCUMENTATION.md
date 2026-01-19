# Employee Records API Documentation

## Overview

This API provides secure access to employee records, departments, and faculties for external systems that integrate via OAuth 2.0. The API is designed to support form auto-filling functionality where employee data can be automatically populated in external systems.

## Authentication

All API endpoints require OAuth 2.0 Bearer token authentication. The token must be included in the `Authorization` header:

```
Authorization: Bearer {your_oauth_token}
```

The OAuth token contains the `employee_id` claim, which can be used to identify the authenticated employee.

## Base URL

All API endpoints are prefixed with `/api`:

```
https://your-domain.com/api/...
```

## Rate Limiting

API endpoints are rate-limited to **60 requests per minute** per authenticated user. Exceeding this limit will result in a `429 Too Many Requests` response.

## Endpoints

### Employee Endpoints

#### Get Current Employee

Returns the employee record associated with the authenticated user.

**Endpoint:** `GET /api/employees/me`

**Authentication:** Required (OAuth Bearer token)

**Response:**
```json
{
  "id": "EMP001",
  "name": {
    "surname": "Doe",
    "first_name": "John",
    "middle_name": "Michael",
    "name_extension": "",
    "full_name": "John Michael Doe"
  },
  "contact": {
    "email": "john.doe@example.com",
    "mobile": "+639123456789",
    "telephone": "02-1234-5678"
  },
  "employment": {
    "status": "active",
    "employment_status": "Regular",
    "employee_type": "Teaching",
    "date_hired": "2020-01-15",
    "date_regularized": "2021-01-15"
  },
  "department": {
    "id": 1,
    "code": "CS",
    "name": "Computer Science",
    "type": "academic",
    "faculty_id": 1
  },
  "position": {
    "id": 5,
    "code": "PROF",
    "name": "Professor"
  },
  "personal": {
    "birth_date": "1990-05-20",
    "birth_place": "Manila",
    "sex": "Male",
    "civil_status": "Single",
    "citizenship": "Filipino",
    "dual_citizenship": false,
    "citizenship_type": null
  },
  "address": {
    "residential": {
      "house_no": "123",
      "street": "Main Street",
      "subdivision": "Green Valley",
      "barangay": "Barangay 1",
      "city": "Quezon City",
      "province": "Metro Manila",
      "zip_code": "1100"
    },
    "permanent": {
      "house_no": "123",
      "street": "Main Street",
      "subdivision": "Green Valley",
      "barangay": "Barangay 1",
      "city": "Quezon City",
      "province": "Metro Manila",
      "zip_code": "1100"
    }
  },
  "government_ids": {
    "gsis": "123456789",
    "pagibig": "123456789012",
    "philhealth": "12-345678901-2",
    "sss": "12-3456789-0",
    "tin": "123-456-789-000",
    "agency_employee_no": "AGY-001",
    "government_issued_id": "Driver's License",
    "id_number": "D01-23-456789",
    "id_date_issued": "2020-01-01",
    "id_place_of_issue": "LTO Manila"
  },
  "special_categories": {
    "pwd_id_no": null,
    "solo_parent_id_no": null,
    "indigenous_group": null
  }
}
```

#### Get Employee by ID

Returns a specific employee record by employee ID. Access is restricted based on the user's role and permissions.

**Endpoint:** `GET /api/employees/{employee_id}`

**Parameters:**
- `employee_id` (path, required): The employee ID (alphanumeric, e.g., "EMP001")

**Authentication:** Required (OAuth Bearer token)

**Authorization:** 
- Users can always access their own employee record
- Super Admins/Admins can access all employee records
- Deans can access employees in their faculty
- Department Heads can access employees in their department
- Regular employees can only access their own record

**Response:** Same format as `/api/employees/me`

**Error Responses:**
- `403 Forbidden`: User does not have permission to view this employee
- `404 Not Found`: Employee not found or inactive

### Department Endpoints

#### List All Departments

Returns a list of all active departments/offices.

**Endpoint:** `GET /api/departments`

**Query Parameters:**
- `type` (optional): Filter by department type (`academic` or `administrative`)

**Authentication:** Required (OAuth Bearer token)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "CS",
      "name": "Computer Science",
      "type": "academic",
      "description": "Computer Science Department",
      "faculty": {
        "id": 1,
        "code": "CIT",
        "name": "College of Information Technology"
      }
    },
    {
      "id": 2,
      "code": "HR",
      "name": "Human Resources",
      "type": "administrative",
      "description": "Human Resources Office",
      "faculty": null
    }
  ],
  "count": 2
}
```

#### Get Department by ID

Returns detailed information about a specific department.

**Endpoint:** `GET /api/departments/{id}`

**Parameters:**
- `id` (path, required): The department ID (numeric)

**Authentication:** Required (OAuth Bearer token)

**Response:**
```json
{
  "id": 1,
  "code": "CS",
  "name": "Computer Science",
  "type": "academic",
  "description": "Computer Science Department",
  "faculty": {
    "id": 1,
    "code": "CIT",
    "name": "College of Information Technology",
    "type": "academic",
    "description": "College of Information Technology"
  }
}
```

### Faculty Endpoints

#### List All Faculties

Returns a list of all active faculties.

**Endpoint:** `GET /api/faculties`

**Query Parameters:**
- `type` (optional): Filter by faculty type
- `status` (optional): Filter by status (default: `active`)

**Authentication:** Required (OAuth Bearer token)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "code": "CIT",
      "name": "College of Information Technology",
      "type": "academic",
      "description": "College of Information Technology",
      "status": "active"
    }
  ],
  "count": 1
}
```

#### Get Faculty by ID

Returns detailed information about a specific faculty.

**Endpoint:** `GET /api/faculties/{id}`

**Parameters:**
- `id` (path, required): The faculty ID (numeric)

**Authentication:** Required (OAuth Bearer token)

**Response:**
```json
{
  "id": 1,
  "code": "CIT",
  "name": "College of Information Technology",
  "type": "academic",
  "description": "College of Information Technology",
  "status": "active"
}
```

## Security Features

### Authentication
- All endpoints require OAuth 2.0 Bearer token authentication
- Tokens are validated on every request
- Invalid or expired tokens result in `401 Unauthorized` responses

### Authorization
- Role-based access control (RBAC) is enforced
- Users can only access employee records they have permission to view
- Access is automatically scoped based on:
  - User's role (Super Admin, Admin, Dean, Department Head, Employee)
  - User's department/faculty affiliation
  - Employee's status (only active employees are returned)

### Rate Limiting
- 60 requests per minute per authenticated user
- Prevents API abuse and ensures fair usage

### Data Privacy
- Only active employees are returned to external systems
- Sensitive information is filtered based on permissions
- All access attempts are logged for audit purposes

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Common Error Codes

- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User does not have permission to access the resource
- `404 Not Found`: Resource not found or inactive
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Usage Example

### JavaScript/Fetch Example

```javascript
// After OAuth login, you receive a token
const token = 'your_oauth_token_here';
const employeeId = 'EMP001'; // From OAuth token claims

// Get employee data
fetch(`https://your-domain.com/api/employees/${employeeId}`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  // Auto-fill form with employee data
  document.getElementById('first_name').value = data.name.first_name;
  document.getElementById('last_name').value = data.name.surname;
  document.getElementById('email').value = data.contact.email;
  // ... etc
})
.catch(error => {
  console.error('Error fetching employee data:', error);
});
```

### cURL Example

```bash
# Get current employee
curl -X GET "https://your-domain.com/api/employees/me" \
  -H "Authorization: Bearer your_oauth_token_here" \
  -H "Accept: application/json"

# Get specific employee
curl -X GET "https://your-domain.com/api/employees/EMP001" \
  -H "Authorization: Bearer your_oauth_token_here" \
  -H "Accept: application/json"

# Get all departments
curl -X GET "https://your-domain.com/api/departments" \
  -H "Authorization: Bearer your_oauth_token_here" \
  -H "Accept: application/json"

# Get departments filtered by type
curl -X GET "https://your-domain.com/api/departments?type=academic" \
  -H "Authorization: Bearer your_oauth_token_here" \
  -H "Accept: application/json"
```

## Integration Flow

1. **OAuth Login**: External system redirects user to HR system OAuth login
2. **Token Exchange**: After authentication, external system receives OAuth token with `employee_id` claim
3. **API Call**: External system calls API endpoints using the Bearer token
4. **Form Auto-fill**: Employee data is used to automatically populate forms in the external system

## Notes

- All dates are returned in `Y-m-d` format (ISO 8601 date format)
- Employee IDs are alphanumeric strings (e.g., "EMP001")
- Department and Faculty IDs are numeric
- Only active employees are returned to external systems
- Deleted departments/faculties are excluded from results
- The API follows RESTful conventions

