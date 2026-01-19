# API Data Synchronization Strategy

This guide explains how to properly synchronize data from the HR System API, including handling deleted records (employees, departments, and faculties).

## Table of Contents

1. [Overview](#overview)
2. [The Deletion Problem](#the-deletion-problem)
3. [Solution: Two Approaches](#solution-two-approaches)
4. [Implementation Examples](#implementation-examples)
5. [Best Practices](#best-practices)
6. [Complete Sync Examples](#complete-sync-examples)

## Overview

When synchronizing data from the HR System API, external systems need to handle:
- **New records**: Employees/departments/faculties that don't exist locally
- **Updated records**: Existing records that have changed
- **Deleted records**: Records that exist locally but no longer exist in HR system

The HR System uses **soft deletes**, meaning deleted records are marked with a `deleted_at` timestamp but not permanently removed from the database.

## The Deletion Problem

### Scenario

```
Initial State:
- HR System: 50 employees
- External System: 50 employees ✅

After Deletion:
- HR System: 49 employees (1 deleted)
- External System: 50 employees ❌ (still has the deleted one)

Problem: External system doesn't know which employee was deleted!
```

### Why This Happens

By default, the API **excludes** soft-deleted records from responses. When an employee is deleted:
- HR system marks it as deleted (`deleted_at` is set)
- API doesn't return it in normal requests
- External system syncs and only gets 49 employees
- External system still has 50 employees locally
- **Result: Data mismatch!**

## Solution: Two Approaches

The HR System API provides two ways to handle deletions:

### Approach 1: Include Deleted Records (Recommended)

Use the `include_deleted=true` parameter to get all records including deleted ones, then check the `is_deleted` flag.

**Pros:**
- Explicit - you know exactly which records are deleted
- Can see deletion timestamp
- Works even if records are permanently deleted later

**Cons:**
- Slightly larger response (includes deleted records)

### Approach 2: Compare IDs (Fallback)

Fetch all active records and compare IDs with your local database to find missing ones.

**Pros:**
- Smaller response (only active records)
- Simple logic

**Cons:**
- Requires comparing all IDs
- Doesn't work if records are permanently deleted

## Implementation Examples

### Employees Sync

#### Approach 1: Using `include_deleted` Parameter

```javascript
async function syncEmployees() {
  // Fetch all employees including deleted ones
  const response = await fetch(
    'https://hr-system.example.com/api/employees?include_deleted=true&status=all',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  const hrEmployees = data.data;
  
  // Process each employee
  for (const emp of hrEmployees) {
    if (emp.is_deleted) {
      // Employee was deleted in HR system
      console.log(`Deleting employee ${emp.id} - deleted at ${emp.deleted_at}`);
      await database.delete('employees', emp.id);
    } else {
      // Employee exists - update or insert
      await database.upsert('employees', {
        id: emp.id,
        surname: emp.name.surname,
        first_name: emp.name.first_name,
        // ... other fields
        updated_at: new Date(),
      });
    }
  }
  
  console.log(`Sync complete: ${hrEmployees.length} employees processed`);
}
```

#### Approach 2: Compare IDs

```javascript
async function syncEmployees() {
  // Fetch all active employees
  const response = await fetch(
    'https://hr-system.example.com/api/employees?status=all',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  const hrEmployees = data.data;
  const hrEmployeeIds = hrEmployees.map(e => e.id);
  
  // Get all employees from local database
  const localEmployees = await database.getAll('employees');
  const localEmployeeIds = localEmployees.map(e => e.id);
  
  // Find employees that exist locally but NOT in HR system
  const deletedIds = localEmployeeIds.filter(id => !hrEmployeeIds.includes(id));
  
  // Delete those employees
  for (const id of deletedIds) {
    console.log(`Deleting employee ${id} - no longer exists in HR system`);
    await database.delete('employees', id);
  }
  
  // Update/insert remaining employees
  for (const emp of hrEmployees) {
    await database.upsert('employees', {
      id: emp.id,
      surname: emp.name.surname,
      first_name: emp.name.first_name,
      // ... other fields
      updated_at: new Date(),
    });
  }
  
  console.log(`Sync complete: ${hrEmployees.length} active, ${deletedIds.length} deleted`);
}
```

### Departments Sync

```javascript
async function syncDepartments() {
  // Fetch all departments including deleted ones
  const response = await fetch(
    'https://hr-system.example.com/api/departments?include_deleted=true',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  const departments = data.data;
  
  for (const dept of departments) {
    if (dept.is_deleted) {
      console.log(`Deleting department ${dept.id} - deleted at ${dept.deleted_at}`);
      await database.delete('departments', dept.id);
    } else {
      await database.upsert('departments', {
        id: dept.id,
        code: dept.code,
        name: dept.name,
        type: dept.type,
        description: dept.description,
        faculty_id: dept.faculty?.id || null,
        updated_at: new Date(),
      });
    }
  }
  
  console.log(`Sync complete: ${departments.length} departments processed`);
}
```

### Faculties Sync

```javascript
async function syncFaculties() {
  // Fetch all faculties including deleted ones
  const response = await fetch(
    'https://hr-system.example.com/api/faculties?include_deleted=true&status=all',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  const faculties = data.data;
  
  for (const faculty of faculties) {
    if (faculty.is_deleted) {
      console.log(`Deleting faculty ${faculty.id} - deleted at ${faculty.deleted_at}`);
      await database.delete('faculties', faculty.id);
    } else {
      await database.upsert('faculties', {
        id: faculty.id,
        code: faculty.code,
        name: faculty.name,
        type: faculty.type,
        description: faculty.description,
        status: faculty.status,
        updated_at: new Date(),
      });
    }
  }
  
  console.log(`Sync complete: ${faculties.length} faculties processed`);
}
```

## Best Practices

### 1. Always Handle Deletions

Never skip deletion handling. Your local database will accumulate stale data over time.

```javascript
// ❌ Bad: Only inserts/updates, never deletes
for (const emp of hrEmployees) {
  await database.upsert('employees', emp);
}

// ✅ Good: Handles deletions too
for (const emp of hrEmployees) {
  if (emp.is_deleted) {
    await database.delete('employees', emp.id);
  } else {
    await database.upsert('employees', emp);
  }
}
```

### 2. Use Transactions

Wrap sync operations in transactions to ensure data consistency.

```javascript
async function syncEmployees() {
  await database.transaction(async () => {
    // Fetch and process employees
    // If any error occurs, all changes are rolled back
  });
}
```

### 3. Handle Pagination

If you have many records, fetch all pages before processing.

```javascript
async function fetchAllPages(endpoint) {
  let allData = [];
  let currentPage = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(`${endpoint}&page=${currentPage}`);
    const data = await response.json();
    
    allData = allData.concat(data.data);
    hasMore = currentPage < data.meta.last_page;
    currentPage++;
    
    // Rate limiting: wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return allData;
}
```

### 4. Log Sync Operations

Keep logs of what was synced for debugging and auditing.

```javascript
const syncLog = {
  started_at: new Date(),
  employees_processed: 0,
  employees_deleted: 0,
  employees_updated: 0,
  employees_inserted: 0,
  errors: [],
};

// Log each operation
syncLog.employees_processed++;
if (emp.is_deleted) {
  syncLog.employees_deleted++;
} else if (exists) {
  syncLog.employees_updated++;
} else {
  syncLog.employees_inserted++;
}
```

### 5. Handle Errors Gracefully

Don't let one failed record stop the entire sync.

```javascript
for (const emp of hrEmployees) {
  try {
    if (emp.is_deleted) {
      await database.delete('employees', emp.id);
    } else {
      await database.upsert('employees', emp);
    }
  } catch (error) {
    console.error(`Error processing employee ${emp.id}:`, error);
    syncLog.errors.push({ employee_id: emp.id, error: error.message });
    // Continue with next employee
  }
}
```

## Complete Sync Examples

### PHP Example

```php
<?php

class HRSystemSync {
    private $baseUrl;
    private $accessToken;
    
    public function syncEmployees() {
        // Fetch all employees including deleted
        $response = $this->fetchAllPages('/api/employees?include_deleted=true&status=all');
        
        foreach ($response['data'] as $emp) {
            if ($emp['is_deleted']) {
                // Delete from local database
                DB::table('employees')->where('id', $emp['id'])->delete();
                echo "Deleted employee: {$emp['id']}\n";
            } else {
                // Update or insert
                DB::table('employees')->updateOrInsert(
                    ['id' => $emp['id']],
                    [
                        'surname' => $emp['name']['surname'],
                        'first_name' => $emp['name']['first_name'],
                        // ... other fields
                        'updated_at' => now(),
                    ]
                );
            }
        }
    }
    
    private function fetchAllPages($endpoint) {
        $allData = [];
        $currentPage = 1;
        
        do {
            $url = $this->baseUrl . $endpoint . "&page=" . $currentPage;
            $data = $this->makeRequest($url);
            
            $allData = array_merge($allData, $data['data']);
            $currentPage++;
            
            sleep(1); // Rate limiting
        } while ($currentPage <= $data['meta']['last_page']);
        
        return ['data' => $allData];
    }
}
```

### Python Example

```python
import requests
import time

class HRSystemSync:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Accept': 'application/json',
        }
    
    def sync_employees(self):
        # Fetch all employees including deleted
        employees = self.fetch_all_pages('/api/employees?include_deleted=true&status=all')
        
        for emp in employees:
            if emp['is_deleted']:
                # Delete from local database
                self.database.delete('employees', emp['id'])
                print(f"Deleted employee: {emp['id']}")
            else:
                # Update or insert
                self.database.upsert('employees', {
                    'id': emp['id'],
                    'surname': emp['name']['surname'],
                    'first_name': emp['name']['first_name'],
                    # ... other fields
                    'updated_at': datetime.now(),
                })
    
    def fetch_all_pages(self, endpoint):
        all_data = []
        current_page = 1
        
        while True:
            url = f"{self.base_url}{endpoint}&page={current_page}"
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            
            all_data.extend(data['data'])
            
            if current_page >= data['meta']['last_page']:
                break
            
            current_page += 1
            time.sleep(1)  # Rate limiting
        
        return all_data
```

## Response Format

### Employee Response (with deletion fields)

```json
{
  "id": "EMP001",
  "is_deleted": false,
  "deleted_at": null,
  "name": {
    "surname": "Doe",
    "first_name": "John",
    // ...
  },
  // ... other fields
}
```

### Deleted Employee Response

```json
{
  "id": "EMP001",
  "is_deleted": true,
  "deleted_at": "2024-01-15 10:30:00",
  "name": {
    "surname": "Doe",
    "first_name": "John",
    // ...
  },
  // ... other fields (preserved for reference)
}
```

### Department Response (with deletion fields)

```json
{
  "id": 5,
  "code": "CS",
  "name": "Computer Science",
  "type": "academic",
  "description": "Computer Science Department",
  "is_deleted": false,
  "deleted_at": null,
  "faculty": {
    "id": 1,
    "code": "CIT",
    "name": "College of Information Technology"
  }
}
```

### Faculty Response (with deletion fields)

```json
{
  "id": 1,
  "code": "CIT",
  "name": "College of Information Technology",
  "type": "academic",
  "description": "College of IT",
  "status": "active",
  "is_deleted": false,
  "deleted_at": null
}
```

## Summary

1. **Always use `include_deleted=true`** when syncing to get complete picture
2. **Check `is_deleted` flag** to determine if record should be deleted locally
3. **Use `deleted_at` timestamp** for logging and auditing
4. **Implement both approaches** - use Approach 1 (include_deleted) as primary, Approach 2 (compare IDs) as fallback
5. **Handle pagination** if you have many records
6. **Use transactions** to ensure data consistency
7. **Log sync operations** for debugging and auditing

## Support

For questions or issues with data synchronization:
1. Check the [API Documentation](./API_DOCUMENTATION.md) for endpoint details
2. Review the [API Integration Guide](./API_INTEGRATION_GUIDE.md) for authentication
3. Contact the HR System administrator for assistance


