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
}

