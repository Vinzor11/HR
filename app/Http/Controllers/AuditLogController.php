<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use App\Models\Employee;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    /**
     * Display the audit logs page
     */
    public function index(Request $request): Response
    {
        // Check permission
        abort_unless(
            $request->user()->can('view-audit-logs'),
            403,
            'You do not have permission to view audit logs.'
        );

        $query = AuditLog::with(['user:id,name,email', 'user.roles' => function($q) {
                $q->whereHas('permissions')->select('roles.id', 'roles.name');
            }])
            ->orderBy('created_at', 'desc');

        // Apply filters
        if ($request->filled('module')) {
            $query->forModule($request->module);
        }

        if ($request->filled('action')) {
            $query->forAction($request->action);
        }

        if ($request->filled('user_id')) {
            $query->forUser($request->user_id);
        }

        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }

        if ($request->filled('entity_id')) {
            $query->where('entity_id', $request->entity_id);
        }

        if ($request->filled('search')) {
            $searchMode = $request->input('search_mode', 'any');
            $query->search($request->search, $searchMode);
        }

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        // Get per_page from request, with validation and default
        $perPage = min(max((int) $request->input('per_page', 50), 10), 100);

        // Paginate results
        $logs = $query->paginate($perPage)->withQueryString();

        // Enhance logs with entity information (employee/user names)
        $logs->getCollection()->transform(function ($log) {
            // Add entity name from snapshot or description
            $log->entity_name = null;
            
            if ($log->entity_type === 'Employee' && $log->entity_id) {
                $firstName = '';
                $middleName = '';
                $surname = '';
                
                // Try to get from snapshot first
                if ($log->snapshot && isset($log->snapshot['first_name'])) {
                    $firstName = $log->snapshot['first_name'] ?? '';
                    $middleName = $log->snapshot['middle_name'] ?? '';
                    $surname = $log->snapshot['surname'] ?? '';
                } else {
                    // Fallback: try to load employee
                    $employee = Employee::withTrashed()->find($log->entity_id);
                    if ($employee) {
                        $firstName = $employee->first_name ?? '';
                        $middleName = $employee->middle_name ?? '';
                        $surname = $employee->surname ?? '';
                    }
                }
                
                // For update actions in employee module, format as "Lastname, Firstname MI."
                if ($log->action === 'updated' && $log->module === 'employees' && ($surname || $firstName)) {
                    $middleInitial = $middleName ? strtoupper(substr($middleName, 0, 1)) . '.' : '';
                    $parts = array_filter([$surname, $firstName]);
                    $formattedName = count($parts) > 1 
                        ? $parts[0] . ', ' . $parts[1] . ($middleInitial ? ' ' . $middleInitial : '')
                        : ($parts[0] ?? '');
                    $log->entity_name = $formattedName;
                } elseif ($surname || $firstName) {
                    // For other actions, use full name format
                    $log->entity_name = trim("{$firstName} {$middleName} {$surname}");
                }
            } elseif ($log->entity_type === 'User' && $log->entity_id) {
                // Try to get from snapshot first
                if ($log->snapshot && isset($log->snapshot['name'])) {
                    $log->entity_name = $log->snapshot['name'];
                } else {
                    // Fallback: try to load user
                    $user = User::withTrashed()->find($log->entity_id);
                    if ($user) {
                        $log->entity_name = $user->name;
                    }
                }
            }
            
            return $log;
        });

        // Get filter options
        $modules = AuditLog::distinct()->pluck('module')->sort()->values();
        $actions = AuditLog::distinct()->pluck('action')->sort()->values();
        $entityTypes = AuditLog::distinct()->pluck('entity_type')->sort()->values();
        $users = User::select('id', 'name', 'email')
            ->whereIn('id', AuditLog::distinct()->pluck('user_id')->filter())
            ->orderBy('name')
            ->get();

        // Build filter fields config for advanced filter panel
        $filterFieldsConfig = [
            'general' => [
                'description' => ['type' => 'text', 'label' => 'Description'],
                'reference_number' => ['type' => 'text', 'label' => 'Reference Number'],
                'entity_id' => ['type' => 'text', 'label' => 'Entity ID'],
                'created_at' => ['type' => 'date', 'label' => 'Date'],
            ],
            'classification' => [
                'module' => ['type' => 'select', 'label' => 'Module', 'options' => $modules->toArray()],
                'action' => ['type' => 'select', 'label' => 'Action', 'options' => $actions->toArray()],
                'entity_type' => ['type' => 'select', 'label' => 'Entity Type', 'options' => $entityTypes->toArray()],
            ],
            'user' => [
                'user_id' => ['type' => 'select', 'label' => 'User', 'options' => $users->pluck('name', 'id')->map(fn($name, $id) => ['value' => (string)$id, 'label' => $name])->values()->toArray()],
            ],
        ];

        return Inertia::render('audit-logs/index', [
            'logs' => $logs,
            'filters' => $request->only(['module', 'action', 'user_id', 'entity_type', 'entity_id', 'search', 'search_mode', 'date_from', 'date_to', 'per_page']),
            'modules' => $modules,
            'actions' => $actions,
            'entityTypes' => $entityTypes,
            'users' => $users,
            'filterFieldsConfig' => $filterFieldsConfig,
        ]);
    }

    /**
     * Export audit logs to CSV with streaming for large datasets
     */
    public function export(Request $request)
    {
        abort_unless(
            $request->user()->can('view-audit-logs'),
            403,
            'You do not have permission to export audit logs.'
        );

        $query = AuditLog::with(['user:id,name,email', 'user.roles:id,name'])
            ->orderBy('created_at', 'desc');

        // Apply same filters as index
        if ($request->filled('module')) {
            $query->forModule($request->module);
        }
        if ($request->filled('action')) {
            $query->forAction($request->action);
        }
        if ($request->filled('user_id')) {
            $query->forUser($request->user_id);
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->filled('entity_id')) {
            $query->where('entity_id', $request->entity_id);
        }
        if ($request->filled('search')) {
            $searchMode = $request->input('search_mode', 'any');
            $query->search($request->search, $searchMode);
        }
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        $filename = 'audit_logs_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ];

        // Fields to exclude from changes column
        $excludedFields = [
            'created_at', 'updated_at', 'deleted_at', 'guard_name', 'id',
            'remember_token', 'email_verified_at', 'two_factor_secret',
            'two_factor_recovery_codes', 'two_factor_confirmed_at',
        ];

        $callback = function () use ($query, $excludedFields) {
            $file = fopen('php://output', 'w');
            
            // Add BOM for Excel UTF-8 compatibility
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));

            // CSV Headers
            fputcsv($file, [
                'Record ID',
                'Reference Number',
                'Date & Time',
                'Performed By',
                'User Role',
                'Action',
                'Module',
                'Entity Type',
                'Entity ID',
                'Entity Name',
                'Field Changed',
                'Old Value',
                'New Value',
                'Description',
                'IP Address',
            ]);

            // Stream data in chunks to handle large datasets
            $query->chunk(500, function ($logs) use ($file, $excludedFields) {
                foreach ($logs as $log) {
                    $baseRow = [
                        $log->id,
                        $log->reference_number ?? '',
                        $log->created_at->format('Y-m-d H:i:s'),
                        $log->user ? $log->user->name : 'System',
                        $this->formatUserRoles($log),
                        ucfirst($log->action),
                        ucfirst($log->module),
                        $log->entity_type ?? '',
                        $log->entity_id ?? '',
                        $this->getEntityName($log),
                    ];

                    // If there are field-level changes, output a row for each field
                    if ($log->old_values && $log->new_values && 
                        is_array($log->old_values) && is_array($log->new_values)) {
                        
                        $oldKeys = array_keys($log->old_values);
                        $newKeys = array_keys($log->new_values);
                        $allKeys = array_unique(array_merge($oldKeys, $newKeys));
                        $allKeys = array_filter($allKeys, fn($key) => !in_array(strtolower($key), $excludedFields));

                        if (count($allKeys) > 0) {
                            foreach ($allKeys as $key) {
                                $oldVal = $log->old_values[$key] ?? null;
                                $newVal = $log->new_values[$key] ?? null;
                                
                                // Skip if values are the same
                                if ($oldVal === $newVal) continue;

                                $fieldName = ucwords(str_replace('_', ' ', $key));
                                $oldValueText = $this->formatValueForCSV($oldVal);
                                $newValueText = $this->formatValueForCSV($newVal);

                                fputcsv($file, array_merge($baseRow, [
                                    $fieldName,
                                    $oldValueText,
                                    $newValueText,
                                    $log->description ?? '',
                                    $log->ip_address ?? '',
                                ]));
                            }
                        } else {
                            // No field changes, output single row
                            fputcsv($file, array_merge($baseRow, [
                                'N/A',
                                'N/A',
                                'N/A',
                                $log->description ?? '',
                                $log->ip_address ?? '',
                            ]));
                        }
                    } else {
                        // No changes data, output single row
                        fputcsv($file, array_merge($baseRow, [
                            'N/A',
                            $this->formatValueForCSV($log->old_values),
                            $this->formatValueForCSV($log->new_values),
                            $log->description ?? '',
                            $log->ip_address ?? '',
                        ]));
                    }
                }
            });

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Format user roles for CSV export
     */
    private function formatUserRoles(AuditLog $log): string
    {
        if ($log->user && $log->user->roles && $log->user->roles->isNotEmpty()) {
            return $log->user->roles->pluck('name')
                ->map(fn($name) => ucwords(str_replace('-', ' ', $name)))
                ->implode(', ');
        }
        return 'User';
    }

    /**
     * Get entity name from log snapshot or related data
     */
    private function getEntityName(AuditLog $log): string
    {
        // Try snapshot first
        if ($log->snapshot) {
            if ($log->entity_type === 'Employee' && isset($log->snapshot['first_name'])) {
                $firstName = $log->snapshot['first_name'] ?? '';
                $middleName = $log->snapshot['middle_name'] ?? '';
                $surname = $log->snapshot['surname'] ?? '';
                return trim("{$surname}, {$firstName}" . ($middleName ? ' ' . substr($middleName, 0, 1) . '.' : ''));
            }
            if ($log->entity_type === 'User' && isset($log->snapshot['name'])) {
                return $log->snapshot['name'];
            }
            if (isset($log->snapshot['name'])) {
                return $log->snapshot['name'];
            }
            if (isset($log->snapshot['training_title'])) {
                return $log->snapshot['training_title'];
            }
        }
        return '';
    }

    /**
     * Format a value for CSV output
     */
    private function formatValueForCSV($value): string
    {
        if ($value === null || $value === '') {
            return 'N/A';
        }
        if (is_array($value)) {
            if (empty($value)) {
                return 'N/A';
            }
            // Handle array_diff format
            if (isset($value['_change_type']) && $value['_change_type'] === 'array_diff') {
                $parts = [];
                if (!empty($value['_added'])) {
                    $parts[] = 'Added: ' . implode(', ', $value['_added']);
                }
                if (!empty($value['_removed'])) {
                    $parts[] = 'Removed: ' . implode(', ', $value['_removed']);
                }
                return $parts ? implode('; ', $parts) : 'N/A';
            }
            // For simple arrays, join values
            return implode(', ', array_map(fn($v) => $this->formatValueForCSV($v), $value));
        }
        if (is_object($value)) {
            return json_encode($value);
        }
        return (string) $value;
    }
}
