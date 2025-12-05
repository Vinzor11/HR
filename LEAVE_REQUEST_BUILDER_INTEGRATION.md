# Leave Management & Request Builder Integration Guide

## Overview

The Leave Management system is **automatically connected** to your Request Builder through a **Model Observer** pattern. When employees submit leave requests through the Request Builder, the system automatically:

1. **Reserves** leave balance when submitted
2. **Deducts** leave balance when approved
3. **Releases** reserved balance when rejected
4. **Creates** leave request records for tracking

---

## How It Works

### 1. Observer Pattern

The integration uses Laravel's **Model Observer** to watch for changes to `RequestSubmission`:

```php
// app/Providers/AppServiceProvider.php
RequestSubmission::observe(LeaveRequestObserver::class);
```

This means **every time** a request submission is created or updated, the observer checks if it's a leave request and processes it accordingly.

### 2. Detection Mechanism

The observer identifies leave requests by checking the **Request Type name**:

```php
if ($submission->requestType->name !== 'Leave Request') {
    return; // Not a leave request, ignore
}
```

**Important:** The Request Type name must be **exactly** `"Leave Request"` (case-sensitive).

### 3. Field Mapping

The observer extracts data from Request Builder answers using **field keys**:

| Request Builder Field Key | Leave Management Field | Required |
|--------------------------|------------------------|----------|
| `leave_type` | Leave Type Code (VAC, SICK, etc.) | ✅ Yes |
| `start_date` | Start Date | ✅ Yes |
| `end_date` | End Date | ✅ Yes |
| `reason` | Reason/Comments | ⚠️ Optional |

---

## Complete Workflow

### Step 1: Employee Submits Leave Request

```
Employee → Request Builder → "Leave Request" Form
  ↓
Fills: Leave Type, Start Date, End Date, Reason
  ↓
Submits Request
  ↓
RequestSubmission Created (status: "pending")
  ↓
LeaveRequestObserver::created() fires
  ↓
Extracts answers from Request Builder
  ↓
Calculates working days (excludes weekends/holidays)
  ↓
Reserves balance (moves to "pending")
```

**What happens:**
- Balance is **reserved** (not deducted yet)
- Employee's available balance decreases
- Pending balance increases
- Request goes to approval queue

### Step 2: Manager Approves Leave Request

```
Manager → Approval Queue → Approves Request
  ↓
RequestSubmission Status → "approved"
  ↓
LeaveRequestObserver::updated() fires
  ↓
Detects status change: pending → approved
  ↓
Creates LeaveRequest record
  ↓
Deducts balance (pending → used)
```

**What happens:**
- Balance is **deducted** from available
- Pending balance decreases
- Used balance increases
- Leave request record created
- Appears on leave calendar

### Step 3: Manager Rejects Leave Request

```
Manager → Approval Queue → Rejects Request
  ↓
RequestSubmission Status → "rejected"
  ↓
LeaveRequestObserver::updated() fires
  ↓
Detects status change: pending → rejected
  ↓
Releases reserved balance
```

**What happens:**
- Reserved balance is **released**
- Pending balance decreases
- Available balance increases
- No leave request record created

---

## Setting Up the Leave Request Type

### Step 1: Create Request Type

1. Go to **Requests → Dynamic Builder**
2. Click **"Create New Request Type"**
3. Set **Name:** `Leave Request` (exactly this, case-sensitive)
4. Add description (optional)

### Step 2: Add Required Fields

Add these fields in order:

#### Field 1: Leave Type (Dropdown)
- **Field Key:** `leave_type`
- **Label:** "Leave Type"
- **Field Type:** Dropdown
- **Required:** ✅ Yes
- **Options:**
  ```
  VAC - Vacation Leave
  SICK - Sick Leave
  PER - Personal Leave
  MAT - Maternity Leave
  PAT - Paternity Leave
  EMER - Emergency Leave
  ```
  **Important:** The **value** must be the code (VAC, SICK, etc.), not the name!

#### Field 2: Start Date (Date)
- **Field Key:** `start_date`
- **Label:** "Start Date"
- **Field Type:** Date
- **Required:** ✅ Yes

#### Field 3: End Date (Date)
- **Field Key:** `end_date`
- **Label:** "End Date"
- **Field Type:** Date
- **Required:** ✅ Yes

#### Field 4: Reason (Textarea)
- **Field Key:** `reason`
- **Label:** "Reason"
- **Field Type:** Textarea
- **Required:** ⚠️ Optional (but recommended)

#### Optional Fields:

**Medical Certificate (File)**
- **Field Key:** `medical_certificate` (not used by observer, but good for records)
- **Label:** "Medical Certificate"
- **Field Type:** File
- **Required:** ❌ No

**Coverage Notes (Textarea)**
- **Field Key:** `coverage_notes` (not used by observer)
- **Label:** "Coverage/Handover Notes"
- **Field Type:** Textarea
- **Required:** ❌ No

### Step 3: Set Up Approval Workflow

Configure approval steps as needed:

**Example:**
- **Step 1:** Direct Manager (Role-based or User-specific)
- **Step 2:** HR Approval (if leave > 5 days) - Optional
- **Step 3:** Department Head (if leave > 10 days) - Optional

### Step 4: Publish

Click **"Publish"** to make it available to employees.

---

## Field Key Reference

The observer looks for these **exact field keys** in the Request Builder:

| Field Key | Type | Description | Example Value |
|-----------|------|-------------|---------------|
| `leave_type` | Dropdown | Leave type code | `"VAC"`, `"SICK"`, `"PER"` |
| `start_date` | Date | Leave start date | `"2025-02-01"` |
| `end_date` | Date | Leave end date | `"2025-02-05"` |
| `reason` | Textarea | Reason for leave | `"Family vacation"` |

**Critical:** Field keys must match **exactly** (case-sensitive).

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    REQUEST BUILDER                           │
│                                                              │
│  Employee submits "Leave Request"                            │
│  ├─ Leave Type: VAC                                         │
│  ├─ Start Date: 2025-02-01                                  │
│  ├─ End Date: 2025-02-05                                    │
│  └─ Reason: "Family vacation"                                │
│                                                              │
│  ↓ Creates RequestSubmission                                 │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              LEAVE REQUEST OBSERVER                          │
│                                                              │
│  1. Detects: requestType.name === "Leave Request"          │
│  2. Extracts answers using field keys                       │
│  3. Calculates working days (excludes weekends/holidays)    │
│  4. Reserves balance (pending)                              │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              LEAVE MANAGEMENT MODULE                          │
│                                                              │
│  LeaveBalance Table:                                         │
│  ├─ Entitled: 15.0                                          │
│  ├─ Used: 0.0                                               │
│  ├─ Pending: 4.0  ← Reserved                                │
│  └─ Balance: 11.0  ← Available                              │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              APPROVAL WORKFLOW                               │
│                                                              │
│  Manager approves → Status: "approved"                       │
│                                                              │
│  Observer detects status change                              │
│  ├─ Creates LeaveRequest record                             │
│  └─ Deducts balance (pending → used)                        │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              FINAL STATE                                      │
│                                                              │
│  LeaveBalance:                                               │
│  ├─ Entitled: 15.0                                          │
│  ├─ Used: 4.0  ← Deducted                                   │
│  ├─ Pending: 0.0                                             │
│  └─ Balance: 11.0  ← Available                              │
│                                                              │
│  LeaveRequest:                                                │
│  ├─ Status: approved                                         │
│  ├─ Days: 4.0                                                │
│  └─ Appears on calendar                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Code Structure

### Observer Registration

```php
// app/Providers/AppServiceProvider.php
public function boot(): void
{
    RequestSubmission::observe(LeaveRequestObserver::class);
}
```

### Observer Events

```php
// app/Observers/LeaveRequestObserver.php

// Fires when request is submitted
public function created(RequestSubmission $submission)
{
    // Reserve balance
}

// Fires when request status changes
public function updated(RequestSubmission $submission)
{
    // Handle approval/rejection
}
```

### Answer Extraction

```php
protected function getLeaveRequestAnswers(RequestSubmission $submission): ?array
{
    $answers = RequestAnswer::where('submission_id', $submission->id)
        ->with('field')
        ->get()
        ->keyBy(function ($answer) {
            return $answer->field->field_key; // Uses field_key!
        });

    return [
        'leave_type' => $answers['leave_type']->value,
        'start_date' => $answers['start_date']->value,
        'end_date' => $answers['end_date']->value,
        'reason' => $answers['reason']->value ?? null,
    ];
}
```

---

## Troubleshooting

### Issue: Balance Not Reserved on Submission

**Check:**
1. ✅ Request Type name is exactly `"Leave Request"` (case-sensitive)
2. ✅ Field keys match exactly: `leave_type`, `start_date`, `end_date`
3. ✅ User has `employee_id` set
4. ✅ Leave type code exists (VAC, SICK, etc.)
5. ✅ Check logs: `storage/logs/laravel.log`

### Issue: Balance Not Deducted on Approval

**Check:**
1. ✅ Request was approved (status = "approved")
2. ✅ Observer is registered in `AppServiceProvider`
3. ✅ Balance was previously reserved
4. ✅ Check logs for errors

### Issue: Wrong Leave Type Code

**Solution:**
- Ensure dropdown **value** is the code (VAC, SICK), not the name
- Check `leave_types` table for correct codes

### Issue: Working Days Calculation Wrong

**Check:**
1. ✅ Holidays are set up in `holidays` table
2. ✅ Weekends are excluded (Saturday/Sunday)
3. ✅ Date format is correct (Y-m-d)

---

## Testing the Integration

### Test 1: Submit Leave Request

1. Create "Leave Request" type in Request Builder
2. Submit a leave request
3. Check leave balance - should show pending days
4. Check logs for observer activity

### Test 2: Approve Leave Request

1. Approve the request
2. Check leave balance - should deduct from available
3. Check `leave_requests` table - should have record
4. Check leave calendar - should appear

### Test 3: Reject Leave Request

1. Submit another request
2. Reject it
3. Check leave balance - pending should be released
4. Available balance should return

---

## Key Points

✅ **Automatic** - No manual intervention needed  
✅ **Seamless** - Uses existing Request Builder workflow  
✅ **Safe** - Errors are logged, don't break requests  
✅ **Tracked** - All actions are logged  
✅ **Flexible** - Works with any approval workflow  

---

## Next Steps

1. ✅ Create "Leave Request" type in Request Builder
2. ✅ Set up fields with correct field keys
3. ✅ Configure approval workflow
4. ✅ Publish the request type
5. ✅ Test with a sample request

The integration is **already active** - just create the Request Type and it will work automatically!



