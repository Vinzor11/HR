<?php
namespace App\Http\Controllers;

use App\Http\Requests\PermissionRequest;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Http\Request;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');

        $permissions = Permission::when($search, function ($query) use ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('label', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('module', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        })
        ->latest()
        ->paginate($perPage)
        ->withQueryString();
        
        return Inertia::render('permissions/index', [
            'permissions' => $permissions,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage,
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(PermissionRequest $request)
    {
        abort_unless($request->user()->can('create-permission'), 403, 'Unauthorized action.');
        
        $permission = Permission::create([
            'module'      => $request->module,
            'label'       => $request->label,
            'name'        => Str::slug($request->label),
            'description' => $request->description,
        ]);

        if ($permission) {
            // Log permission creation
            app(AuditLogService::class)->logCreated(
                'permissions',
                'Permission',
                (string)$permission->id,
                "Created a New Permission: {$permission->label}",
                null,
                $permission
            );

            return redirect()->route('permissions.index')->with('success', 'Permission created successfully!');
        }
        return redirect()->back()->with('error', 'Unable to create Permission. Please try again!');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(PermissionRequest $request, Permission $permission)
    {
        abort_unless($request->user()->can('edit-permission'), 403, 'Unauthorized action.');
        
        if ($permission) {
            // Get original values before update
            $original = $permission->getOriginal();
            
            $permission->module      = $request->module;
            $permission->label       = $request->label;
            $permission->name        = Str::slug($request->label);
            $permission->description = $request->description;

            $permission->save();

            // Collect all changes for a single audit log entry
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];
            
            foreach (['module', 'label', 'name', 'description'] as $field) {
                $oldValue = $original[$field] ?? null;
                $newValue = $permission->$field;
                
                if ($oldValue !== $newValue) {
                    $fieldName = str_replace('_', ' ', $field);
                    $fieldName = ucwords($fieldName);
                    
                    $oldValueFormatted = is_array($oldValue) ? implode(', ', $oldValue) : (string)($oldValue ?? '');
                    $newValueFormatted = is_array($newValue) ? implode(', ', $newValue) : (string)($newValue ?? '');
                    
                    $oldValues[$field] = $oldValue;
                    $newValues[$field] = $newValue;
                    $changeDescriptions[] = "{$fieldName}: {$oldValueFormatted} > {$newValueFormatted}";
                }
            }

            // Create a single audit log entry if there are any changes
            if (!empty($oldValues) && !empty($newValues)) {
                $description = implode('; ', $changeDescriptions);
                app(AuditLogService::class)->logUpdated(
                    'permissions',
                    'Permission',
                    (string)$permission->id,
                    $description,
                    $oldValues,
                    $newValues,
                    $permission
                );
            }

            return redirect()->route('permissions.index')->with('success', 'Permission updated successfully!');
        }
        return redirect()->back()->with('error', 'Unable to update Permission. Please try again!');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Permission $permission)
    {
        abort_unless($request->user()->can('delete-permission'), 403, 'Unauthorized action.');
        
        if ($permission) {
            // Log permission deletion
            app(AuditLogService::class)->logDeleted(
                'permissions',
                'Permission',
                (string)$permission->id,
                "Record was marked inactive and hidden from normal views.",
                null,
                $permission
            );

            $permission->delete();
            return redirect()->route('permissions.index')->with('success', 'Permission deleted successfully!');
        }

        return redirect()->back()->with('error', 'Unable to delete Permission. Please try again!');
    }
}
