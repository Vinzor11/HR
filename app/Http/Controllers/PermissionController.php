<?php
namespace App\Http\Controllers;

use App\Http\Requests\PermissionRequest;
use App\Models\Permission;
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
            $permission->module      = $request->module;
            $permission->label       = $request->label;
            $permission->name        = Str::slug($request->label);
            $permission->description = $request->description;

            $permission->save();
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
            $permission->delete();
            return redirect()->route('permissions.index')->with('success', 'Permission deleted successfully!');
        }

        return redirect()->back()->with('error', 'Unable to delete Permission. Please try again!');
    }
}
