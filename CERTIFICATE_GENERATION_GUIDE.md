# Certificate Generation System - User Guide

## Overview

The Certificate Generation System allows you to automatically generate certificates for any request type in your Request Builder **without writing any code**. Once configured, certificates are automatically generated when requests are completed.

## How It Works

1. **Create a Certificate Template** - Define the certificate design with text layers
2. **Configure Request Type** - Link the template to a request type and map fields
3. **Automatic Generation** - When a request is completed, the certificate is automatically generated
4. **Reusable Logic** - The same template can be reused for multiple request types

## Step-by-Step Setup

### Step 1: Create a Certificate Template

1. Go to **Requests → Certificate Templates** in the sidebar
2. Click **Create Template**
3. Fill in the template details:
   - **Name**: e.g., "Training Completion Certificate"
   - **Description**: Brief description
   - **Background Image** (optional): Upload a certificate background image
   - **Width**: Certificate width in pixels (default: 1200)
   - **Height**: Certificate height in pixels (default: 800)

### Step 2: Add Text Layers to Template

For each piece of text on the certificate, create a text layer:

**Example Layers:**

1. **Recipient Name**
   - Name: `recipient_name`
   - Field Key: `full_name` (maps to request field)
   - X Position: 600 (center)
   - Y Position: 300
   - Font Size: 36
   - Font Color: #000000
   - Text Align: center

2. **Training Title**
   - Name: `training_title`
   - Field Key: `training_title`
   - X Position: 600
   - Y Position: 400
   - Font Size: 24
   - Text Align: center

3. **Date**
   - Name: `completion_date`
   - Default Text: `Completed on {current_date}`
   - X Position: 600
   - Y Position: 500
   - Font Size: 18
   - Text Align: center

### Step 3: Configure Request Type

When creating or editing a request type in the Request Builder:

1. **Select Certificate Template**: Choose the template you created
2. **Configure Field Mappings** (JSON format):
   ```json
   {
     "field_mappings": {
       "recipient_name": "full_name",
       "training_title": "training_title",
       "completion_date": "completion_date"
     },
     "auto_generate": true
   }
   ```

   The `field_mappings` object maps:
   - **Key**: Text layer name (from template)
   - **Value**: Request field key (from your request type fields)

### Step 4: Create Request Type Fields

Make sure your request type has fields that match the field keys in your mappings:

**Example Request Type: "Training Certificate Request"**

Fields:
- `full_name` (Text) - Required
- `training_title` (Text) - Required
- `training_date` (Date) - Required
- `hours_completed` (Number) - Optional

### Step 5: Test the System

1. Submit a request using the configured request type
2. Complete the approval workflow (if any)
3. When the request is completed, the certificate is automatically generated
4. The certificate is stored and linked to the request submission

## Available Placeholders

The system automatically provides these placeholders that can be used in text layers:

### User Information
- `{user_name}` - User's name
- `{user_email}` - User's email

### Employee Information (if user has employee record)
- `{employee_full_name}` - Full name (first + last)
- `{employee_first_name}` - First name
- `{employee_last_name}` - Last name
- `{employee_middle_name}` - Middle name
- `{employee_position}` - Position name
- `{employee_department}` - Department name

### Request Information
- `{reference_code}` - Request reference code
- `{submitted_date}` - Date request was submitted
- `{completed_date}` - Date request was completed
- `{current_date}` - Current date (formatted: "January 15, 2025")
- `{current_year}` - Current year

### Custom Fields
Any field from your request type can be accessed using its `field_key`:
- `{field_key}` - Value from request submission

## Field Mapping Examples

### Example 1: Training Certificate

**Request Type Fields:**
- `participant_name` (Text)
- `course_name` (Text)
- `completion_date` (Date)
- `hours` (Number)

**Certificate Config:**
```json
{
  "field_mappings": {
    "recipient_name": "participant_name",
    "course_title": "course_name",
    "completion_date": "completion_date",
    "training_hours": "hours"
  }
}
```

**Text Layers:**
- Layer 1: `recipient_name` → Uses `participant_name` from request
- Layer 2: `course_title` → Uses `course_name` from request
- Layer 3: `completion_date` → Uses `completion_date` from request
- Layer 4: `training_hours` → Uses `hours` from request

### Example 2: Workshop Certificate

**Request Type Fields:**
- `attendee_name` (Text)
- `workshop_title` (Text)
- `workshop_date` (Date)

**Certificate Config:**
```json
{
  "field_mappings": {
    "name": "attendee_name",
    "workshop": "workshop_title",
    "date": "workshop_date"
  }
}
```

## Reusing Templates

The same certificate template can be reused for different request types:

1. **Template**: "Generic Training Certificate"
2. **Request Type 1**: "Safety Training" → Maps `safety_course` field to `course_title` layer
3. **Request Type 2**: "Leadership Training" → Maps `leadership_course` field to `course_title` layer

Both use the same template design but pull data from different fields!

## Advanced Configuration

### Conditional Text

You can use default text with placeholders for static or calculated values:

```json
{
  "default_text": "This certifies that {user_name} has completed {training_title} on {current_date}"
}
```

### Multiple Text Layers

You can have multiple layers with the same field mapping but different positions for different formatting.

## Troubleshooting

### Certificate Not Generating

1. Check that the request type has `certificate_template_id` set
2. Verify `certificate_config` is valid JSON
3. Ensure request status is `completed` or `approved` (without fulfillment requirement)
4. Check logs for errors: `storage/logs/laravel.log`

### Text Not Appearing

1. Verify field keys in mappings match request field keys exactly (case-sensitive)
2. Check that text layer positions are within certificate dimensions
3. Ensure font color contrasts with background

### Missing Data

1. Verify request fields are filled when submitting
2. Check field mappings in certificate config
3. Use placeholders like `{user_name}` for automatic data

## Database Structure

### Certificate Templates
- `certificate_templates` - Stores template definitions
- `certificate_text_layers` - Stores text layer configurations

### Request Types
- `certificate_template_id` - Links to template
- `certificate_config` - JSON configuration with field mappings

### Request Submissions
- `certificate_path` - Path to generated certificate file

## API Usage

### Generate Certificate Manually

```php
use App\Services\CertificateService;
use App\Models\RequestSubmission;

$service = app(CertificateService::class);
$submission = RequestSubmission::find($id);

$certificatePath = $service->generateCertificate($submission);
```

### Check if Certificate Exists

```php
if ($submission->hasCertificate()) {
    $url = $submission->certificate_url;
}
```

## Best Practices

1. **Template Design**: Create templates with clear, readable fonts and good contrast
2. **Field Naming**: Use consistent field keys across request types for easier template reuse
3. **Testing**: Test certificate generation with sample data before going live
4. **Backup**: Keep backup copies of certificate templates
5. **Performance**: Large background images may slow generation; optimize images before upload

## Next Steps

To fully implement this system, you'll need to:

1. **Create UI for Certificate Templates** - Admin interface to create/edit templates
2. **Add Template Selection to Request Builder** - UI to select template and configure mappings
3. **Display Certificates** - Show generated certificates in request details page
4. **Download Functionality** - Allow users to download their certificates

The core logic is complete and working - you just need to build the UI components!

