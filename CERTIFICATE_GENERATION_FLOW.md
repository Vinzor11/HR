# Certificate Generation Flow - What Happens After Approval

## Overview

When a request with certificate generation configured is approved, the system automatically generates a certificate. Here's the complete flow:

## Step-by-Step Flow

### 1. Request Submission
- User submits a request through **Requests → Request Center**
- Request status: `pending` (if approval workflow exists) or `approved` (if no approval)
- Certificate is **NOT** generated yet

### 2. Approval Process
- Approver reviews the request
- Approver clicks **Approve** button
- System calls `advanceOrComplete()` method

### 3. Status Transition (After Approval)

The system checks if there are more approval steps:

**Scenario A: More Approval Steps Remaining**
- Status stays: `pending`
- Moves to next approval step
- Certificate is **NOT** generated yet

**Scenario B: All Approval Steps Complete**

The system checks if fulfillment is required:

**B1: No Fulfillment Required**
- Status changes to: `approved`
- **Certificate is automatically generated** ✅
- Request is complete

**B2: Fulfillment Required**
- Status changes to: `fulfillment`
- Certificate is **NOT** generated yet
- HR/admin must upload fulfillment document
- Once fulfillment is uploaded:
  - Status changes to: `completed`
  - **Certificate is automatically generated** ✅

### 4. Certificate Generation Process

When the status becomes `approved` (no fulfillment) or `completed` (after fulfillment), the `CertificateGenerationObserver` triggers:

1. **Checks Configuration**:
   - Verifies request type has `certificate_template_id` set
   - Verifies `certificate_config` exists

2. **Extracts Request Data**:
   - Gets all answers from the request submission
   - Maps request fields to certificate text layers using `field_mappings`
   - Adds automatic placeholders (user_name, current_date, etc.)

3. **Generates Certificate**:
   - Loads certificate template
   - Creates base image (from background or blank canvas)
   - Renders all text layers with mapped data
   - Saves certificate as PNG file

4. **Stores Certificate**:
   - Saves to: `storage/app/public/certificates/{submission_id}/certificate-{reference_code}.png`
   - Updates `request_submissions.certificate_path` field
   - Logs success/errors

### 5. Certificate Available

Once generated, the certificate is:
- Stored in the database (linked to request submission)
- Available for download by the requester
- Visible in request details page

## Visual Flow Diagram

```
Request Submitted
    ↓
Status: pending
    ↓
Approver Approves
    ↓
advanceOrComplete()
    ↓
┌─────────────────────────────────────┐
│ More approval steps?                 │
└─────────────────────────────────────┘
    │
    ├─ YES → Status: pending (next step)
    │         Certificate: NOT generated
    │
    └─ NO
         │
         └─ Fulfillment required?
              │
              ├─ YES → Status: fulfillment
              │         Certificate: NOT generated
              │         ↓
              │         HR uploads fulfillment
              │         ↓
              │         Status: completed
              │         Certificate: GENERATED ✅
              │
              └─ NO → Status: approved
                       Certificate: GENERATED ✅
```

## Example Scenarios

### Scenario 1: Simple Approval (No Fulfillment)

1. User submits "Training Certificate Request"
2. Manager approves
3. **Certificate is immediately generated** ✅
4. User can download certificate

### Scenario 2: Multi-Step Approval (No Fulfillment)

1. User submits request
2. Step 1: Supervisor approves → Status: `pending` (waiting for next step)
3. Step 2: HR approves → Status: `approved`
4. **Certificate is generated** ✅

### Scenario 3: Approval + Fulfillment Required

1. User submits request
2. Manager approves → Status: `fulfillment`
3. HR uploads final document → Status: `completed`
4. **Certificate is generated** ✅

## Where to View Generated Certificates

### For Requesters:
1. Go to **Requests → Request Center**
2. Find your completed request
3. Click to view details
4. Certificate download link will be available

### For Admins:
1. Go to **Requests → Request Center**
2. Filter by status: `completed` or `approved`
3. View any request to see its certificate

## Troubleshooting

### Certificate Not Generated?

**Check 1: Request Status**
- Certificate only generates when status is `approved` (no fulfillment) or `completed` (after fulfillment)
- If status is still `pending`, more approvals are needed

**Check 2: Configuration**
- Verify request type has `certificate_template_id` set
- Check `certificate_config` has valid JSON

**Check 3: Field Mappings**
- Ensure request fields were filled when submitted
- Verify field keys in mappings match request field keys exactly

**Check 4: Logs**
- Check `storage/logs/laravel.log` for errors
- Look for "Certificate generated successfully" or error messages

### Certificate Generated But Empty?

- Check text layer positions (might be outside certificate dimensions)
- Verify field mappings are correct
- Check that request fields have values

## Automatic Features

The system automatically:
- ✅ Detects when request is ready for certificate generation
- ✅ Extracts all request data
- ✅ Maps fields to certificate layers
- ✅ Generates certificate image
- ✅ Stores certificate with request
- ✅ Makes certificate available for download

**No manual intervention required!** Once configured, certificates are generated automatically when requests are completed.

