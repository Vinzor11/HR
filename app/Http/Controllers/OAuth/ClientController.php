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
                'created_at' => $client->created_at->toDateTimeString(),
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect' => 'required|url',
            'type' => 'nullable|in:accounting,payroll,other',
        ]);
        
        $client = $this->clients->createAuthorizationCodeGrantClient(
            $validated['name'],
            [$validated['redirect']],
            true, // confidential
            $request->user(), // user
            false // enable device flow
        );
        
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
            'created_at' => $client->created_at->toDateTimeString(),
            'note' => 'Client secret cannot be retrieved after creation. If you need a new secret, delete and recreate this client.',
        ]);
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
}

