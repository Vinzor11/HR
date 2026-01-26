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
            $query->search($request->search);
        }

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        // Paginate results
        $logs = $query->paginate(50)->withQueryString();

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

        return Inertia::render('audit-logs/index', [
            'logs' => $logs,
            'filters' => $request->only(['module', 'action', 'user_id', 'entity_type', 'entity_id', 'search', 'date_from', 'date_to']),
            'modules' => $modules,
            'actions' => $actions,
            'entityTypes' => $entityTypes,
            'users' => $users,
        ]);
    }

    /**
     * Export audit logs to CSV
     */
    public function export(Request $request)
    {
        abort_unless(
            $request->user()->can('view-audit-logs'),
            403,
            'You do not have permission to export audit logs.'
        );

        $query = AuditLog::with('user:id,name,email')
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
            $query->search($request->search);
        }
        if ($request->filled('date_from') || $request->filled('date_to')) {
            $query->dateRange($request->date_from, $request->date_to);
        }

        $logs = $query->get();

        $filename = 'audit_logs_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($logs) {
            $file = fopen('php://output', 'w');

            // CSV Headers
            fputcsv($file, [
                'Record ID',
                'Reference Number',
                'Date & Time',
                'User',
                'Action',
                'Module',
                'Entity Type',
                'Entity ID',
                'Description',
                'IP Address',
                'User Agent',
            ]);

            // CSV Rows
            foreach ($logs as $log) {
                fputcsv($file, [
                    $log->id,
                    $log->reference_number ?? '',
                    $log->created_at->format('Y-m-d H:i:s'),
                    $log->user ? $log->user->name : 'System',
                    $log->action,
                    $log->module,
                    $log->entity_type,
                    $log->entity_id ?? '',
                    $log->description,
                    $log->ip_address ?? '',
                    $log->user_agent ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
