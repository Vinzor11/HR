<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserAuditLog;
use Illuminate\Validation\Rule;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:' . User::class,
            'employee_id' => [
                'required',
                'string',
                'max:15',
                'exists:employees,id',
                Rule::unique('users', 'employee_id'),
            ],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'employee_id' => $request->employee_id,
            'password' => Hash::make($request->password),
        ]);

        // Log user registration (self-registration)
        $userName = $user->name ?? $user->email ?? "User #{$user->id}";
        UserAuditLog::create([
            'user_id' => $user->id,
            'action_type' => 'CREATE',
            'field_changed' => null,
            'old_value' => null,
            'new_value' => "Created a New User Record: {$userName} (Self-Registered)",
            'action_date' => now(),
            'performed_by' => $userName, // User registered themselves
        ]);

        event(new Registered($user));

        Auth::login($user);

        return to_route('verification.notice')->with('status', 'verification-link-sent');
    }
}
