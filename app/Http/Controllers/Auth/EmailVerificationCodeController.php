<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\VerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Models\UserAuditLog;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationCodeController extends Controller
{
    /**
     * Show the verification code entry page.
     */
    public function show(Request $request): Response|RedirectResponse
    {
        $email = session('verification_email');
        
        if (!$email) {
            return redirect()->route('register')->with('error', 'Please start the registration process again.');
        }

        return Inertia::render('auth/verify-email-code', [
            'email' => $email,
        ]);
    }

    /**
     * Handle the initial registration and send verification code.
     */
    public function sendCode(Request $request): RedirectResponse
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

        // Store pending user data
        $pendingUserData = [
            'name' => $request->name,
            'email' => $request->email,
            'employee_id' => $request->employee_id,
            'password' => Hash::make($request->password),
        ];

        // Create verification code
        $verification = EmailVerificationCode::createForEmail(
            $request->email,
            $pendingUserData
        );

        // Send verification email
        Mail::to($request->email)->send(
            new VerificationCodeMail($verification->code, $request->name)
        );

        // Store email in session for the verification page
        session(['verification_email' => $request->email]);

        return redirect()->route('verification.code.show');
    }

    /**
     * Verify the code and complete registration.
     */
    public function verify(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $email = session('verification_email');
        
        if (!$email) {
            return redirect()->route('register')->with('error', 'Please start the registration process again.');
        }

        $verification = EmailVerificationCode::where('email', $email)
            ->where('verified', false)
            ->latest()
            ->first();

        if (!$verification) {
            return back()->withErrors(['code' => 'No verification code found. Please request a new code.']);
        }

        if ($verification->isExpired()) {
            return back()->withErrors(['code' => 'The verification code has expired. Please request a new code.']);
        }

        if ($verification->code !== $request->code) {
            return back()->withErrors(['code' => 'The verification code is incorrect.']);
        }

        // Mark as verified
        $verification->update(['verified' => true]);

        // Create the user
        $userData = $verification->pending_user_data;
        $user = User::create([
            'name' => $userData['name'],
            'email' => $userData['email'],
            'employee_id' => $userData['employee_id'],
            'password' => $userData['password'],
            'email_verified_at' => now(), // Mark email as verified
        ]);

        // Log user registration
        $userName = $user->name ?? $user->email ?? "User #{$user->id}";
        UserAuditLog::create([
            'user_id' => $user->id,
            'action_type' => 'CREATE',
            'field_changed' => null,
            'old_value' => null,
            'new_value' => "Created a New User Record: {$userName} (Self-Registered with Email Verification)",
            'action_date' => now(),
            'performed_by' => $userName,
        ]);

        event(new Registered($user));

        // Clear session
        session()->forget('verification_email');

        // Delete the verification record
        $verification->delete();

        // Log in the user
        Auth::login($user);

        return to_route('dashboard');
    }

    /**
     * Resend the verification code.
     */
    public function resend(Request $request): RedirectResponse
    {
        $email = session('verification_email');
        
        if (!$email) {
            return redirect()->route('register')->with('error', 'Please start the registration process again.');
        }

        $existingVerification = EmailVerificationCode::where('email', $email)
            ->where('verified', false)
            ->latest()
            ->first();

        if (!$existingVerification) {
            return redirect()->route('register')->with('error', 'Please start the registration process again.');
        }

        // Create new verification code with existing user data
        $verification = EmailVerificationCode::createForEmail(
            $email,
            $existingVerification->pending_user_data
        );

        // Send verification email
        $userName = $existingVerification->pending_user_data['name'] ?? 'User';
        Mail::to($email)->send(
            new VerificationCodeMail($verification->code, $userName)
        );

        return back()->with('success', 'A new verification code has been sent to your email.');
    }
}

