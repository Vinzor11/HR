<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogService
{
    /**
     * Fields that should be masked or excluded from audit logs
     */
    protected const SENSITIVE_FIELDS = [
        'password',
        'password_confirmation',
        'token',
        'api_token',
        'remember_token',
        'secret',
        'private_key',
        'access_token',
        'refresh_token',
    ];

    /**
     * Log a create action
     */
    public function logCreated(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $newValues = null,
        ?Model $entity = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'created',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'new_values' => $newValues ?? ($entity ? $this->sanitizeData($entity->toArray()) : null),
            'snapshot' => $entity ? $this->sanitizeData($entity->toArray()) : null,
        ]);
    }

    /**
     * Log an update action
     */
    public function logUpdated(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Model $entity = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'updated',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'old_values' => $oldValues ? $this->sanitizeData($oldValues) : null,
            'new_values' => $newValues ? $this->sanitizeData($newValues) : ($entity ? $this->sanitizeData($entity->toArray()) : null),
            'snapshot' => $entity ? $this->sanitizeData($entity->toArray()) : null,
        ]);
    }

    /**
     * Log a soft delete action
     */
    public function logDeleted(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $oldValues = null,
        ?Model $entity = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'soft-deleted',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'old_values' => $oldValues ? $this->sanitizeData($oldValues) : ($entity ? $this->sanitizeData($entity->toArray()) : null),
            'snapshot' => $entity ? $this->sanitizeData($entity->toArray()) : null,
        ]);
    }

    /**
     * Log a permanent delete action
     */
    public function logPermanentlyDeleted(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $oldValues = null,
        ?Model $entity = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'permanently-deleted',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'old_values' => $oldValues ? $this->sanitizeData($oldValues) : ($entity ? $this->sanitizeData($entity->toArray()) : null),
            'snapshot' => $entity ? $this->sanitizeData($entity->toArray()) : null,
        ]);
    }

    /**
     * Log a restore action
     */
    public function logRestored(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?Model $entity = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'restored',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'new_values' => $entity ? $this->sanitizeData($entity->toArray()) : null,
            'snapshot' => $entity ? $this->sanitizeData($entity->toArray()) : null,
        ]);
    }

    /**
     * Log an approval action
     */
    public function logApproved(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $additionalData = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'approved',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'new_values' => $additionalData ? $this->sanitizeData($additionalData) : null,
        ]);
    }

    /**
     * Log a rejection action
     */
    public function logRejected(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $additionalData = null
    ): AuditLog {
        return $this->createLog([
            'action' => 'rejected',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'new_values' => $additionalData ? $this->sanitizeData($additionalData) : null,
        ]);
    }

    /**
     * Log a view action (for critical views)
     */
    public function logViewed(
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description
    ): AuditLog {
        return $this->createLog([
            'action' => 'viewed',
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
        ]);
    }

    /**
     * Log a custom action
     */
    public function log(
        string $action,
        string $module,
        string $entityType,
        string|int|null $entityId,
        string $description,
        ?array $oldValues = null,
        ?array $newValues = null
    ): AuditLog {
        return $this->createLog([
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $entityId ? (string)$entityId : null,
            'description' => $description,
            'old_values' => $oldValues ? $this->sanitizeData($oldValues) : null,
            'new_values' => $newValues ? $this->sanitizeData($newValues) : null,
        ]);
    }

    /**
     * Create the audit log entry
     */
    protected function createLog(array $data): AuditLog
    {
        try {
            // Capture request context
            $request = request();
            
            // Ensure entity_id is string or null
            $entityId = isset($data['entity_id']) && $data['entity_id'] !== null 
                ? (string)$data['entity_id'] 
                : null;
            
            // Ensure description is not empty (required field)
            if (empty($data['description'])) {
                $data['description'] = "{$data['action']} {$data['entity_type']}" . 
                    ($entityId ? " (ID: {$entityId})" : '');
            }
            
            $logData = array_merge($data, [
                'entity_id' => $entityId,
                'user_id' => Auth::id(),
                'performed_by' => Auth::user()?->name ?? 'System',
                'user_agent' => $request?->userAgent(),
            ]);

            $log = AuditLog::create($logData);
            
            // Log success for debugging (can be removed in production)
            \Log::debug('Audit log created successfully', [
                'id' => $log->id,
                'module' => $log->module,
                'action' => $log->action,
                'entity_type' => $log->entity_type,
                'entity_id' => $log->entity_id,
            ]);
            
            return $log;
        } catch (\Exception $e) {
            // Log error with full details for debugging
            \Log::error('Failed to create audit log', [
                'data' => $data,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            
            // Re-throw in development to see the actual error
            if (config('app.debug')) {
                throw $e;
            }
            
            // Return a dummy log to prevent null errors in production
            return new AuditLog($data);
        }
    }

    /**
     * Sanitize data by removing sensitive fields and formatting dates
     */
    protected function sanitizeData(array $data): array
    {
        $sanitized = [];
        
        foreach ($data as $key => $value) {
            // Skip sensitive fields
            if (in_array(strtolower($key), self::SENSITIVE_FIELDS, true)) {
                $sanitized[$key] = '[REDACTED]';
                continue;
            }

            // Format date fields (date_from, date_to, and other common date field names)
            if ($this->isDateField($key, $value)) {
                $sanitized[$key] = $this->formatDateValue($value);
                continue;
            }

            // Recursively sanitize nested arrays
            if (is_array($value)) {
                $sanitized[$key] = $this->sanitizeData($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Check if a field is a date field
     */
    protected function isDateField(string $key, $value): bool
    {
        // Check if key suggests it's a date field
        $dateFieldPatterns = ['date', 'Date', '_at', 'birthday', 'birth_date', 'expiry', 'expires'];
        $isDateKey = false;
        foreach ($dateFieldPatterns as $pattern) {
            if (str_contains($key, $pattern)) {
                $isDateKey = true;
                break;
            }
        }

        if (!$isDateKey) {
            return false;
        }

        // Check if value is a Carbon instance or ISO date string
        if ($value instanceof \Carbon\Carbon || $value instanceof \DateTimeInterface) {
            return true;
        }

        // Check if value is an ISO date string
        if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
            return true;
        }

        return false;
    }

    /**
     * Format a date value to YYYY-MM-DD format
     */
    protected function formatDateValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        try {
            // If it's already a Carbon instance
            if ($value instanceof \Carbon\Carbon) {
                return $value->toDateString();
            }

            // If it's a DateTimeInterface
            if ($value instanceof \DateTimeInterface) {
                return \Carbon\Carbon::instance($value)->toDateString();
            }

            // If it's a string, try to parse it
            if (is_string($value)) {
                // If already in YYYY-MM-DD format, return as is
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
                    return $value;
                }

                // Try to parse and format
                $carbon = \Carbon\Carbon::parse($value);
                return $carbon->toDateString();
            }
        } catch (\Exception $e) {
            // If parsing fails, return original value
            return is_string($value) ? $value : null;
        }

        return null;
    }

    /**
     * Convert old log format to new format
     * Helper method for migration
     */
    public function convertOldLog(array $oldLog, string $sourceType): array
    {
        // Map old action types to new format
        $actionMap = [
            'CREATE' => 'created',
            'UPDATE' => 'updated',
            'DELETE' => 'deleted',
        ];

        $action = $actionMap[$oldLog['action_type']] ?? strtolower($oldLog['action_type'] ?? 'unknown');

        // Determine module and entity type based on source
        $module = match($sourceType) {
            'employee' => 'employees',
            'user' => 'users',
            'organizational' => 'organizational',
            default => 'unknown',
        };

        $entityType = match($sourceType) {
            'employee' => 'Employee',
            'user' => 'User',
            'organizational' => $oldLog['unit_type'] ?? 'Organizational',
            default => 'Unknown',
        };

        // Build description
        $description = $oldLog['new_value'] ?? $oldLog['description'] ?? '';
        if (is_array($description)) {
            $description = json_encode($description);
        }

        // Handle field changes
        if (!empty($oldLog['field_changed'])) {
            $fieldName = str_replace('_', ' ', $oldLog['field_changed']);
            $fieldName = ucwords($fieldName);
            $description = "Updated {$fieldName}: " . $description;
        }

        return [
            'action' => $action,
            'module' => $module,
            'entity_type' => $entityType,
            'entity_id' => $oldLog['employee_id'] ?? $oldLog['user_id'] ?? $oldLog['unit_id'] ?? null,
            'description' => $description,
            'old_values' => $oldLog['old_value'] ?? null,
            'new_values' => $oldLog['new_value'] ?? null,
            'snapshot' => $oldLog['snapshot'] ?? null,
            'reference_number' => $oldLog['reference_number'] ?? null,
            'performed_by' => $oldLog['performed_by'] ?? Auth::user()?->name ?? 'System',
            'created_at' => $oldLog['action_date'] ?? now(),
        ];
    }
}
