<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\ClientRepository;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        protected ClientRepository $clients
    ) {}

    public function index(Request $request): Response
    {
        $clients = $request->user()->oauthApps()
            ->where('revoked', false)
            ->orderBy('name')
            ->get();
        
        return Inertia::render('OAuth/Clients', [
            'clients' => $clients->map(fn($client) => [
                'id' => $client->id,
                'name' => $client->name,
                'redirect' => implode(', ', $client->redirect_uris ?? []),
                'post_logout_redirect' => $this->formatRedirectUris($client->post_logout_redirect_uris),
                'created_at' => $client->created_at->toDateTimeString(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect' => 'required|url',
            'post_logout_redirect' => 'nullable|url',
            'type' => 'nullable|in:accounting,payroll,other',
        ]);
        
        $client = $this->clients->createAuthorizationCodeGrantClient(
            $validated['name'],
            [$validated['redirect']],
            true, // confidential
            $request->user(), // user
            false // enable device flow
        );

        // Set post-logout redirect URIs if provided
        if (!empty($validated['post_logout_redirect'])) {
            $client->post_logout_redirect_uris = [$validated['post_logout_redirect']];
            $client->save();
        }

        // Get the plain text secret - Passport returns it immediately after creation
        // If hashing is enabled, we need to get it before it's hashed
        $plainSecret = $client->plainSecret ?? $client->secret;
        
        return redirect()->route('oauth.clients')->with([
            'newClient' => [
                'client_id' => $client->id,
                'client_secret' => $plainSecret,
                'redirect_uri' => $validated['redirect'],
            ],
        ]);
    }

    public function show(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();
        
        return response()->json([
            'id' => $client->id,
            'name' => $client->name,
            'redirect' => implode(', ', $client->redirect_uris ?? []),
            'post_logout_redirect' => $this->formatRedirectUris($client->post_logout_redirect_uris),
            'created_at' => $client->created_at->toDateTimeString(),
            'note' => 'Client secret cannot be retrieved after creation. If you need a new secret, delete and recreate this client.',
        ]);
    }

    public function edit(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();

        return Inertia::render('OAuth/EditClient', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'redirect_uris' => $client->redirect_uris ?? [],
                'post_logout_redirect_uris' => $this->parseRedirectUris($client->post_logout_redirect_uris),
            ],
        ]);
    }

    public function update(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect_uris' => 'required|array',
            'redirect_uris.*' => 'required|url',
            'post_logout_redirect_uris' => 'nullable|array',
            'post_logout_redirect_uris.*' => 'nullable|url',
        ]);

        // Update client data
        $client->name = $validated['name'];
        $client->redirect_uris = $validated['redirect_uris'];

        // Handle post-logout redirect URIs
        if (!empty($validated['post_logout_redirect_uris'])) {
            $client->post_logout_redirect_uris = $validated['post_logout_redirect_uris'];
        } else {
            $client->post_logout_redirect_uris = null;
        }

        $client->save();

        return redirect()->route('oauth.clients')->with('success', 'OAuth client updated successfully.');
    }

    /**
     * Parse redirect URIs from database format to array
     */
    private function parseRedirectUris($uris): array
    {
        if (empty($uris)) {
            return [];
        }

        // If it's already an array, return it
        if (is_array($uris)) {
            return $uris;
        }

        // If it's a string, try to decode as JSON
        if (is_string($uris)) {
            $decoded = json_decode($uris, true);
            if (is_array($decoded)) {
                return $decoded;
            }
            // If not JSON, treat as single URI
            return [$uris];
        }

        return [];
    }

    public function destroy(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();

        $this->clients->delete($client);

        return redirect()->route('oauth.clients')->with('success', 'OAuth client deleted successfully.');
    }

    /**
     * Format redirect URIs for display (handle both array and string formats)
     */
    private function formatRedirectUris($uris): string
    {
        if (empty($uris)) {
            return '';
        }

        // If it's already an array, use it directly
        if (is_array($uris)) {
            return implode(', ', $uris);
        }

        // If it's a string, try to decode as JSON first
        if (is_string($uris)) {
            $decoded = json_decode($uris, true);
            if (is_array($decoded)) {
                return implode(', ', $decoded);
            }
            // If not JSON, treat as single URI
            return $uris;
        }

        return '';
    }

    /**
     * Record SSO login activity from external systems
     */
    public function recordSSOLogin(Request $request)
    {
        \Log::info('SSO Login Recording Attempt', [
            'headers' => $request->headers->all(),
            'has_authorization' => $request->hasHeader('Authorization'),
            'body' => $request->all(),
            'ip' => $request->ip(),
        ]);

        $validated = $request->validate([
            'client_id' => 'required|string',
            'application_name' => 'required|string|max:255',
            'login_method' => 'required|in:direct,sso',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ]);

        $user = $request->user(); // Authenticated via API token

        if (!$user) {
            \Log::warning('SSO Login Recording: No authenticated user', [
                'token_present' => $request->hasHeader('Authorization'),
                'headers' => $request->headers->all(),
            ]);
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        \Log::info('SSO Login Recording: User authenticated', [
            'user_id' => $user->id,
            'user_email' => $user->email,
        ]);

        // Record the SSO login activity
        $userAgentInfo = \App\Models\UserActivity::parseUserAgent($validated['user_agent'] ?? $request->userAgent());

        \App\Models\UserActivity::create([
            'user_id' => $user->id,
            'activity_type' => 'sso_login',
            'ip_address' => $validated['ip_address'] ?? $request->ip(),
            'user_agent' => $validated['user_agent'] ?? $request->userAgent(),
            'device' => $userAgentInfo['device'],
            'browser' => $userAgentInfo['browser'],
            'status' => 'success',
            'login_time' => now(),
            'notes' => "SSO login to {$validated['application_name']} (Client ID: {$validated['client_id']})",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'SSO login activity recorded successfully',
            'activity' => [
                'type' => 'sso_login',
                'application' => $validated['application_name'],
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }

    /**
     * Test endpoint for SSO login recording (temporary - remove after testing)
     */
    public function testRecordSSOLogin(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
            'client_id' => 'required|string',
            'application_name' => 'required|string|max:255',
            'login_method' => 'required|in:direct,sso',
            'ip_address' => 'nullable|string',
            'user_agent' => 'nullable|string',
        ]);

        $user = \App\Models\User::find($validated['user_id']);

        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        // Record the SSO login activity
        $userAgentInfo = \App\Models\UserActivity::parseUserAgent($validated['user_agent'] ?? $request->userAgent());

        $activity = \App\Models\UserActivity::create([
            'user_id' => $user->id,
            'activity_type' => 'sso_login',
            'ip_address' => $validated['ip_address'] ?? $request->ip(),
            'user_agent' => $validated['user_agent'] ?? $request->userAgent(),
            'device' => $userAgentInfo['device'],
            'browser' => $userAgentInfo['browser'],
            'status' => 'success',
            'login_time' => now(),
            'notes' => "SSO login to {$validated['application_name']} (Client ID: {$validated['client_id']}) - TEST",
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Test SSO login activity recorded successfully',
            'activity' => [
                'id' => $activity->id,
                'type' => 'sso_login',
                'application' => $validated['application_name'],
                'user_id' => $user->id,
                'timestamp' => now()->toISOString(),
            ]
        ]);
    }
}

