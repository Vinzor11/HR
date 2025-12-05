<?php
namespace App\Http\Controllers;

use App\Models\Role;
use Inertia\Inertia;
use App\Models\Permission;
use Illuminate\Support\Str;
use App\Http\Requests\RoleRequest;
use Illuminate\Http\Request;

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

        $roles = Role::with('permissions')
            ->when($search, function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('label', 'like', "%{$search}%")
                      ->orWhere('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
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
        ]);

        if ($role) {
            $role->syncPermissions($request->permissions);

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
            
            $role->label       = $request->label;
            $role->name        = $newName;
            $role->description = $request->description;

            $role->save();

            # Update the permissions
            $role->syncPermissions($request->permissions);

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

            $role->delete();

            return redirect()->route('roles.index')->with('success', 'Role deleted successfully!');
        }
        return redirect()->back()->with('error', 'Unable to delete Role. Please try again!');
    }

    /**
     * Sort Organizational Structure permissions with separators
     * Order: Faculty (access - create - edit - delete - view - restore - force-delete) 
     *        -> Separator
     *        -> Department (access - create - edit - delete - view - restore - force-delete)
     *        -> Separator
     *        -> Office (access - create - edit - delete - view - restore - force-delete)
     *        -> Separator
     *        -> Position (access - create - edit - delete - view - restore - force-delete)
     *        -> Separator
     *        -> view-organizational-log
     */
    private function sortOrganizationalStructurePermissions($permissions)
    {
        $sorted = collect();
        $usedIds = collect();
        
        // 1. Faculty permissions
        $facultyPerms = $permissions->filter(function ($perm) use ($usedIds) {
            $name = $perm->name;
            $isFaculty = str_contains($name, 'faculty');
            if ($isFaculty && !$usedIds->contains($perm->id)) {
                $usedIds->push($perm->id);
                return true;
            }
            return false;
        })->sortBy(function ($permission) {
            return $this->getPermissionOrder($permission->name, 'faculty');
        });
        
        if ($facultyPerms->isNotEmpty()) {
            $sorted = $sorted->merge($facultyPerms);
        }
        
        // 2. Department permissions
        $deptPerms = $permissions->filter(function ($perm) use ($usedIds) {
            $name = $perm->name;
            $isDepartment = str_contains($name, 'department') && 
                           !str_contains($name, 'organizational-log');
            if ($isDepartment && !$usedIds->contains($perm->id)) {
                $usedIds->push($perm->id);
                return true;
            }
            return false;
        })->sortBy(function ($permission) {
            return $this->getPermissionOrder($permission->name, 'department');
        });
        
        if ($deptPerms->isNotEmpty()) {
            $sorted = $sorted->merge($deptPerms);
        }
        
        // 3. Office permissions
        $officePerms = $permissions->filter(function ($perm) use ($usedIds) {
            $name = $perm->name;
            $isOffice = str_contains($name, 'office');
            if ($isOffice && !$usedIds->contains($perm->id)) {
                $usedIds->push($perm->id);
                return true;
            }
            return false;
        })->sortBy(function ($permission) {
            return $this->getPermissionOrder($permission->name, 'office');
        });
        
        if ($officePerms->isNotEmpty()) {
            $sorted = $sorted->merge($officePerms);
        }
        
        // 4. Position permissions
        $positionPerms = $permissions->filter(function ($perm) use ($usedIds) {
            $name = $perm->name;
            $isPosition = str_contains($name, 'position');
            if ($isPosition && !$usedIds->contains($perm->id)) {
                $usedIds->push($perm->id);
                return true;
            }
            return false;
        })->sortBy(function ($permission) {
            return $this->getPermissionOrder($permission->name, 'position');
        });
        
        if ($positionPerms->isNotEmpty()) {
            $sorted = $sorted->merge($positionPerms);
        }
        
        // 5. View organizational log (last)
        $logPerms = $permissions->filter(function ($perm) use ($usedIds) {
            $name = $perm->name;
            $isLog = str_contains($name, 'organizational-log');
            if ($isLog && !$usedIds->contains($perm->id)) {
                $usedIds->push($perm->id);
                return true;
            }
            return false;
        });
        
        if ($logPerms->isNotEmpty()) {
            $sorted = $sorted->merge($logPerms);
        }
        
        // Add resource type metadata to each permission for frontend separator detection
        return $sorted->map(function ($perm) {
            $name = $perm->name;
            $perm->_resource_type = $this->getResourceType($name);
            return $perm;
        })->values();
    }
    
    /**
     * Determine resource type from permission name
     */
    private function getResourceType($name)
    {
        if (str_contains($name, 'faculty')) {
            return 'faculty';
        }
        if (str_contains($name, 'department')) {
            return 'department';
        }
        if (str_contains($name, 'office')) {
            return 'office';
        }
        if (str_contains($name, 'position')) {
            return 'position';
        }
        if (str_contains($name, 'organizational-log')) {
            return 'log';
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
}
