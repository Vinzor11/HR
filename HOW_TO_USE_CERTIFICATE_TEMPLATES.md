# How to Use Certificate Templates

## Quick Start Guide

### Step 1: Create a Request Type

1. Go to **Requests → Dynamic Builder**
2. Click **Create New Request Type** (or edit an existing one)
3. Fill in the basic information:
   - **Name**: e.g., "Training Certificate Request"
   - **Description**: Brief description of what this request is for

### Step 2: Add Request Fields

Add fields that will be used to populate the certificate. For example:

- **Field Key**: `full_name` (Text) - Required
- **Field Key**: `training_title` (Text) - Required  
- **Field Key**: `completion_date` (Date) - Required
- **Field Key**: `hours_completed` (Number) - Optional

**Important**: The field keys you use here will be mapped to certificate text layers.

### Step 3: Configure Certificate Generation

In the Request Type builder, you'll see a **Certificate Configuration** section:

1. **Select Certificate Template**: Choose "Default Certificate Template" (or any template you created)
2. **Configure Field Mappings**: This maps your request fields to certificate text layers

**Example Configuration:**
```json
{
  "field_mappings": {
    "recipient_name": "full_name",
    "course_title": "training_title"
  }
}
```

This means:
- The `recipient_name` text layer on the certificate will use the `full_name` field from the request
- The `course_title` text layer will use the `training_title` field from the request

### Step 4: Set Up Approval Workflow (Optional)

If you want certificates to be generated only after approval:
1. Add approval steps
2. Configure approvers
3. When the request is approved and completed, the certificate will be auto-generated

### Step 5: Publish the Request Type

Click **Publish** to make it available to users.

## How It Works

### Automatic Certificate Generation

When a request is completed (either approved without fulfillment, or fulfillment is completed), the system automatically:

1. **Detects** if the request type has a certificate template configured
2. **Extracts** data from the request submission answers
3. **Maps** request fields to certificate text layers using your configuration
4. **Generates** the certificate image
5. **Stores** it with the request submission

### Field Mapping Explained

The certificate template has text layers with names like:
- `recipient_name`
- `course_title`
- `completion_date`

Your request type has fields with keys like:
- `full_name`
- `training_title`
- `completion_date`

The `field_mappings` in the certificate config connects them:
```json
{
  "field_mappings": {
    "recipient_name": "full_name",      // Certificate layer → Request field
    "course_title": "training_title"    // Certificate layer → Request field
  }
}
```

### Available Placeholders

Even without field mappings, you can use these automatic placeholders in text layers:

- `{user_name}` - User's name
- `{user_email}` - User's email
- `{employee_full_name}` - Employee full name (if user has employee record)
- `{current_date}` - Current date (formatted)
- `{current_year}` - Current year
- `{reference_code}` - Request reference code
- `{submitted_date}` - Date request was submitted
- `{completed_date}` - Date request was completed

## Example: Training Certificate Request

### Request Type Setup:

**Name**: "Training Certificate Request"

**Fields**:
1. `participant_name` (Text) - Required
2. `course_name` (Text) - Required
3. `training_date` (Date) - Required
4. `hours` (Number) - Optional

**Certificate Configuration**:
```json
{
  "field_mappings": {
    "recipient_name": "participant_name",
    "course_title": "course_name",
    "completion_date": "training_date"
  }
}
```

### What Happens:

1. User submits a request with:
   - Participant Name: "John Doe"
   - Course Name: "Advanced React Development"
   - Training Date: "2025-01-15"

2. Request goes through approval workflow

3. When completed, certificate is generated with:
   - Recipient Name: "John Doe" (from `participant_name` field)
   - Course Title: "Advanced React Development" (from `course_name` field)
   - Completion Date: "Completed on January 15, 2025" (from `training_date` field)

## Viewing Generated Certificates

Once a request is completed and a certificate is generated:

1. Go to **Requests → Request Center**
2. Find the completed request
3. Click to view details
4. The certificate will be available for download

## Troubleshooting

### Certificate Not Generating

1. **Check Request Type Configuration**:
   - Ensure `certificate_template_id` is set
   - Verify `certificate_config` is valid JSON

2. **Check Request Status**:
   - Certificate only generates when status is `completed` or `approved` (without fulfillment requirement)

3. **Check Field Mappings**:
   - Field keys must match exactly (case-sensitive)
   - Verify the request fields exist and were filled

4. **Check Logs**:
   - Check `storage/logs/laravel.log` for errors

### Text Not Appearing on Certificate

1. **Verify Field Mappings**:
   - Check that field keys in mappings match request field keys
   - Ensure the request was submitted with data in those fields

2. **Check Text Layer Positions**:
   - Positions might be outside certificate dimensions
   - Edit the template to adjust X/Y coordinates

3. **Check Font Color**:
   - Font color might match background
   - Ensure good contrast

## Next Steps

After setting up your first certificate-enabled request type:

1. **Test it**: Submit a test request and complete it
2. **Verify**: Check that the certificate generates correctly
3. **Adjust**: Edit the template if text positions need adjustment
4. **Reuse**: Use the same template for other request types with different field mappings

