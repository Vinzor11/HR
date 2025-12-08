<?php

namespace App\Http\Controllers;

use App\Models\OrganizationalAuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrganizationalLogController extends Controller
{
    public function logs(Request $request): Response
    {
        abort_unless($request->user()->can('view-organizational-log'), 403, 'Unauthorized action.');

        $unitType = $request->input('unit_type', 'all');
        
        $logs = OrganizationalAuditLog::query()
            ->when($unitType !== 'all', function ($query) use ($unitType) {
                $query->where('unit_type', $unitType);
            })
            ->orderBy('action_date', 'desc')
            ->limit(500)
            ->get()
            ->map(function ($log) {
                // Load the related unit data
                $unit = null;
                $unitName = null;
                $unitCode = null;
                
                if ($log->unit_type === 'faculty') {
                    $unit = \App\Models\Faculty::withTrashed()->find($log->unit_id);
                    $unitName = $unit?->name;
                    $unitCode = $unit?->code;
                } elseif ($log->unit_type === 'department' || $log->unit_type === 'office') {
                    // Both departments and offices are stored in the departments table
                    $unit = \App\Models\Department::withTrashed()->find($log->unit_id);
                    $unitName = $unit?->name;
                    $unitCode = $unit?->code;
                } elseif ($log->unit_type === 'position') {
                    $unit = \App\Models\Position::withTrashed()->find($log->unit_id);
                    $unitName = $unit?->pos_name;
                    $unitCode = $unit?->pos_code;
                }
                
                // If unit_name is null but we have a DELETE action with name in new_value, extract it
                if (!$unitName && $log->action_type === 'DELETE' && is_string($log->new_value)) {
                    // Extract name from format like "Position Record Deleted: {name}" or "{Label} Record Deleted: {name}"
                    if (preg_match('/:\s*(.+)$/', $log->new_value, $matches)) {
                        $unitName = trim($matches[1]);
                    }
                }
                
                return [
                    'record_id' => $log->record_id,
                    'unit_type' => $log->unit_type,
                    'unit_id' => $log->unit_id,
                    'reference_number' => $log->reference_number,
                    'action_type' => $log->action_type,
                    'field_changed' => $log->field_changed,
                    'old_value' => $log->old_value,
                    'new_value' => $log->new_value,
                    'action_date' => $log->action_date->toIso8601String(),
                    'performed_by' => $log->performed_by,
                    'unit_name' => $unitName,
                    'unit_code' => $unitCode,
                ];
            });

        return Inertia::render('organizational/logs', [
            'logs' => $logs,
        ]);
    }
}
