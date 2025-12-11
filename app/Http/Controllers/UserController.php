<?php
namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\Employee;
use App\Models\User;
use App\Models\UserAuditLog;
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
        $authUser = Auth::user();
        $rolePriority = ['super-admin', 'admin', 'editor', 'user'];
        $authRoles = $authUser->getRoleNames()->map(fn ($r) => strtolower($r))->toArray();
        $authUserRole = collect($rolePriority)->first(fn ($r) => in_array($r, $authRoles));

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $showDeleted = $request->boolean('show_deleted', false);

        $userQuery = User::with('roles');

        if (! $authUserRole) {
            abort(403, 'Unauthorized Access Prevented');
        }

        if ($authUserRole === 'admin') {
            $userQuery->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'super-admin');
            });
        } elseif ($authUserRole === 'editor') {
            $userQuery->whereHas('roles', function ($q) {
                $q->whereIn('name', ['editor', 'user']);
            });
        } elseif ($authUserRole === 'user') {
            $userQuery->whereHas('roles', function ($q) {
                $q->whereIn('name', ['user']);
            });
        }

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
            $roles = SpatieRole::whereIn('id', $request->roles)->pluck('name');
            $user->syncRoles($roles);

            // Log user creation
            $userName = $this->getUserName($user);
            UserAuditLog::create([
                'user_id' => $user->id,
                'action_type' => 'CREATE',
                'field_changed' => null,
                'old_value' => null,
                'new_value' => "Created a New User Record: {$userName}",
                'action_date' => now(),
                'performed_by' => Auth::user()->name ?? 'System',
            ]);

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

            $roles = SpatieRole::whereIn('id', $request->roles)->pluck('name');
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

            foreach ($changes as $field => $change) {
                UserAuditLog::create([
                    'user_id' => $user->id,
                    'action_type' => 'UPDATE',
                    'field_changed' => $field,
                    'old_value' => $change['old'],
                    'new_value' => $change['new'],
                    'action_date' => now(),
                    'performed_by' => Auth::user()->name ?? 'System',
                ]);
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
                $user->refresh();
                UserAuditLog::create([
                    'user_id' => $userId,
                    'action_type' => 'DELETE',
                    'field_changed' => null,
                    'old_value' => null,
                    'new_value' => "User Record Soft-Deleted: {$userName}",
                    'action_date' => now(),
                    'performed_by' => Auth::user()->name ?? 'System',
                ]);
                
                return redirect()->route('users.index')->with('success', 'User deactivated successfully');
            } else {
                // Log permanent deletion before force delete
                UserAuditLog::create([
                    'user_id' => $userId,
                    'action_type' => 'DELETE',
                    'field_changed' => null,
                    'old_value' => null,
                    'new_value' => "User Record Permanently Deleted: {$userName}",
                    'action_date' => now(),
                    'performed_by' => Auth::user()->name ?? 'System',
                ]);
                
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

        $deletedAt = $user->deleted_at;
        $user->restore();

        // Log user restoration
        UserAuditLog::create([
            'user_id' => $user->id,
            'action_type' => 'UPDATE',
            'field_changed' => 'restored',
            'old_value' => ['deleted_at' => $deletedAt ? $deletedAt->toDateTimeString() : null],
            'new_value' => ['deleted_at' => null],
            'action_date' => now(),
            'performed_by' => Auth::user()->name ?? 'System',
        ]);

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
        UserAuditLog::create([
            'user_id' => $userId,
            'action_type' => 'DELETE',
            'field_changed' => null,
            'old_value' => null,
            'new_value' => "User Record Permanently Deleted: {$userName}",
            'action_date' => now(),
            'performed_by' => Auth::user()->name ?? 'System',
        ]);
        
        $user->forceDelete();

        return redirect()->route('users.index')->with('success', 'User has been permanently deleted.');
    }

    /**
     * Get user logs
     */
    public function logs(Request $request)
    {
        abort_unless($request->user()->can('view-user-log'), 403, 'Unauthorized action.');

        $logs = UserAuditLog::with('user:id,name,email')
            ->orderBy('action_date', 'desc')
            ->limit(500)
            ->get();

        $users = User::select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return Inertia::render('users/logs', [
            'logs' => $logs,
            'users' => $users,
        ]);
    }

    /**
     * Get user name for logging
     */
    protected function getUserName(User $user): string
    {
        return $user->name ?? $user->email ?? "User #{$user->id}";
    }
}
