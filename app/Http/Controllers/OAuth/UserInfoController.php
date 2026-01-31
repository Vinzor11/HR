<?php

namespace App\Http\Controllers\OAuth;

use App\Http\Controllers\Controller;
use App\Services\OAuthClientAccessService;
use App\Services\UserInfoClaimsBuilder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Laravel\Passport\Client;

class UserInfoController extends Controller
{
    public function __construct(
        protected OAuthClientAccessService $clientAccess
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $claims = UserInfoClaimsBuilder::build($user);

        // Per-client role when accessed via OAuth (token has client_id)
        $token = $user->token();
        if ($token && $token->client_id) {
            $client = Client::find($token->client_id);
            if ($client) {
                $access = $this->clientAccess->resolveAccessForUser($user, $client);
                if (!$access['allowed']) {
                    return response()->json(['error' => 'access_denied', 'error_description' => 'Your unit or position does not have access to this application.'], 403);
                }
                $claims['client_role'] = $access['client_role'];
            }
        }

        return response()->json($claims);
    }
}

