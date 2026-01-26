# Training Update Audit Log Fields

## Currently Tracked Fields

Based on the `TrainingController::update()` method, the following fields are being tracked for audit logging:

### Fields from TrainingRequest validation:
1. **training_title** - Training title/name
2. **training_category_id** - Training category ID
3. **date_from** - Start date
4. **date_to** - End date
5. **hours** - Training hours
6. **facilitator** - Facilitator name
7. **venue** - Training venue
8. **capacity** - Maximum capacity
9. **remarks** - Additional remarks

### Additional fields added in controller:
10. **requires_approval** - Boolean flag for approval requirement
11. **request_type_id** - Request type ID for approval workflow
12. **reference_number** - Reference number (if generated)

### Fields EXCLUDED from audit logging:
- **faculty_ids** - Allowed faculties (many-to-many relationship)
- **department_ids** - Allowed departments (many-to-many relationship)
- **position_ids** - Allowed positions (many-to-many relationship)

## Current Implementation Logic

The code currently:
1. Loops through `$trainingData` (all fields being updated)
2. Checks if field exists in `$original` (from `getOriginal()`)
3. **Skips fields that don't exist in `$original`** - This is the issue!
4. Compares normalized old vs new values
5. Only logs if values actually changed

## Problem

The check `if (!isset($original[$field]))` means:
- Fields that are NULL in the database might not be in `$original`
- New fields being set for the first time won't be logged
- Fields that exist but weren't loaded might be skipped

## Solution Needed

The code should log ALL fields in `$trainingData` that have changed, regardless of whether they exist in `$original`. For new fields, the old value should be `null` or empty.
