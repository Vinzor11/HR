<?php
namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\Employee;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role as SpatieRole;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $showDeleted = $request->boolean('show_deleted', false);

        $userQuery = User::with('roles');

        $userQuery->when($showDeleted, function ($query) {
            $query->onlyTrashed();
        });

        $userQuery->when($search, function ($query) use ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('employee_id', 'like', "%{$search}%");
            });
        });

        $users = $userQuery->orderBy('created_at', 'asc')->paginate($perPage)->withQueryString();
        $roles = Role::all();
        
        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'filters' => [
                'search' => $search,
                'perPage' => $perPage,
                'show_deleted' => $showDeleted,
            ],
        ]);
    }

    public function create()
    {
        //
    }

    public function store(UserRequest $request)
    {
        $user = User::create([
            'name'        => $request->name,
            'email'       => $request->email,
            'employee_id' => $request->employee_id ?: null,
            'password'    => Hash::make($request->password),
        ]);

        if ($user) {
            $roles = !empty($request->roles) 
                ? SpatieRole::whereIn('id', $request->roles)->pluck('name')
                : collect([]);
            $user->syncRoles($roles);

            // Log user creation
            $userName = $this->getUserName($user);
            app(AuditLogService::class)->logCreated(
                'users',
                'User',
                (string)$user->id,
                "Created a New User: {$userName}",
                null,
                $user
            );

            return redirect()->route('users.index')->with('success', 'User created with roles');
        }

        return redirect()->back()->with('error', 'Unable to create User. Please try again!');
    }

    public function show(string $id)
    {
        //
    }

    public function edit(User $user)
    {
        return Inertia::render('users/index', [
            'user' => $user->load('roles'),
            'roles' => Role::all(),
            'editing' => true
        ]);
    }

    public function update(UserRequest $request, User $user)
    {
        if ($user) {
            $oldValues = [
                'name' => $user->name,
                'email' => $user->email,
                'employee_id' => $user->employee_id,
            ];
            $oldRoles = $user->roles->pluck('name')->toArray();

            $user->name        = $request->name;
            $user->email       = $request->email;
            $user->employee_id = $request->employee_id;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            $user->save();

            $roles = !empty($request->roles) 
                ? SpatieRole::whereIn('id', $request->roles)->pluck('name')
                : collect([]);
            $user->syncRoles($roles);
            $newRoles = $roles->toArray();

            // Log user updates
            $changes = [];
            if ($oldValues['name'] !== $request->name) {
                $changes['name'] = ['old' => $oldValues['name'], 'new' => $request->name];
            }
            if ($oldValues['email'] !== $request->email) {
                $changes['email'] = ['old' => $oldValues['email'], 'new' => $request->email];
            }
            if ($oldValues['employee_id'] != $request->employee_id) {
                $changes['employee_id'] = ['old' => $oldValues['employee_id'], 'new' => $request->employee_id];
            }
            if ($request->filled('password')) {
                $changes['password'] = ['old' => '[HIDDEN]', 'new' => '[CHANGED]'];
            }
            if ($oldRoles !== $newRoles) {
                $changes['roles'] = ['old' => $oldRoles, 'new' => $newRoles];
            }
            
            // Collect all changes for a single audit log entry
            $auditOldValues = [];
            $auditNewValues = [];
            $changeDescriptions = [];

            foreach ($changes as $field => $change) {
                if ($field === 'roles') {
                    // Handle roles as array diff (added/removed)
                    $added = array_diff($change['new'], $change['old']);
                    $removed = array_diff($change['old'], $change['new']);
                    
                    $changeParts = [];
                    if (!empty($added)) {
                        $changeParts[] = "Added: " . implode(', ', $added);
                    }
                    if (!empty($removed)) {
                        $changeParts[] = "Removed: " . implode(', ', $removed);
                    }
                    
                    if (!empty($changeParts)) {
                        $auditOldValues['roles'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                        $auditNewValues['roles'] = ['_change_type' => 'array_diff', '_added' => array_values($added), '_removed' => array_values($removed)];
                        $changeDescriptions[] = "Roles: " . implode('; ', $changeParts);
                    }
                } else {
                    // Handle regular field changes
                    $fieldName = str_replace('_', ' ', $field);
                    $fieldName = ucwords($fieldName);
                    
                    $oldValue = is_array($change['old']) ? implode(', ', $change['old']) : (string)$change['old'];
                    $newValue = is_array($change['new']) ? implode(', ', $change['new']) : (string)$change['new'];
                    
                    $auditOldValues[$field] = $change['old'];
                    $auditNewValues[$field] = $change['new'];
                    $changeDescriptions[] = "{$fieldName}: {$oldValue} > {$newValue}";
                }
            }

            // Create a single audit log entry if there are any changes
            if (!empty($auditOldValues) && !empty($auditNewValues)) {
                $description = implode('; ', $changeDescriptions);
                
                app(AuditLogService::class)->logUpdated(
                    'users',
                    'User',
                    (string)$user->id,
                    $description,
                    $auditOldValues,
                    $auditNewValues,
                    $user
                );
            }

            return redirect()->route('users.index')->with('success', 'User updated with roles');
        }

        return redirect()->back()->with('error', 'Unable to update User. Please try again!');
    }

    public function destroy(User $user)
    {
        if ($user) {
            $userId = $user->id;
            $userName = $this->getUserName($user);
            
            // If user has a connected employee, deactivate (soft delete) instead of hard delete
            if ($user->employee_id) {
                $user->delete(); // Soft delete
                
                // Log user soft deletion
                app(AuditLogService::class)->logDeleted(
                    'users',
                    'User',
                    (string)$userId,
                    "Record was marked inactive and hidden from normal views.",
                    null,
                    $user
                );
                
                return redirect()->route('users.index')->with('success', 'User deactivated successfully');
            } else {
                // Log permanent deletion before force delete
                app(AuditLogService::class)->logPermanentlyDeleted(
                    'users',
                    'User',
                    (string)$userId,
                    "Record was permanently removed and cannot be recovered.",
                    null,
                    $user
                );
                
                $user->forceDelete(); // Hard delete
                return redirect()->route('users.index')->with('success', 'User deleted successfully');
            }
        }
        return redirect()->back()->with('error', 'Unable to delete User. Please try again!');
    }

    /**
     * Restore a soft-deleted user
     */
    public function restore($id)
    {
        abort_unless(request()->user()->can('restore-user'), 403, 'Unauthorized action.');

        $user = User::withTrashed()->findOrFail($id);
        
        if (!$user->trashed()) {
            return redirect()->route('users.index')->with('error', 'User is not deactivated.');
        }

        // Log user restoration BEFORE restoring
        app(AuditLogService::class)->logRestored(
            'users',
            'User',
            (string)$user->id,
            "Record was restored and returned to active use.",
            $user
        );

        $user->restore();

        return redirect()->route('users.index')->with('success', 'User has been restored successfully.');
    }

    /**
     * Permanently delete a user
     */
    public function forceDelete($id)
    {
        abort_unless(request()->user()->can('force-delete-user'), 403, 'Unauthorized action.');

        $user = User::withTrashed()->findOrFail($id);
        $userId = $user->id;
        $userName = $this->getUserName($user);
        
        // Log permanent deletion before force delete
        app(AuditLogService::class)->logPermanentlyDeleted(
            'users',
            'User',
            (string)$userId,
            "Record was permanently removed and cannot be recovered.",
            null,
            $user
        );
        
        $user->forceDelete();

        return redirect()->route('users.index')->with('success', 'User has been permanently deleted.');
    }

    /**
     * Get user logs - redirects to unified audit logs
     */
    public function logs(Request $request)
    {
        // Redirect to unified audit logs filtered by users module
        return redirect()->route('audit-logs.index', ['module' => 'users']);
    }

    /**
     * Get user name for logging
     */
    protected function getUserName(User $user): string
    {
        return $user->name ?? $user->email ?? "User #{$user->id}";
    }
}
