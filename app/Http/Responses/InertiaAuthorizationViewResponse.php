<?php

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Passport\Contracts\AuthorizationViewResponse;

class InertiaAuthorizationViewResponse implements AuthorizationViewResponse
{
    /**
     * @var array<string, mixed>
     */
    protected array $parameters = [];

    public function withParameters(array $parameters = []): static
    {
        $this->parameters = $parameters;

        return $this;
    }

    public function toResponse($request)
    {
        $client = $this->parameters['client'];
        $scopes = collect($this->parameters['scopes'] ?? [])
            ->map(fn ($scope) => is_string($scope) ? $scope : $scope->id)
            ->values()
            ->toArray();

        $originalRequest = $this->parameters['request'];

        return Inertia::render('OAuth/Authorize', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
            ],
            'scopes' => $scopes,
            'request' => [
                'client_id' => $originalRequest->client_id,
                'redirect_uri' => $originalRequest->redirect_uri,
                'response_type' => $originalRequest->response_type,
                'scope' => $originalRequest->scope ?? '',
                'state' => $originalRequest->state ?? '',
            ],
            'authToken' => $this->parameters['authToken'] ?? null,
        ])->toResponse($request);
    }
}

