<?php
namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\Role;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Spatie\Permission\Models\Role as SpatieRole;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $authUser     = Auth::user();
        $authUserRole = $authUser->roles->first()?->name;

        $perPage = $request->integer('perPage', 10);
        $search = (string) $request->input('search', '');
        $showDeleted = $request->boolean('show_deleted', false);

        $userQuery = User::with('roles');

        if (! in_array($authUserRole, ['super-admin', 'admin', 'editor', 'user'])) {
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
            'employee_id' => $request->employee_id,
            'password'    => Hash::make($request->password),
        ]);

        if ($user) {
            $roles = SpatieRole::whereIn('id', $request->roles)->pluck('name');
            $user->syncRoles($roles);

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
            $user->name        = $request->name;
            $user->email       = $request->email;
            $user->employee_id = $request->employee_id;

            if ($request->filled('password')) {
                $user->password = Hash::make($request->password);
            }
            $user->save();

            $roles = SpatieRole::whereIn('id', $request->roles)->pluck('name');
            $user->syncRoles($roles);

            return redirect()->route('users.index')->with('success', 'User updated with roles');
        }

        return redirect()->back()->with('error', 'Unable to update User. Please try again!');
    }

    public function destroy(User $user)
    {
        if ($user) {
            // If user has a connected employee, deactivate (soft delete) instead of hard delete
            if ($user->employee_id) {
                $user->delete(); // Soft delete
                return redirect()->route('users.index')->with('success', 'User deactivated successfully');
            } else {
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
        
        $user->forceDelete();

        return redirect()->route('users.index')->with('success', 'User has been permanently deleted.');
    }
}
