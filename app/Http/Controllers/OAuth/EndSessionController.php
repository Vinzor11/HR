<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Laravel\Passport\ClientRepository;
use Laravel\Passport\TokenRepository;
use Laravel\Passport\Client;

class EndSessionController extends Controller
{
    public function __construct(
        protected ClientRepository $clients,
        protected TokenRepository $tokens
    ) {}

    /**
     * Handle RP-initiated logout (OpenID Connect end_session_endpoint)
     *
     * @param Request $request
     * @return RedirectResponse
     */
    public function endSession(Request $request): RedirectResponse
    {
        // Validate required parameters
        $validated = $request->validate([
            'id_token_hint' => 'nullable|string',
            'post_logout_redirect_uri' => 'nullable|url',
            'state' => 'nullable|string',
        ]);

        $idTokenHint = $validated['id_token_hint'] ?? null;
        $postLogoutRedirectUri = $validated['post_logout_redirect_uri'] ?? null;
        $state = $validated['state'] ?? null;

        // Validate post_logout_redirect_uri if provided
        if ($postLogoutRedirectUri) {
            // Check if the URI is registered for any client
            $clients = \Laravel\Passport\Client::all(); // Get all clients
            $validUri = false;

            foreach ($clients as $client) {
                // Check post_logout_redirect_uris field first (preferred)
                $postLogoutUris = $client->post_logout_redirect_uris ?? [];
                if (!is_array($postLogoutUris) && !empty($postLogoutUris)) {
                    // Handle serialized data
                    $postLogoutUris = json_decode($postLogoutUris, true) ?? [];
                }

                if (in_array($postLogoutRedirectUri, $postLogoutUris)) {
                    $validUri = true;
                    break;
                }

                // Fallback: Also check regular redirect_uris for backward compatibility
                $redirectUris = $client->redirect_uris ?? [];
                if (!is_array($redirectUris) && !empty($redirectUris)) {
                    // Handle serialized data
                    $redirectUris = json_decode($redirectUris, true) ?? [];
                }

                if (in_array($postLogoutRedirectUri, $redirectUris)) {
                    $validUri = true;
                    break;
                }
            }

            if (!$validUri) {
                Log::warning('Invalid post_logout_redirect_uri in end_session request', [
                    'uri' => $postLogoutRedirectUri,
                    'ip' => $request->ip(),
                ]);
                $postLogoutRedirectUri = null; // Ignore invalid URI
            }
        }

        // Log the logout attempt
        Log::info('OAuth end_session initiated', [
            'id_token_hint_present' => !empty($idTokenHint),
            'post_logout_redirect_uri' => $postLogoutRedirectUri,
            'state' => $state,
            'user_id' => Auth::id(),
            'ip' => $request->ip(),
        ]);

        // If user is authenticated, log them out
        if (Auth::check()) {
            $user = Auth::user();

            // Revoke all access tokens for this user
            $this->revokeUserTokens($user->id);

            // Log the logout activity
            $userAgentInfo = \App\Models\UserActivity::parseUserAgent($request->userAgent());
            \App\Models\UserActivity::create([
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_email' => $user->email,
                'activity_type' => 'oauth_logout',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'device' => $userAgentInfo['device'],
                'browser' => $userAgentInfo['browser'],
                'status' => 'success',
                'logout_time' => now(),
                'notes' => 'RP-initiated logout via end_session_endpoint',
            ]);

            // Logout the user
            Auth::logout();
        }

        // Invalidate the session
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // If post_logout_redirect_uri is provided, redirect there
        if ($postLogoutRedirectUri) {
            $redirectUrl = $postLogoutRedirectUri;

            // Add state parameter if provided
            if ($state) {
                $separator = str_contains($redirectUrl, '?') ? '&' : '?';
                $redirectUrl .= $separator . 'state=' . urlencode($state);
            }

            return redirect($redirectUrl);
        }

        // Default redirect to home page
        return redirect('/');
    }

    /**
     * Revoke all active access tokens for a user
     *
     * @param int $userId
     * @return void
     */
    protected function revokeUserTokens(int $userId): void
    {
        try {
            // Get the user model
            $user = \App\Models\User::find($userId);
            if (!$user) {
                return;
            }

            // Find all active tokens for the user
            $tokens = $this->tokens->forUser($user);

            foreach ($tokens as $token) {
                // Revoke the token
                $token->revoke();
                Log::info('Revoked OAuth token during logout', [
                    'token_id' => $token->id,
                    'client_id' => $token->client_id,
                    'user_id' => $userId,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to revoke user tokens during logout', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle back-channel logout notifications
     * This endpoint receives logout tokens from the OP when a user logs out
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function backChannelLogout(Request $request)
    {
        // This would be used if this system acts as an RP (client)
        // For now, as an OP (provider), this is not implemented
        // But kept for future extensibility

        Log::info('Back-channel logout request received', [
            'headers' => $request->headers->all(),
            'body' => $request->getContent(),
            'ip' => $request->ip(),
        ]);

        return response()->json(['status' => 'ok']);
    }
}
