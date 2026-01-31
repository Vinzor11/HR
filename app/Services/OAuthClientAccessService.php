<?php

namespace App\Services;

use App\Models\OAuthClientCrossUnitPosition;
use App\Models\OAuthClientPositionRole;
use App\Models\User;

class OAuthClientAccessService
{
    /**
     * Resolve client_role and whether the user is allowed for the given OAuth client.
     * Compares against ALL active designations (not just primary). If any designation matches, access is granted.
     * Returns ['allowed' => bool, 'client_role' => 'admin'|'user'|null].
     */
    public function resolveAccessForUser(User $user, object $client): array
    {
        $user->loadMissing(['employee.designations' => fn ($q) => $q->active()->with(['unit', 'position'])]);
        $employee = $user->employee;
        $designations = $employee?->designations ?? collect();

        $positionRoles = OAuthClientPositionRole::where('oauth_client_id', $client->id)->get();

        $anyUnitRow = $positionRoles->first(function ($row) {
            return ($row->unit_id === null || $row->unit_id === '') && ($row->position_id === null || $row->position_id === '');
        });

        $configuredUnitIds = $positionRoles
            ->filter(fn ($row) => $row->unit_id !== null && $row->unit_id !== '')
            ->pluck('unit_id')
            ->unique()
            ->values();

        // 1. Exact match: any designation (unit, position) in client's list → allow with that role
        foreach ($designations as $designation) {
            $unitId = $designation->unit_id;
            $positionId = $designation->position_id;
            if ($unitId === null || $positionId === null) {
                continue;
            }
            $mapping = $positionRoles->first(function ($row) use ($unitId, $positionId) {
                return $row->unit_id != null && $row->position_id != null
                    && (string) $row->unit_id === (string) $unitId
                    && (string) $row->position_id === (string) $positionId;
            });
            if ($mapping) {
                return ['allowed' => true, 'client_role' => $mapping->role];
            }
        }

        // 2. Cross-unit position: any designation's position in cross_unit list (with unit_type filter)
        foreach ($designations as $designation) {
            $positionId = $designation->position_id;
            $unitType = $designation->unit?->unit_type;
            if ($positionId === null) {
                continue;
            }
            $cross = OAuthClientCrossUnitPosition::where('oauth_client_id', $client->id)
                ->where('position_id', $positionId)
                ->first();
            if ($cross) {
                $filter = $cross->unit_type_filter;
                if ($filter === null || $filter === '' || strtolower(trim((string) $filter)) === 'any') {
                    return ['allowed' => true, 'client_role' => $cross->role];
                }
                $allowedTypes = $this->parseUnitTypeFilter((string) $filter);
                if ($allowedTypes !== [] && $unitType && in_array($unitType, $allowedTypes, true)) {
                    return ['allowed' => true, 'client_role' => $cross->role];
                }
            }
        }

        // 3. "Any unit": grant only if user has at least one designation whose unit is NOT in the specific list
        $userUnitIds = $designations->pluck('unit_id')->filter()->unique()->values();
        if ($userUnitIds->isEmpty()) {
            return ['allowed' => false, 'client_role' => null];
        }
        $hasUnitOutsideConfigured = $userUnitIds->contains(fn ($uid) => ! $configuredUnitIds->contains($uid));
        if ($anyUnitRow && $hasUnitOutsideConfigured) {
            return ['allowed' => true, 'client_role' => $anyUnitRow->role];
        }

        return ['allowed' => false, 'client_role' => null];
    }

    /**
     * Parse unit type filter into list of unit_type values to match.
     * Recognized aliases: academic → college+program, administrative → office.
     * Actual unit_type values in DB: college, program, office.
     */
    private function parseUnitTypeFilter(string $filter): array
    {
        $filter = strtolower(trim($filter));
        if ($filter === 'academic') {
            return ['college', 'program'];
        }
        if ($filter === 'administrative') {
            return ['office'];
        }
        if (str_contains($filter, ',')) {
            return array_map('trim', explode(',', $filter));
        }
        return [$filter];
    }
}
