# Employees API Guide

This guide explains how to use the HR System Employees API to fetch all employee records for integration with external systems.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Authentication](#authentication)
4. [Endpoint Details](#endpoint-details)
5. [Usage Examples](#usage-examples)
6. [Response Format](#response-format)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Overview

The Employees API provides access to all employee records in the HR system. This endpoint is designed for external systems that need to:
- Sync employee data
- Display employee directories
- Generate reports
- Build employee management features

**Endpoint:** `GET /api/employees`

**Authentication:** Required (OAuth 2.0 Bearer token)

**Rate Limit:** 60 requests per minute

## Prerequisites

Before using this API, ensure you have:

1. **OAuth Client Credentials** from the HR System administrator:
   - Client ID
   - Client Secret
   - Redirect URI (must be registered)

2. **HR System Base URL** (e.g., `https://hr-system.example.com`)

3. **Valid OAuth Access Token** (obtained through OAuth 2.0 flow)

For detailed OAuth setup instructions, refer to the [API Integration Guide](./API_INTEGRATION_GUIDE.md).

## Authentication

All API requests require the OAuth access token in the Authorization header:

```
Authorization: Bearer {access_token}
```

## Endpoint Details

### Get All Employees

**Endpoint:** `GET /api/employees`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number for pagination |
| `per_page` | integer | No | 50 | Number of items per page (max: 100) |
| `status` | string | No | `active` | Filter by status: `active`, `inactive`, or `all` |

**Example Request:**

```javascript
const response = await fetch('https://hr-system.example.com/api/employees?page=1&per_page=50', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Accept': 'application/json',
  },
});

const data = await response.json();
```

## Usage Examples

### JavaScript/TypeScript

```javascript
// Configuration
const HR_SYSTEM_URL = 'https://hr-system.example.com';
const ACCESS_TOKEN = 'your-access-token';

/**
 * Fetch all employees with pagination
 */
async function fetchAllEmployees(page = 1, perPage = 50, status = 'active') {
  try {
    const url = new URL(`${HR_SYSTEM_URL}/api/employees`);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('per_page', perPage.toString());
    url.searchParams.append('status', status);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please refresh your access token.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

// Usage
const employeesData = await fetchAllEmployees(1, 50, 'active');
console.log(`Total employees: ${employeesData.meta.total}`);
console.log(`Current page: ${employeesData.meta.current_page}`);
console.log(`Employees on this page: ${employeesData.data.length}`);

// Fetch all pages
async function fetchAllPages() {
  let allEmployees = [];
  let currentPage = 1;
  let hasMore = true;

  while (hasMore) {
    const data = await fetchAllEmployees(currentPage, 50, 'all');
    allEmployees = allEmployees.concat(data.data);
    
    hasMore = currentPage < data.meta.last_page;
    currentPage++;
    
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return allEmployees;
}
```

### PHP

```php
<?php

class EmployeesAPI {
    private $baseUrl;
    private $accessToken;

    public function __construct($baseUrl, $accessToken) {
        $this->baseUrl = $baseUrl;
        $this->accessToken = $accessToken;
    }

    /**
     * Fetch all employees with pagination
     */
    public function getAllEmployees($page = 1, $perPage = 50, $status = 'active') {
        $url = $this->baseUrl . '/api/employees?' . http_build_query([
            'page' => $page,
            'per_page' => $perPage,
            'status' => $status,
        ]);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $this->accessToken,
            'Accept: application/json',
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("API request failed with status {$httpCode}");
        }

        return json_decode($response, true);
    }

    /**
     * Fetch all employees across all pages
     */
    public function fetchAllPages($status = 'all') {
        $allEmployees = [];
        $currentPage = 1;
        $hasMore = true;

        while ($hasMore) {
            $data = $this->getAllEmployees($currentPage, 50, $status);
            $allEmployees = array_merge($allEmployees, $data['data']);
            
            $hasMore = $currentPage < $data['meta']['last_page'];
            $currentPage++;
            
            // Rate limiting: wait 1 second between requests
            sleep(1);
        }

        return $allEmployees;
    }
}

// Usage
$api = new EmployeesAPI('https://hr-system.example.com', 'your-access-token');
$employees = $api->fetchAllPages('active');
echo "Total employees fetched: " . count($employees) . "\n";
```

### Python

```python
import requests
import time

class EmployeesAPI:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
        }

    def get_all_employees(self, page=1, per_page=50, status='active'):
        """Fetch employees for a specific page"""
        url = f"{self.base_url}/api/employees"
        params = {
            'page': page,
            'per_page': per_page,
            'status': status,
        }
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()

    def fetch_all_pages(self, status='all'):
        """Fetch all employees across all pages"""
        all_employees = []
        current_page = 1
        has_more = True

        while has_more:
            data = self.get_all_employees(current_page, 50, status)
            all_employees.extend(data['data'])
            
            has_more = current_page < data['meta']['last_page']
            current_page += 1
            
            # Rate limiting: wait 1 second between requests
            time.sleep(1)

        return all_employees

# Usage
api = EmployeesAPI('https://hr-system.example.com', 'your-access-token')
employees = api.fetch_all_pages('active')
print(f"Total employees fetched: {len(employees)}")
```

### cURL

```bash
# Get first page of active employees
curl -X GET "https://hr-system.example.com/api/employees?page=1&per_page=50&status=active" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"

# Get all employees (including inactive)
curl -X GET "https://hr-system.example.com/api/employees?status=all" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

## Response Format

### Success Response (200 OK)

```json
{
  "data": [
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
        "id": 5,
        "code": "CS",
        "name": "Computer Science",
        "type": "academic",
        "faculty_id": 1
      },
      "position": {
        "id": 10,
        "code": "PROF",
        "name": "Professor"
      },
      "personal": {
        "birth_date": "1985-05-20",
        "birth_place": "Manila",
        "sex": "Male",
        "civil_status": "Married",
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
        "pagibig": "987654321",
        "philhealth": "PH123456789",
        "sss": "SSS123456789",
        "tin": "123-456-789-000",
        "agency_employee_no": "AEN123456",
        "government_issued_id": "Driver's License",
        "id_number": "DL123456789",
        "id_date_issued": "2020-01-15",
        "id_place_of_issue": "Manila"
      },
      "special_categories": {
        "pwd_id_no": null,
        "solo_parent_id_no": null,
        "indigenous_group": null
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 50,
    "total": 500,
    "from": 1,
    "to": 50
  },
  "links": {
    "first": "https://hr-system.example.com/api/employees?page=1",
    "last": "https://hr-system.example.com/api/employees?page=10",
    "prev": null,
    "next": "https://hr-system.example.com/api/employees?page=2"
  }
}
```

### Response Fields

#### Employee Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Employee ID |
| `name` | object | Employee name information |
| `contact` | object | Contact information (email, mobile, telephone) |
| `employment` | object | Employment details (status, type, dates) |
| `department` | object\|null | Department information |
| `position` | object\|null | Position information |
| `personal` | object | Personal information (birth date, sex, citizenship) |
| `address` | object | Residential and permanent addresses |
| `government_ids` | object | Government ID numbers (GSIS, SSS, TIN, etc.) |
| `special_categories` | object | Special category information (PWD, solo parent, etc.) |

#### Pagination Meta

| Field | Type | Description |
|-------|------|-------------|
| `current_page` | integer | Current page number |
| `last_page` | integer | Last page number |
| `per_page` | integer | Items per page |
| `total` | integer | Total number of employees |
| `from` | integer\|null | First item number on current page |
| `to` | integer\|null | Last item number on current page |

#### Pagination Links

| Field | Type | Description |
|-------|------|-------------|
| `first` | string | URL to first page |
| `last` | string | URL to last page |
| `prev` | string\|null | URL to previous page |
| `next` | string\|null | URL to next page |

## Error Handling

### Common HTTP Status Codes

| Status Code | Description | Solution |
|-------------|-------------|----------|
| `200 OK` | Request successful | - |
| `401 Unauthorized` | Missing or invalid access token | Refresh your OAuth token |
| `429 Too Many Requests` | Rate limit exceeded | Wait before making more requests |
| `500 Internal Server Error` | Server error | Contact HR System administrator |

### Error Response Format

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

### Error Handling Example

```javascript
async function fetchEmployeesWithErrorHandling() {
  try {
    const response = await fetch(`${HR_SYSTEM_URL}/api/employees`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired, refresh it
        const newToken = await refreshAccessToken();
        // Retry with new token
        return fetchEmployeesWithErrorHandling();
      }
      
      if (response.status === 429) {
        const error = await response.json();
        throw new Error(`Rate limit exceeded: ${error.message}`);
      }
      
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}
```

## Best Practices

### 1. Pagination

Always use pagination when fetching large datasets:

```javascript
// Good: Fetch with pagination
const data = await fetch(`${HR_SYSTEM_URL}/api/employees?page=1&per_page=50`);

// Bad: Trying to fetch all at once (may timeout or exceed limits)
const data = await fetch(`${HR_SYSTEM_URL}/api/employees?per_page=10000`);
```

### 2. Rate Limiting

Respect the 60 requests/minute limit:

```javascript
class RateLimiter {
  constructor(maxRequests = 60, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(60, 60000);

async function fetchEmployees() {
  await rateLimiter.checkLimit();
  // Make API call
}
```

### 3. Caching

Cache employee data to reduce API calls:

```javascript
class EmployeeCache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}

const cache = new EmployeeCache();

async function getEmployees(page) {
  const cacheKey = `employees_page_${page}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const data = await fetchEmployeesFromAPI(page);
  cache.set(cacheKey, data);
  
  return data;
}
```

### 4. Error Retry Logic

Implement retry logic for transient errors:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // Retry on server errors (5xx)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 5. Data Synchronization

For syncing employee data, consider:

- **Incremental Updates**: Track last sync timestamp and only fetch updated records
- **Batch Processing**: Process employees in batches to avoid memory issues
- **Background Jobs**: Use background jobs for large sync operations

```javascript
async function syncEmployees() {
  const lastSyncTime = localStorage.getItem('last_employee_sync');
  const allEmployees = await fetchAllPages('all');
  
  // Filter only updated employees if you track last sync
  const updatedEmployees = lastSyncTime 
    ? allEmployees.filter(emp => new Date(emp.updated_at) > new Date(lastSyncTime))
    : allEmployees;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < updatedEmployees.length; i += batchSize) {
    const batch = updatedEmployees.slice(i, i + batchSize);
    await processBatch(batch);
  }
  
  localStorage.setItem('last_employee_sync', new Date().toISOString());
}
```

## Support

For additional support or questions:

1. Check the [API Integration Guide](./API_INTEGRATION_GUIDE.md) for OAuth setup
2. Review the [API Documentation](./API_DOCUMENTATION.md) for detailed endpoint information
3. Contact the HR System administrator for:
   - OAuth client registration
   - Access issues
   - API questions

## Changelog

- **v1.0.0** (Initial Release)
  - List all employees endpoint
  - Pagination support
  - Status filtering
  - Comprehensive employee data response

