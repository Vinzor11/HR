<?php
namespace App\Http\Controllers;

use App\Models\Role;
use Inertia\Inertia;
use App\Models\Permission;
use App\Services\AuditLogService;
use Illuminate\Support\Str;
use App\Http\Requests\RoleRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        abort_unless($request->user()->can('access-roles-module'), 403, 'Unauthorized action.');

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $searchMode = $request->input('search_mode', 'any');

        $roles = Role::with('permissions')
            ->when($search, function ($query) use ($search, $searchMode) {
                $query->where(function ($q) use ($search, $searchMode) {
                    switch ($searchMode) {
                        case 'label':
                            $q->where('label', 'like', "%{$search}%");
                            break;
                        case 'name':
                            $q->where('name', 'like', "%{$search}%");
                            break;
                        case 'description':
                            $q->where('description', 'like', "%{$search}%");
                            break;
                        default:
                            $q->where('label', 'like', "%{$search}%")
                              ->orWhere('name', 'like', "%{$search}%")
                              ->orWhere('description', 'like', "%{$search}%");
                    }
                });
            })
            ->orderBy('created_at', 'asc')
            ->paginate($perPage)
            ->withQueryString();

        // Get all permissions and sort them according to the specified order
        $allPermissions = Permission::get();
        
        // Sort permissions within each module
        $sortedPermissions = $allPermissions->groupBy('module')->map(function ($modulePermissions, $moduleName) {
            // Special handling for Organizational Structure module
            if ($moduleName === 'Organizational Structure') {
                return $this->sortOrganizationalStructurePermissions($modulePermissions);
            }
            
            // Default sorting for other modules
            // Order: access - create - edit - delete - view - restore - force-delete - view logs
            return $modulePermissions->sortBy(function ($permission) {
                $name = $permission->name;
                
                // 8. view-*-log permissions (check first to avoid matching regular view-*)
                if (str_ends_with($name, '-log') || str_contains($name, '-log')) {
                    return 8;
                }
                
                // 1. access-* permissions
                if (str_starts_with($name, 'access-')) {
                    return 1;
                }
                
                // 2. create-* permissions
                if (str_starts_with($name, 'create-')) {
                    return 2;
                }
                
                // 3. edit-* permissions
                if (str_starts_with($name, 'edit-')) {
                    return 3;
                }
                
                // 4. delete-* permissions (but not force-delete-*)
                if (str_starts_with($name, 'delete-') && !str_starts_with($name, 'force-delete-')) {
                    return 4;
                }
                
                // 5. view-* permissions (regular view, not logs)
                if (str_starts_with($name, 'view-')) {
                    return 5;
                }
                
                // 6. restore-* permissions
                if (str_starts_with($name, 'restore-')) {
                    return 6;
                }
                
                // 7. force-delete-* permissions
                if (str_starts_with($name, 'force-delete-')) {
                    return 7;
                }
                
                // If it doesn't match any pattern, put it at the end
                return 99;
            })->values();
        });

        return Inertia::render('roles/index', [
            'roles'       => $roles,
            'permissions' => $sortedPermissions,
            'filters' => [
                'search' => $search,
                'search_mode' => $searchMode,
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
    public function store(RoleRequest $request)
    {
        abort_unless($request->user()->can('create-role'), 403, 'Unauthorized action.');

        $roleName = Str::slug($request->label);
        
        // Check if role name already exists
        $nameExists = Role::where('name', $roleName)
            ->where('guard_name', 'web')
            ->exists();
        
        if ($nameExists) {
            return redirect()->back()
                ->withErrors(['label' => 'A role with this name already exists. Please choose a different label.'])
                ->withInput();
        }

        $role = Role::create([
            'label'       => $request->label,
            'name'        => $roleName,
            'description' => $request->description,
            'guard_name'  => 'web',
        ]);

        if ($role) {
            $permissions = $request->permissions ?? [];
            $role->syncPermissions($permissions);
            
            // Clear Spatie Permission cache
            app()[PermissionRegistrar::class]->forgetCachedPermissions();
            
            // Clear custom user permission cache for all users with this role
            $this->clearPermissionCacheForRoleUsers($role);

            // Log role creation
            app(AuditLogService::class)->logCreated(
                'roles',
                'Role',
                (string)$role->id,
                "Created a New Role: {$role->label}",
                null,
                $role
            );

            return redirect()->route('roles.index')->with('success', 'Role created successfully with Permissions!');
        }
        return redirect()->back()->with('error', 'Unable to create Role with permissions. Please try again!');
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
    public function update(RoleRequest $request, Role $role)
    {
        abort_unless($request->user()->can('edit-role'), 403, 'Unauthorized action.');

        if ($role) {
            $newName = Str::slug($request->label);
            
            // Check if the new name conflicts with another role (excluding current role)
            $nameExists = Role::where('name', $newName)
                ->where('guard_name', 'web')
                ->where('id', '!=', $role->id)
                ->exists();
            
            if ($nameExists) {
                return redirect()->back()
                    ->withErrors(['label' => 'A role with this name already exists. Please choose a different label.'])
                    ->withInput();
            }
            
            // Get original values before update
            $original = $role->getOriginal();
            $oldPermissions = $role->permissions->pluck('id')->toArray();
            
            $role->label       = $request->label;
            $role->name        = $newName;
            $role->description = $request->description;

            $role->save();

            # Update the permissions
            $permissions = $request->permissions ?? [];
            $role->syncPermissions($permissions);
            
            // Clear Spatie Permission cache
            app()[PermissionRegistrar::class]->forgetCachedPermissions();
            
            // Clear custom user permission cache for all users with this role
            $this->clearPermissionCacheForRoleUsers($role);
            
            $role->refresh(); // Refresh to get updated permissions
            $newPermissions = $role->permissions->pluck('id')->toArray();

            // Collect all changes for a single audit log entry
            $oldValues = [];
            $newValues = [];
            $changeDescriptions = [];

            // Track field changes
            $fieldsToTrack = ['label', 'name', 'description'];
            foreach ($fieldsToTrack as $field) {
                $oldValue = $original[$field] ?? null;
                $newValue = $role->$field;
                
                if ($oldValue !== $newValue) {
                    $fieldName = str_replace('_', ' ', $field);
                    $fieldName = ucwords($fieldName);
                    
                    $oldValues[$field] = $oldValue;
                    $newValues[$field] = $newValue;
                    $changeDescriptions[] = "{$fieldName}: {$oldValue} > {$newValue}";
                }
            }

            // Track permission changes - show added/removed instead of full lists
            if ($oldPermissions !== $newPermissions) {
                $oldPermissionNames = \App\Models\Permission::whereIn('id', $oldPermissions)->pluck('label')->toArray();
                $newPermissionNames = \App\Models\Permission::whereIn('id', $newPermissions)->pluck('label')->toArray();
                
                // Calculate added and removed permissions
                $added = array_diff($newPermissionNames, $oldPermissionNames);
                $removed = array_diff($oldPermissionNames, $newPermissionNames);
                
                $changeParts = [];
                if (!empty($added)) {
                    $changeParts[] = "Added: " . implode(', ', $added);
                }
                if (!empty($removed)) {
                    $changeParts[] = "Removed: " . implode(', ', $removed);
                }
                
                if (!empty($changeParts)) {
                    $oldValues['permissions'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $newValues['permissions'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                    $changeDescriptions[] = "Permissions: " . implode('; ', $changeParts);
                }
            }

            // Create a single audit log entry if there are any changes
            if (!empty($oldValues) && !empty($newValues)) {
                $description = implode('; ', $changeDescriptions);
                
                app(AuditLogService::class)->logUpdated(
                    'roles',
                    'Role',
                    (string)$role->id,
                    $description,
                    $oldValues,
                    $newValues,
                    $role
                );
            }

            return redirect()->route('roles.index')->with('success', 'Role updated successfully with Permissions!');
        }
        return redirect()->back()->with('error', 'Unable to update Role with permissions. Please try again!');

    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Role $role)
    {
        abort_unless(request()->user()->can('delete-role'), 403, 'Unauthorized action.');

        if ($role) {
            // Check if role has users assigned
            $userCount = $role->users()->count();
            if ($userCount > 0) {
                return redirect()
                    ->route('roles.index')
                    ->with('error', "Cannot delete role. It has {$userCount} user(s) assigned. Please reassign users to other roles first.");
            }

            // Log role soft deletion
            app(AuditLogService::class)->logDeleted(
                'roles',
                'Role',
                (string)$role->id,
                "Record was marked inactive and hidden from normal views.",
                null,
                $role
            );

            $role->delete();

            return redirect()->route('roles.index')->with('success', 'Role deleted successfully!');
        }
        return redirect()->back()->with('error', 'Unable to delete Role. Please try again!');
    }

    /**
     * Sort Organizational Structure permissions with separators
     * Order: Sectors -> Units -> Positions -> Position Whitelist -> Academic Ranks -> Staff Grades
     * Each group: access -> create -> edit -> delete -> view -> restore -> force-delete
     */
    private function sortOrganizationalStructurePermissions($permissions)
    {
        $sorted = collect();
        $usedIds = collect();
        
        // Define the order of resource types
        $resourceOrder = [
            'sector',
            'unit',
            'position',
            'unit-position',  // Position Whitelist
            'academic-rank',
            'staff-grade',
        ];
        
        foreach ($resourceOrder as $resourceType) {
            $resourcePerms = $permissions->filter(function ($perm) use ($usedIds, $resourceType) {
                $name = $perm->name;
                $matches = $this->matchesResourceType($name, $resourceType);
                if ($matches && !$usedIds->contains($perm->id)) {
                    $usedIds->push($perm->id);
                    return true;
                }
                return false;
            })->sortBy(function ($permission) use ($resourceType) {
                return $this->getPermissionOrder($permission->name, $resourceType);
            });
            
            if ($resourcePerms->isNotEmpty()) {
                $sorted = $sorted->merge($resourcePerms);
            }
        }
        
        // Add any remaining permissions that weren't matched
        $remainingPerms = $permissions->filter(function ($perm) use ($usedIds) {
            return !$usedIds->contains($perm->id);
        })->sortBy(function ($permission) {
            return $this->getPermissionOrder($permission->name, 'other');
        });
        
        if ($remainingPerms->isNotEmpty()) {
            $sorted = $sorted->merge($remainingPerms);
        }
        
        // Add resource type metadata to each permission for frontend separator detection
        return $sorted->map(function ($perm) {
            $name = $perm->name;
            $perm->_resource_type = $this->getResourceType($name);
            return $perm;
        })->values();
    }
    
    /**
     * Check if permission name matches a resource type
     */
    private function matchesResourceType($name, $resourceType)
    {
        switch ($resourceType) {
            case 'sector':
                return str_contains($name, '-sector') && !str_contains($name, 'unit');
            case 'unit':
                return str_contains($name, '-unit') && !str_contains($name, 'unit-position');
            case 'position':
                return str_contains($name, '-position') && !str_contains($name, 'unit-position');
            case 'unit-position':
                return str_contains($name, 'unit-position');
            case 'academic-rank':
                return str_contains($name, 'academic-rank');
            case 'staff-grade':
                return str_contains($name, 'staff-grade');
            default:
                return false;
        }
    }
    
    /**
     * Determine resource type from permission name
     */
    private function getResourceType($name)
    {
        if (str_contains($name, 'unit-position')) {
            return 'unit-position';
        }
        if (str_contains($name, '-sector')) {
            return 'sector';
        }
        if (str_contains($name, '-unit')) {
            return 'unit';
        }
        if (str_contains($name, '-position')) {
            return 'position';
        }
        if (str_contains($name, 'academic-rank')) {
            return 'academic-rank';
        }
        if (str_contains($name, 'staff-grade')) {
            return 'staff-grade';
        }
        return 'other';
    }
    
    /**
     * Get order for a permission within a resource type
     * Order: access - create - edit - delete - view - restore - force-delete
     */
    private function getPermissionOrder($name, $resourceType)
    {
        // 1. access-* permissions
        if (str_starts_with($name, 'access-')) {
            return 1;
        }
        
        // 2. create-* permissions
        if (str_starts_with($name, 'create-')) {
            return 2;
        }
        
        // 3. edit-* permissions
        if (str_starts_with($name, 'edit-')) {
            return 3;
        }
        
        // 4. delete-* permissions (but not force-delete-*)
        if (str_starts_with($name, 'delete-') && !str_starts_with($name, 'force-delete-')) {
            return 4;
        }
        
        // 5. view-* permissions
        if (str_starts_with($name, 'view-')) {
            return 5;
        }
        
        // 6. restore-* permissions
        if (str_starts_with($name, 'restore-')) {
            return 6;
        }
        
        // 7. force-delete-* permissions
        if (str_starts_with($name, 'force-delete-')) {
            return 7;
        }
        
        return 99;
    }
    
    /**
     * Clear permission cache for all users with a given role
     * This ensures that when role permissions are updated, users see the changes immediately
     */
    private function clearPermissionCacheForRoleUsers(Role $role): void
    {
        $usersWithRole = $role->users()->get();
        
        foreach ($usersWithRole as $user) {
            // Get current cache key before touching
            $roleIds = $user->roles()->pluck('id')->sort()->implode(',');
            $currentTimestamp = $user->updated_at->timestamp;
            $cacheKey = "user_permissions_{$user->id}_{$currentTimestamp}_roles_{$roleIds}";
            
            // Clear the cache with current timestamp
            Cache::forget($cacheKey);
            
            // Touch user to change updated_at, which will change the cache key on next request
            // This ensures that even if we missed clearing the cache, the next request will use a new key
            // and fetch fresh permissions from the database
            $user->touch();
        }
    }
}
