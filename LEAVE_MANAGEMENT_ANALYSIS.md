# Leave Management Using Request Builder - Feasibility Analysis

## Executive Summary

**Short Answer:** The request builder can handle **leave request submission and approval workflow**, but **NOT** the core leave management features like balance tracking, accrual, calendar, and reports.

**Recommendation:** Use a **hybrid approach**:
- Use Request Builder for: Leave request submission & approval workflow
- Build separate Leave Management module for: Balance tracking, accrual, calendar, reports

---

## 1. WHAT THE REQUEST BUILDER CAN HANDLE ✅

### 1.1 Leave Request Submission Form
The request builder can create a leave request form with:

**Supported Field Types:**
- ✅ **Leave Type** (Dropdown) - Vacation, Sick, Personal, Maternity, etc.
- ✅ **Start Date** (Date field)
- ✅ **End Date** (Date field)
- ✅ **Number of Days** (Number field) - Can be calculated or entered
- ✅ **Reason/Comments** (Textarea)
- ✅ **Medical Certificate** (File upload) - For sick leave
- ✅ **Emergency Contact** (Text) - Optional
- ✅ **Coverage/Handover Notes** (Textarea)

**Example Request Type Configuration:**
```
Request Type: "Leave Request"
Fields:
1. Leave Type (Dropdown) - Required
   Options: Vacation, Sick, Personal, Maternity, Paternity, Emergency
2. Start Date (Date) - Required
3. End Date (Date) - Required
4. Reason (Textarea) - Required
5. Medical Certificate (File) - Optional (for sick leave)
6. Coverage Notes (Textarea) - Optional
```

### 1.2 Approval Workflow
The request builder's multi-step approval can handle:

- ✅ **Manager Approval** (First step)
- ✅ **HR Approval** (Second step) - Optional
- ✅ **Department Head Approval** (Third step) - For extended leaves
- ✅ **Role-based approvers** (e.g., "Department Manager" role)
- ✅ **User-specific approvers** (e.g., direct manager)
- ✅ **Conditional approvals** (different paths based on leave type/duration)

**Example Approval Flow:**
```
Step 1: Direct Manager Approval
  - Approver: User's direct manager (role-based or user-specific)
  
Step 2: HR Approval (if leave > 5 days)
  - Approver: HR Manager role
  - Conditional: Only if days > 5

Step 3: Department Head Approval (if leave > 10 days)
  - Approver: Department Head role
  - Conditional: Only if days > 10
```

### 1.3 Request Tracking
- ✅ Leave request status (Pending, Approved, Rejected)
- ✅ Approval history
- ✅ Reference codes for tracking
- ✅ User can view their leave requests
- ✅ Managers can view team leave requests

---

## 2. WHAT THE REQUEST BUILDER CANNOT HANDLE ❌

### 2.1 Leave Balance Tracking (CRITICAL)
**Problem:** The request builder stores answers as text/JSON, not structured data that can be:
- Calculated (balance deduction)
- Queried efficiently (balance reports)
- Validated against (checking if balance is sufficient)

**What's Missing:**
- ❌ Leave balance per leave type (e.g., 10 Vacation days remaining)
- ❌ Automatic balance deduction upon approval
- ❌ Balance validation before approval
- ❌ Leave entitlement calculation
- ❌ Leave accrual rules (e.g., 1.25 days per month)
- ❌ Leave carry-over rules
- ❌ Leave encashment tracking

**Why It's a Problem:**
```php
// Request Builder stores this as:
RequestAnswer {
  field_key: "leave_type",
  value: "Vacation"
}

// But you need:
LeaveBalance {
  employee_id: "EMP001",
  leave_type: "Vacation",
  balance: 10.5,  // Can't calculate this from request answers
  accrued: 15.0,
  used: 4.5,
  pending: 0.0
}
```

### 2.2 Leave Calendar View
**Problem:** The request builder doesn't have:
- ❌ Calendar visualization of all leave requests
- ❌ Team leave calendar
- ❌ Department leave calendar
- ❌ Conflict detection (overlapping leaves)
- ❌ Leave density reports (how many people on leave per day)

**Why It's Needed:**
- Managers need to see team availability
- HR needs to plan coverage
- Prevent too many people on leave simultaneously

### 2.3 Leave Reports & Analytics
**Problem:** The request builder's data structure makes reporting difficult:

**Missing Reports:**
- ❌ Leave balance by employee
- ❌ Leave utilization reports
- ❌ Leave trends (monthly/yearly)
- ❌ Leave by department
- ❌ Leave by leave type
- ❌ Leave approval turnaround time
- ❌ Leave patterns analysis

**Why It's Difficult:**
```php
// Request answers are stored as:
request_answers {
  submission_id: 123,
  field_id: 5,
  value: "2025-01-15"  // Just a string, not a date range
}

// To calculate days between dates, you'd need to:
// 1. Find "start_date" field answer
// 2. Find "end_date" field answer
// 3. Parse both as dates
// 4. Calculate difference
// 5. Join with leave_type field
// 6. Group by employee and leave_type
// This is very inefficient compared to a dedicated leave_requests table
```

### 2.4 Leave Accrual & Rules Engine
**Problem:** The request builder has no business logic for:

- ❌ Leave accrual calculation (e.g., 1.25 days/month)
- ❌ Prorated accrual for new employees
- ❌ Leave entitlement based on tenure
- ❌ Maximum leave carry-over
- ❌ Leave expiration rules
- ❌ Blackout periods (no leave during peak season)
- ❌ Minimum notice requirements
- ❌ Maximum consecutive days rules

### 2.5 Integration with Attendance
**Problem:** No connection between:
- ❌ Approved leave and attendance records
- ❌ Leave balance and attendance tracking
- ❌ Absence justification (approved leave vs. unauthorized absence)

### 2.6 Leave History & Analytics
**Problem:** Difficult to generate:
- ❌ Employee leave history
- ❌ Leave patterns (frequent sick leaves, etc.)
- ❌ Leave balance trends
- ❌ Leave utilization rates

---

## 3. HYBRID APPROACH RECOMMENDATION

### Architecture: Request Builder + Leave Management Module

```
┌─────────────────────────────────────────────────────────┐
│           LEAVE MANAGEMENT SYSTEM                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────────┐  │
│  │  Request Builder  │      │  Leave Management     │  │
│  │  (Submission &    │◄─────►│  Module (Core Logic) │  │
│  │   Approval)       │       │                      │  │
│  └──────────────────┘      └──────────────────────┘  │
│         │                            │                  │
│         │                            │                  │
│         ▼                            ▼                  │
│  ┌──────────────────────────────────────────────┐       │
│  │     Leave Balance & Accrual Engine           │       │
│  │     - Balance tracking                       │       │
│  │     - Accrual calculation                     │       │
│  │     - Rules engine                            │       │
│  └──────────────────────────────────────────────┘       │
│                                                           │
│  ┌──────────────────────────────────────────────┐       │
│  │     Leave Calendar & Reports                  │       │
│  │     - Calendar view                           │       │
│  │     - Analytics                               │       │
│  │     - Reports                                 │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

### Implementation Strategy

#### Phase 1: Use Request Builder for Submission
1. Create "Leave Request" request type in Request Builder
2. Configure fields: Leave Type, Start Date, End Date, Reason, etc.
3. Set up approval workflow
4. Employees submit leave requests through existing request system

#### Phase 2: Build Leave Management Module
1. Create `leave_requests` table (linked to request submissions)
2. Create `leave_balances` table
3. Create `leave_types` table
4. Create `leave_accruals` table
5. Build leave balance calculation engine
6. Build accrual rules engine

#### Phase 3: Integration
1. When leave request is **approved** via Request Builder:
   - Create record in `leave_requests` table
   - Calculate number of days
   - Deduct from `leave_balances`
   - Update pending balance
   
2. When leave request is **submitted** via Request Builder:
   - Create pending record in `leave_requests`
   - Reserve balance (add to pending)
   - Validate sufficient balance

3. When leave request is **rejected**:
   - Release reserved balance
   - Update status

#### Phase 4: Additional Features
1. Leave calendar view
2. Leave reports
3. Leave balance dashboard
4. Leave accrual automation

---

## 4. DATABASE SCHEMA DESIGN

### 4.1 Leave Types Table
```php
Schema::create('leave_types', function (Blueprint $table) {
    $table->id();
    $table->string('name'); // Vacation, Sick, Personal, etc.
    $table->string('code')->unique(); // VAC, SICK, PER, etc.
    $table->text('description')->nullable();
    $table->boolean('requires_approval')->default(true);
    $table->boolean('requires_medical_certificate')->default(false);
    $table->integer('max_days_per_request')->nullable();
    $table->integer('max_days_per_year')->nullable();
    $table->integer('min_notice_days')->default(0);
    $table->boolean('can_carry_over')->default(false);
    $table->integer('max_carry_over_days')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
});
```

### 4.2 Leave Balances Table
```php
Schema::create('leave_balances', function (Blueprint $table) {
    $table->id();
    $table->string('employee_id');
    $table->foreignId('leave_type_id');
    $table->decimal('entitled', 8, 2)->default(0); // Total entitlement
    $table->decimal('accrued', 8, 2)->default(0); // Accrued this period
    $table->decimal('used', 8, 2)->default(0); // Used
    $table->decimal('pending', 8, 2)->default(0); // Pending approval
    $table->decimal('balance', 8, 2)->default(0); // Available = entitled - used - pending
    $table->decimal('carried_over', 8, 2)->default(0); // From previous year
    $table->year('year'); // For annual tracking
    $table->timestamps();
    
    $table->unique(['employee_id', 'leave_type_id', 'year']);
    $table->foreign('employee_id')->references('id')->on('employees');
    $table->foreign('leave_type_id')->references('id')->on('leave_types');
});
```

### 4.3 Leave Requests Table
```php
Schema::create('leave_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('request_submission_id')->unique(); // Link to Request Builder
    $table->string('employee_id');
    $table->foreignId('leave_type_id');
    $table->date('start_date');
    $table->date('end_date');
    $table->decimal('days', 5, 2); // Calculated days (excluding weekends/holidays)
    $table->text('reason')->nullable();
    $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
    $table->timestamp('approved_at')->nullable();
    $table->foreignId('approved_by')->nullable();
    $table->text('rejection_reason')->nullable();
    $table->timestamps();
    
    $table->foreign('request_submission_id')->references('id')->on('request_submissions');
    $table->foreign('employee_id')->references('id')->on('employees');
    $table->foreign('leave_type_id')->references('id')->on('leave_types');
    $table->foreign('approved_by')->references('id')->on('users');
});
```

### 4.4 Leave Accruals Table
```php
Schema::create('leave_accruals', function (Blueprint $table) {
    $table->id();
    $table->string('employee_id');
    $table->foreignId('leave_type_id');
    $table->decimal('amount', 8, 2); // Days accrued
    $table->date('accrual_date');
    $table->string('accrual_type'); // monthly, quarterly, annual, manual
    $table->text('notes')->nullable();
    $table->timestamps();
    
    $table->foreign('employee_id')->references('id')->on('employees');
    $table->foreign('leave_type_id')->references('id')->on('leave_types');
});
```

---

## 5. INTEGRATION CODE EXAMPLE

### 5.1 Event Listener for Request Approval
```php
// app/Listeners/LeaveRequestApproved.php

namespace App\Listeners;

use App\Models\LeaveRequest;
use App\Models\LeaveBalance;
use App\Events\RequestApproved;

class LeaveRequestApproved
{
    public function handle(RequestApproved $event)
    {
        $submission = $event->submission;
        
        // Check if this is a leave request
        if ($submission->requestType->name !== 'Leave Request') {
            return;
        }
        
        // Get leave request data from submission answers
        $answers = $submission->answers->keyBy(function ($answer) {
            return $answer->field->field_key;
        });
        
        $leaveType = $this->getLeaveType($answers['leave_type']->value);
        $startDate = $answers['start_date']->value;
        $endDate = $answers['end_date']->value;
        $days = $this->calculateDays($startDate, $endDate);
        
        // Create or update leave request record
        $leaveRequest = LeaveRequest::updateOrCreate(
            ['request_submission_id' => $submission->id],
            [
                'employee_id' => $submission->user->employee_id,
                'leave_type_id' => $leaveType->id,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'days' => $days,
                'reason' => $answers['reason']->value ?? null,
                'status' => 'approved',
                'approved_at' => now(),
                'approved_by' => auth()->id(),
            ]
        );
        
        // Deduct from leave balance
        $this->deductLeaveBalance(
            $submission->user->employee_id,
            $leaveType->id,
            $days
        );
    }
    
    private function deductLeaveBalance($employeeId, $leaveTypeId, $days)
    {
        $year = now()->year;
        
        $balance = LeaveBalance::firstOrCreate(
            [
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveTypeId,
                'year' => $year,
            ],
            [
                'entitled' => 0,
                'accrued' => 0,
                'used' => 0,
                'pending' => 0,
                'balance' => 0,
            ]
        );
        
        // Move from pending to used
        $balance->pending -= $days;
        $balance->used += $days;
        $balance->balance = $balance->entitled - $balance->used - $balance->pending;
        $balance->save();
    }
    
    private function calculateDays($startDate, $endDate)
    {
        // Exclude weekends and holidays
        $start = \Carbon\Carbon::parse($startDate);
        $end = \Carbon\Carbon::parse($endDate);
        
        $days = 0;
        $current = $start->copy();
        
        while ($current->lte($end)) {
            // Skip weekends
            if (!$current->isWeekend()) {
                // Skip holidays (you'd check against a holidays table)
                if (!$this->isHoliday($current)) {
                    $days++;
                }
            }
            $current->addDay();
        }
        
        return $days;
    }
}
```

### 5.2 Validation Before Approval
```php
// In RequestSubmissionController or Middleware

public function validateLeaveBalance(RequestSubmission $submission)
{
    if ($submission->requestType->name !== 'Leave Request') {
        return true;
    }
    
    $answers = $submission->answers->keyBy(function ($answer) {
        return $answer->field->field_key;
    });
    
    $leaveType = LeaveType::where('code', $answers['leave_type']->value)->first();
    $startDate = $answers['start_date']->value;
    $endDate = $answers['end_date']->value;
    $days = $this->calculateDays($startDate, $endDate);
    
    $balance = LeaveBalance::where('employee_id', $submission->user->employee_id)
        ->where('leave_type_id', $leaveType->id)
        ->where('year', now()->year)
        ->first();
    
    if (!$balance || $balance->balance < $days) {
        throw new \Exception('Insufficient leave balance');
    }
    
    return true;
}
```

---

## 6. USER EXPERIENCE FLOW

### 6.1 Employee Submits Leave Request
1. Employee goes to Requests → New Request → "Leave Request"
2. Fills out form (Leave Type, Dates, Reason)
3. System shows **current leave balance** (from Leave Management module)
4. System validates balance is sufficient
5. System shows **pending balance** after submission
6. Request submitted through Request Builder workflow

### 6.2 Manager Approves Leave Request
1. Manager sees leave request in approval queue
2. Manager sees employee's leave balance
3. Manager sees team calendar (from Leave Management module)
4. Manager approves/rejects
5. If approved:
   - Balance automatically deducted
   - Leave appears on calendar
   - Employee notified

### 6.3 Employee Views Leave Balance
1. Employee goes to Leave Management → My Leaves
2. Sees balance by leave type
3. Sees leave history
4. Sees pending requests
5. Can view calendar of their leaves

---

## 7. ADVANTAGES OF HYBRID APPROACH

✅ **Reuses Existing Infrastructure**
- Leverages your excellent Request Builder
- No need to rebuild approval workflow
- Consistent user experience

✅ **Separation of Concerns**
- Request Builder = Submission & Approval
- Leave Module = Business Logic & Data Management

✅ **Flexibility**
- Can add other leave-related request types (Leave Extension, Leave Cancellation)
- Can integrate with other systems (attendance, payroll)

✅ **Maintainability**
- Clear boundaries between modules
- Easier to test and debug

---

## 8. ALTERNATIVE: FULLY CUSTOM LEAVE MODULE

If you want complete control and don't need the flexibility of Request Builder:

**Pros:**
- ✅ Optimized for leave management
- ✅ Better performance
- ✅ Simpler codebase (no integration layer)

**Cons:**
- ❌ Duplicate approval workflow code
- ❌ More development time
- ❌ Less flexible for other request types

---

## 9. RECOMMENDATION

**Use the Hybrid Approach** because:

1. Your Request Builder is already excellent and flexible
2. Saves development time (reuse approval workflow)
3. Maintains consistency with other request types
4. Allows future expansion (Leave Extension, Leave Cancellation as separate request types)
5. Better user experience (familiar interface)

**Implementation Priority:**
1. **Phase 1 (Week 1-2):** Create Leave Request type in Request Builder
2. **Phase 2 (Week 3-4):** Build Leave Management module (tables, models)
3. **Phase 3 (Week 5-6):** Integration layer (event listeners, balance deduction)
4. **Phase 4 (Week 7-8):** Leave calendar, reports, accrual automation

---

## 10. CONCLUSION

**Can leave management be built in the Request Builder?**

**Answer:** Partially YES, but you need a hybrid approach.

- ✅ **Use Request Builder for:** Submission form & approval workflow
- ❌ **Build separate module for:** Balance tracking, accrual, calendar, reports

This gives you the best of both worlds: leveraging your excellent Request Builder while having the data structure and business logic needed for proper leave management.

---

**Next Steps:**
1. Review this analysis
2. Decide on hybrid vs. custom approach
3. If hybrid, I can help implement the integration layer
4. If custom, I can help design the full leave management module



