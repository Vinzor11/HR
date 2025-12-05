# Troubleshooting Certificate Generation

## Quick Diagnostic Commands

### 1. Check All Request Types
```bash
php artisan certificate:diagnose
```
This shows which request types have certificate generation configured.

### 2. Check a Specific Submission
```bash
php artisan certificate:diagnose {submission_id}
```
Replace `{submission_id}` with your actual submission ID.

### 3. Manually Generate Certificate
If automatic generation failed, you can manually trigger it:
```bash
php artisan certificate:generate {submission_id}
```

## Common Issues & Solutions

### Issue 1: Certificate Not Generating After Approval

**Check 1: Request Type Configuration**
```bash
php artisan tinker
```
```php
$requestType = \App\Models\RequestType::find(YOUR_REQUEST_TYPE_ID);
echo "Template ID: " . $requestType->certificate_template_id . "\n";
echo "Config: " . json_encode($requestType->certificate_config) . "\n";
echo "Has Generation: " . ($requestType->hasCertificateGeneration() ? 'YES' : 'NO') . "\n";
```

**Check 2: Submission Status**
The certificate only generates when status is:
- `approved` (no fulfillment required)
- `fulfillment` (all approvals done, fulfillment required)
- `completed` (after fulfillment)

**Check 3: Observer is Firing**
Check logs: `storage/logs/laravel.log`
Look for: `CertificateGenerationObserver: RequestSubmission updated`

**Check 4: GD Extension**
```bash
php -r "echo extension_loaded('gd') ? 'GD loaded' : 'GD NOT loaded';"
```

### Issue 2: Certificate Generation Returns Null

**Possible Causes:**
1. Template not found or inactive
2. Background image missing
3. GD extension not available
4. Field mappings incorrect

**Check Logs:**
```bash
tail -f storage/logs/laravel.log | grep -i certificate
```

### Issue 3: Text Not Appearing on Certificate

**Check:**
1. Field mappings are correct
2. Request fields were filled when submitted
3. Text layer positions are within certificate dimensions
4. Font color contrasts with background

## Step-by-Step Debugging

### Step 1: Verify Configuration
```bash
php artisan certificate:diagnose
```
Ensure your request type shows `hasCertificateGeneration(): ✅ YES`

### Step 2: Check Submission
```bash
php artisan certificate:diagnose {submission_id}
```
Verify:
- Status is `approved`, `fulfillment`, or `completed`
- Request type has certificate generation configured
- Template exists and is active

### Step 3: Check Logs
```bash
tail -n 100 storage/logs/laravel.log | grep -i certificate
```
Look for:
- `CertificateGenerationObserver: RequestSubmission updated`
- `Certificate generated successfully`
- Any error messages

### Step 4: Manual Generation Test
```bash
php artisan certificate:generate {submission_id}
```
This will show detailed error messages if generation fails.

## Expected Log Messages

### Success:
```
[INFO] CertificateGenerationObserver: RequestSubmission updated
[INFO] CertificateGenerationObserver: Attempting to generate certificate
[INFO] Certificate generated successfully
```

### Failure:
```
[WARNING] Certificate generation returned null
[ERROR] Failed to generate certificate
```

## Quick Fixes

### Fix 1: Reload Request Type Relationship
If the observer isn't detecting the configuration:
```php
// In tinker
$submission = \App\Models\RequestSubmission::find(ID);
$submission->load('requestType');
$submission->touch(); // Triggers observer
```

### Fix 2: Manually Trigger Generation
```bash
php artisan certificate:generate {submission_id}
```

### Fix 3: Check Field Mappings
Ensure your field mappings match:
- Request field keys (from your request type)
- Certificate text layer names (from your template)

## Still Not Working?

1. **Check Observer Registration:**
   - Verify `CertificateGenerationObserver` is registered in `AppServiceProvider`
   - Clear config cache: `php artisan config:clear`

2. **Check Database:**
   - Verify `certificate_template_id` is set in `request_types` table
   - Verify `certificate_config` JSON is valid

3. **Check File Permissions:**
   - Ensure `storage/app/public/certificates` directory is writable
   - Check `storage/app/public/certificate-templates` exists

4. **Check PHP Extensions:**
   - GD extension must be installed: `php -m | grep gd`

