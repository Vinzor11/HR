<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Collection;
use PragmaRX\Google2FA\Google2FA;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorController extends Controller
{
    /**
     * Show the two factor authentication setup page.
     */
    public function show(): Response
    {
        $user = Auth::user();
        $google2fa = new Google2FA();
        
        // Generate secret if not exists
        if (!$user->two_factor_secret) {
            $secret = $google2fa->generateSecretKey();
            $user->two_factor_secret = $secret;
            $user->save();
        }

        // Generate QR code
        $qrCodeUrl = $this->generateQrCode($user->email, $user->two_factor_secret);

        return Inertia::render('settings/two-factor', [
            'qrCode' => $qrCodeUrl,
            'secret' => $user->two_factor_secret,
            'enabled' => $user->hasTwoFactorEnabled(),
            'recoveryCodes' => $user->two_factor_recovery_codes ?? [],
        ]);
    }

    /**
     * Enable two factor authentication.
     */
    public function enable(Request $request)
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = Auth::user();
        $google2fa = new Google2FA();

        // Verify the code
        $valid = $google2fa->verifyKey($user->two_factor_secret, $request->code);

        if (!$valid) {
            return back()->withErrors(['code' => 'The provided two factor authentication code was invalid.']);
        }

        // Generate recovery codes
        $recoveryCodes = $this->generateRecoveryCodes();

        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->save();

        return back()->with('status', 'Two factor authentication has been enabled.');
    }

    /**
     * Disable two factor authentication.
     */
    public function disable(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ]);

        $user = Auth::user();
        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return back()->with('status', 'Two factor authentication has been disabled.');
    }

    /**
     * Regenerate recovery codes.
     */
    public function regenerateRecoveryCodes(Request $request)
    {
        $request->validate([
            'password' => ['required', 'string', 'current_password'],
        ]);

        $user = Auth::user();
        $recoveryCodes = $this->generateRecoveryCodes();
        $user->two_factor_recovery_codes = $recoveryCodes;
        $user->save();

        return back()->with('status', 'Recovery codes have been regenerated.');
    }

    /**
     * Generate QR code for the secret.
     */
    private function generateQrCode(string $email, string $secret): string
    {
        $google2fa = new Google2FA();
        $qrCodeUrl = $google2fa->getQRCodeUrl(
            config('app.name'),
            $email,
            $secret
        );

        $renderer = new ImageRenderer(
            new RendererStyle(400),
            new SvgImageBackEnd()
        );
        $writer = new Writer($renderer);
        
        return 'data:image/svg+xml;base64,' . base64_encode($writer->writeString($qrCodeUrl));
    }

    /**
     * Generate recovery codes.
     */
    private function generateRecoveryCodes(): array
    {
        return Collection::times(8, function () {
            return bin2hex(random_bytes(4)) . '-' . bin2hex(random_bytes(4));
        })->all();
    }
}
