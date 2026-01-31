<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use App\Models\OAuthClientCrossUnitPosition;
use App\Models\OAuthClientPositionRole;
use App\Models\Position;
use App\Models\Unit;
use App\Services\OAuthClientAccessService;
use App\Services\UserInfoClaimsBuilder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\Client;
use Laravel\Passport\ClientRepository;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function __construct(
        protected ClientRepository $clients,
        protected OAuthClientAccessService $clientAccess
    ) {}

    public function index(Request $request): Response
    {
        $clients = $request->user()->oauthApps()
            ->where('revoked', false)
            ->orderBy('name')
            ->get();

        $clientIds = $clients->pluck('id')->toArray();
        $positionRolesByClient = OAuthClientPositionRole::whereIn('oauth_client_id', $clientIds)
            ->with(['unit', 'position'])
            ->get()
            ->groupBy('oauth_client_id');
        $crossUnitByClient = OAuthClientCrossUnitPosition::whereIn('oauth_client_id', $clientIds)
            ->with('position')
            ->get()
            ->groupBy('oauth_client_id');

        $units = Unit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'unit_type']);
        $positions = Position::orderBy('pos_name')->get(['id', 'pos_name', 'pos_code']);

        return Inertia::render('OAuth/Clients', [
            'clients' => $clients->map(fn ($client) => [
                'id' => $client->id,
                'name' => $client->name,
                'redirect' => implode(', ', $client->redirect_uris ?? []),
                'post_logout_redirect' => $this->formatRedirectUris($client->post_logout_redirect_uris),
                'created_at' => $client->created_at->toDateTimeString(),
                'access_summary' => $this->buildAccessSummary(
                    $positionRolesByClient->get($client->id, collect()),
                    $crossUnitByClient->get($client->id, collect())
                ),
            ]),
            'units' => $units->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'code' => $u->code, 'unit_type' => $u->unit_type]),
            'positions' => $positions->map(fn ($p) => ['id' => $p->id, 'pos_name' => $p->pos_name, 'pos_code' => $p->pos_code]),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'redirect' => 'required|url',
            'post_logout_redirect' => 'nullable|url',
            'allowed_units' => 'nullable|array',
            'allowed_units.*.unit_id' => [
                'nullable',
                function (string $attribute, $value, \Closure $fail) {
                    if ($value === null || $value === '' || $value === 'any') {
                        return;
                    }
                    if (!Unit::where('id', $value)->exists()) {
                        $fail(__('validation.exists', ['attribute' => $attribute]));
                    }
                },
            ],
            'allowed_units.*.role' => 'nullable|in:admin,user',
            'allowed_units.*.position_roles' => 'nullable|array',
            'allowed_units.*.position_roles.*.position_id' => [
                ...$this->positionRolePositionIdRules($request),
                'nullable',
                'exists:positions,id',
            ],
            'allowed_units.*.position_roles.*.role' => [
                ...$this->positionRoleRoleRules($request),
                'nullable',
                'in:admin,user',
            ],
            'cross_unit_positions' => 'nullable|array',
            'cross_unit_positions.*.position_id' => 'required_with:cross_unit_positions|exists:positions,id',
            'cross_unit_positions.*.role' => 'nullable|in:admin,user',
            'cross_unit_positions.*.unit_type_filter' => 'nullable|string|max:50',
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

        // Multiple allowed units: each entry is (unit_id + position_roles) or (unit_id null + role = "any unit")
        $allowedUnits = $validated['allowed_units'] ?? [];
        if (empty($allowedUnits)) {
            $allowedUnits = [['unit_id' => null, 'role' => 'user']];
        }
        foreach ($allowedUnits as $entry) {
            $unitId = $this->normalizeUnitIdForAnyUnit($entry['unit_id'] ?? null);
            if ($unitId === null) {
                // "Any unit" row: one row (client_id, null, null, role)
                $role = $entry['role'] ?? 'user';
                OAuthClientPositionRole::create([
                    'oauth_client_id' => $client->id,
                    'unit_id' => null,
                    'position_id' => null,
                    'role' => $role,
                ]);
            } else {
                foreach ($entry['position_roles'] ?? [] as $row) {
                    OAuthClientPositionRole::create([
                        'oauth_client_id' => $client->id,
                        'unit_id' => $unitId,
                        'position_id' => $row['position_id'],
                        'role' => $row['role'],
                    ]);
                }
            }
        }
        if (!empty($validated['cross_unit_positions'])) {
            foreach ($validated['cross_unit_positions'] as $row) {
                OAuthClientCrossUnitPosition::create([
                    'oauth_client_id' => $client->id,
                    'position_id' => $row['position_id'],
                    'role' => $row['role'] ?? 'user',
                    'unit_type_filter' => $row['unit_type_filter'] ?? null,
                ]);
            }
        }

        // Get the plain text secret - Passport returns it immediately after creation
        $plainSecret = $client->plainSecret ?? $client->secret;
        
        $redirectTo = $request->input('redirect') === 'test' ? route('oauth.clients.test') : route('oauth.clients');
        return redirect($redirectTo)->with([
            'newClient' => [
                'client_id' => $client->id,
                'client_secret' => $plainSecret,
                'redirect_uri' => $validated['redirect'],
            ],
        ]);
    }

    /**
     * Test page: new Create Client form + UserInfo JSON preview.
     */
    public function testPage(Request $request): Response
    {
        $units = Unit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'unit_type']);
        $positions = Position::orderBy('pos_name')->get(['id', 'pos_name', 'pos_code']);
        $clients = $request->user()->oauthApps()
            ->where('revoked', false)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('OAuth/CreateClientTest', [
            'units' => $units->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'code' => $u->code, 'unit_type' => $u->unit_type]),
            'positions' => $positions->map(fn ($p) => ['id' => $p->id, 'pos_name' => $p->pos_name, 'pos_code' => $p->pos_code]),
            'clients' => $clients->map(fn ($c) => ['id' => $c->id, 'name' => $c->name]),
        ]);
    }

    /**
     * Preview the userinfo JSON that would be returned when authorized for the given client.
     */
    public function userinfoPreview(Request $request): JsonResponse
    {
        $clientId = $request->query('client_id');
        if (!$clientId) {
            return response()->json(['error' => 'client_id required'], 400);
        }

        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['error' => 'Client not found'], 404);
        }

        $user = $request->user();
        $claims = UserInfoClaimsBuilder::build($user);
        $access = $this->clientAccess->resolveAccessForUser($user, $client);

        if (!$access['allowed']) {
            $claims['_preview_note'] = 'This user would be denied access (403). Shown below is the base userinfo; client_role would not be present.';
        } else {
            $claims['client_role'] = $access['client_role'];
            $claims['_preview_note'] = 'Preview: userinfo when authorized for client "' . $client->name . '".';
        }

        $claims['_client_access_config'] = $this->buildClientAccessConfig($client);

        return response()->json($claims);
    }

    /**
     * Build a human-readable summary of the client's access rules (allowed units, positions, roles).
     */
    private function buildClientAccessConfig(object $client): array
    {
        $positionRoles = OAuthClientPositionRole::where('oauth_client_id', $client->id)
            ->with(['unit', 'position'])
            ->get();

        $crossUnit = OAuthClientCrossUnitPosition::where('oauth_client_id', $client->id)
            ->with('position')
            ->get();

        $allowed_units = [];

        // "Any unit" rows: unit_id and position_id both null/empty
        $anyUnitRows = $positionRoles->filter(fn ($row) => $this->isAnyUnitRow($row));
        if ($anyUnitRows->isNotEmpty()) {
            $role = $anyUnitRows->first()->role ?? 'user';
            $allowed_units[] = [
                'unit' => null,
                'unit_description' => 'Any unit (all employees with a unit, any position)',
                'role' => $role,
                'position_roles' => [],
            ];
        }

        // Specific units: group by unit_id (exclude "any unit" rows)
        $specificRows = $positionRoles->reject(fn ($row) => $this->isAnyUnitRow($row));
        $byUnit = $specificRows->groupBy(fn ($row) => (string) $row->unit_id);
        foreach ($byUnit as $unitId => $rows) {
            $unit = $rows->first()?->unit;
            $position_roles = $rows->filter(fn ($r) => $r->position_id !== null && $r->position_id !== '')
                ->map(fn ($r) => [
                    'position' => $r->position ? ['id' => $r->position->id, 'name' => $r->position->pos_name ?? $r->position->name] : null,
                    'role' => $r->role,
                ])->values()->toArray();
            $allowed_units[] = [
                'unit' => $unit ? ['id' => $unit->id, 'name' => $unit->name, 'code' => $unit->code, 'unit_type' => $unit->unit_type] : null,
                'unit_description' => $unit ? $unit->name . ' (' . ($unit->code ?? '') . ') — ' . $unit->unit_type : null,
                'role' => null,
                'position_roles' => $position_roles,
            ];
        }

        $cross_unit_positions = $crossUnit->map(fn ($r) => [
            'position' => $r->position ? ['id' => $r->position->id, 'name' => $r->position->pos_name ?? $r->position->name] : null,
            'role' => $r->role,
            'unit_type_filter' => $r->unit_type_filter,
            'description' => $r->unit_type_filter
                ? "Position from other units (unit_type: {$r->unit_type_filter})"
                : 'Position from any other unit',
        ])->toArray();

        return [
            'client_name' => $client->name,
            'allowed_units' => $allowed_units,
            'cross_unit_positions' => $cross_unit_positions,
        ];
    }

    /**
     * Normalize unit_id from request: treat "any", "", "null" (string) as null so we create the "any unit" row.
     * Returns null for "any unit", or the unit id (int) for a specific unit.
     */
    private function normalizeUnitIdForAnyUnit(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $v = strtolower(trim($value));
            if ($v === 'any' || $v === 'null') {
                return null;
            }
        }
        if ($value === 0) {
            return null;
        }
        return (int) $value;
    }

    /**
     * Validation rule: require position_id only when the allowed unit is not "Any unit".
     */
    private function positionRolePositionIdRules(Request $request): array
    {
        return [
            function (string $attribute, $value, \Closure $fail) use ($request) {
                $idx = (int) explode('.', $attribute)[1];
                $unitId = $request->input("allowed_units.{$idx}.unit_id");
                if ($unitId === null || $unitId === '' || $unitId === 'any') {
                    return;
                }
                if ($value === null || $value === '') {
                    $fail(__('validation.required', ['attribute' => 'position']));
                }
            },
        ];
    }

    /**
     * Validation rule: require role only when the allowed unit is not "Any unit".
     */
    private function positionRoleRoleRules(Request $request): array
    {
        return [
            function (string $attribute, $value, \Closure $fail) use ($request) {
                $idx = (int) explode('.', $attribute)[1];
                $unitId = $request->input("allowed_units.{$idx}.unit_id");
                if ($unitId === null || $unitId === '' || $unitId === 'any') {
                    return;
                }
                if ($value === null || $value === '') {
                    $fail(__('validation.required', ['attribute' => 'role']));
                }
            },
        ];
    }

    /**
     * Whether this position_role row is the "Any unit" rule (unit_id and position_id both null/empty).
     */
    private function isAnyUnitRow(OAuthClientPositionRole $row): bool
    {
        $unitNull = $row->unit_id === null || $row->unit_id === '' || $row->unit_id === 0
            || (is_string($row->unit_id) && strtolower(trim($row->unit_id)) === 'null');
        $positionNull = $row->position_id === null || $row->position_id === '' || $row->position_id === 0
            || (is_string($row->position_id) && strtolower(trim($row->position_id)) === 'null');
        return $unitNull && $positionNull;
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

    public function formData(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();

        $clientData = $this->buildClientFormData($client);
        return response()->json($clientData);
    }

    public function edit(Request $request, string $id)
    {
        $client = $request->user()->oauthApps()
            ->where('id', $id)
            ->where('revoked', false)
            ->firstOrFail();

        $clientData = $this->buildClientFormData($client);
        return Inertia::render('OAuth/EditClient', [
            'client' => $clientData,
            'units' => Unit::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code', 'unit_type']),
            'positions' => Position::orderBy('pos_name')->get(['id', 'pos_name', 'pos_code']),
        ]);
    }

    private function buildClientFormData($client): array
    {
        $positionRoles = OAuthClientPositionRole::where('oauth_client_id', $client->id)
            ->with(['unit', 'position'])
            ->get();
        $crossUnit = OAuthClientCrossUnitPosition::where('oauth_client_id', $client->id)
            ->with('position')
            ->get();

        $allowed_units = [];
        $anyUnitRows = $positionRoles->filter(fn ($row) => $this->isAnyUnitRow($row));
        if ($anyUnitRows->isNotEmpty()) {
            $allowed_units[] = ['unit_id' => null, 'role' => $anyUnitRows->first()->role ?? 'user', 'position_roles' => []];
        }
        $specificRows = $positionRoles->reject(fn ($row) => $this->isAnyUnitRow($row));
        foreach ($specificRows->groupBy(fn ($row) => (string) $row->unit_id) as $unitId => $rows) {
            $allowed_units[] = [
                'unit_id' => (int) $unitId,
                'role' => null,
                'position_roles' => $rows->filter(fn ($r) => $r->position_id !== null && $r->position_id !== '')
                    ->map(fn ($r) => ['position_id' => $r->position_id, 'role' => $r->role])
                    ->values()
                    ->toArray(),
            ];
        }
        $cross_unit_positions = $crossUnit->map(fn ($r) => [
            'position_id' => $r->position_id,
            'role' => $r->role,
            'unit_type_filter' => $r->unit_type_filter,
        ])->toArray();

        return [
            'id' => $client->id,
            'name' => $client->name,
            'redirect_uris' => $client->redirect_uris ?? [],
            'post_logout_redirect_uris' => $this->parseRedirectUris($client->post_logout_redirect_uris),
            'allowed_units' => $allowed_units,
            'cross_unit_positions' => $cross_unit_positions,
        ];
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
            'allowed_units' => 'nullable|array',
            'allowed_units.*.unit_id' => 'nullable',
            'allowed_units.*.role' => 'nullable|in:admin,user',
            'allowed_units.*.position_roles' => 'nullable|array',
            'allowed_units.*.position_roles.*.position_id' => [
                ...$this->positionRolePositionIdRules($request),
                'nullable',
                'exists:positions,id',
            ],
            'allowed_units.*.position_roles.*.role' => [
                ...$this->positionRoleRoleRules($request),
                'nullable',
                'in:admin,user',
            ],
            'cross_unit_positions' => 'nullable|array',
            'cross_unit_positions.*.position_id' => 'required_with:cross_unit_positions|exists:positions,id',
            'cross_unit_positions.*.role' => 'nullable|in:admin,user',
            'cross_unit_positions.*.unit_type_filter' => 'nullable|string|max:50',
        ]);

        $client->name = $validated['name'];
        $client->redirect_uris = $validated['redirect_uris'];
        if (!empty($validated['post_logout_redirect_uris'])) {
            $client->post_logout_redirect_uris = $validated['post_logout_redirect_uris'];
        } else {
            $client->post_logout_redirect_uris = null;
        }
        $client->save();

        // Replace allowed units and cross-unit positions only when the request includes them (e.g. edit form with that section)
        if ($request->has('allowed_units')) {
            OAuthClientPositionRole::where('oauth_client_id', $client->id)->delete();
            OAuthClientCrossUnitPosition::where('oauth_client_id', $client->id)->delete();
            $allowedUnits = $validated['allowed_units'] ?? [];
            if (empty($allowedUnits)) {
                $allowedUnits = [['unit_id' => null, 'role' => 'user', 'position_roles' => []]];
            }
            foreach ($allowedUnits as $entry) {
                $unitId = $this->normalizeUnitIdForAnyUnit($entry['unit_id'] ?? null);
                if ($unitId === null) {
                    $role = $entry['role'] ?? 'user';
                    OAuthClientPositionRole::create([
                        'oauth_client_id' => $client->id,
                        'unit_id' => null,
                        'position_id' => null,
                        'role' => $role,
                    ]);
                } else {
                    foreach ($entry['position_roles'] ?? [] as $row) {
                        OAuthClientPositionRole::create([
                            'oauth_client_id' => $client->id,
                            'unit_id' => $unitId,
                            'position_id' => $row['position_id'],
                            'role' => $row['role'],
                        ]);
                    }
                }
            }
            foreach ($validated['cross_unit_positions'] ?? [] as $row) {
                OAuthClientCrossUnitPosition::create([
                    'oauth_client_id' => $client->id,
                    'position_id' => $row['position_id'],
                    'role' => $row['role'] ?? 'user',
                    'unit_type_filter' => $row['unit_type_filter'] ?? null,
                ]);
            }
        }

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
        abort_unless($request->user()->can('delete-oauth-client'), 403, 'Unauthorized action.');

        app(\App\Services\TwoFactorVerificationService::class)->validateForSensitiveAction($request);

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
     * Build a human-readable access summary for the clients list.
     */
    private function buildAccessSummary($positionRoles, $crossUnit): array
    {
        $allowedUnits = [];
        $anyUnit = $positionRoles->filter(fn ($row) => $this->isAnyUnitRow($row))->first();
        if ($anyUnit) {
            $allowedUnits[] = ['label' => 'Any unit', 'role' => $anyUnit->role ?? 'user', 'positions' => []];
        }
        foreach ($positionRoles->reject(fn ($row) => $this->isAnyUnitRow($row))->groupBy('unit_id') as $unitId => $rows) {
            $unit = $rows->first()->unit;
            $unitName = $unit ? $unit->name : 'Unit #' . $unitId;
            $positions = $rows->filter(fn ($r) => $r->position_id)
                ->map(fn ($r) => ($r->position?->pos_name ?? 'Position') . ' (' . ($r->role ?? 'user') . ')')
                ->unique()
                ->values()
                ->toArray();
            $allowedUnits[] = ['label' => $unitName, 'role' => null, 'positions' => $positions];
        }

        $crossUnitList = $crossUnit->map(fn ($r) => [
            'position' => $r->position?->pos_name ?? 'Position',
            'role' => $r->role ?? 'user',
            'unit_type' => $r->unit_type_filter,
        ])->toArray();

        return ['allowed_units' => $allowedUnits, 'cross_unit_positions' => $crossUnitList];
    }
}

