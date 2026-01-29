<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API Controller for Units
 * 
 * Provides public API endpoints for unit data (colleges, programs, offices, etc.)
 */
class UnitApiController extends Controller
{
    /**
     * List all units.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Unit::query()
            ->where('is_active', true)
            ->with('sector:id,name,code');

        // Optional filters
        if ($sectorId = $request->input('sector_id')) {
            $query->where('sector_id', $sectorId);
        }

        if ($unitType = $request->input('unit_type')) {
            $query->where('unit_type', $unitType);
        }

        // Optional search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $units = $query->orderBy('name')->get();

        return response()->json([
            'data' => $units->map(function ($unit) {
                return [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'code' => $unit->code,
                    'unit_type' => $unit->unit_type,
                    'description' => $unit->description,
                    'sector' => $unit->sector ? [
                        'id' => $unit->sector->id,
                        'name' => $unit->sector->name,
                        'code' => $unit->sector->code,
                    ] : null,
                    'parent_unit_id' => $unit->parent_unit_id,
                ];
            }),
        ]);
    }

    /**
     * Get a specific unit by ID.
     */
    public function show(int $id): JsonResponse
    {
        $unit = Unit::where('is_active', true)
            ->with([
                'sector:id,name,code',
                'parentUnit:id,name,code',
                'childUnits' => function ($query) {
                    $query->where('is_active', true)->orderBy('name');
                },
            ])
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $unit->id,
                'name' => $unit->name,
                'code' => $unit->code,
                'unit_type' => $unit->unit_type,
                'description' => $unit->description,
                'sector' => $unit->sector ? [
                    'id' => $unit->sector->id,
                    'name' => $unit->sector->name,
                    'code' => $unit->sector->code,
                ] : null,
                'parent_unit' => $unit->parentUnit ? [
                    'id' => $unit->parentUnit->id,
                    'name' => $unit->parentUnit->name,
                    'code' => $unit->parentUnit->code,
                ] : null,
                'child_units' => $unit->childUnits->map(function ($child) {
                    return [
                        'id' => $child->id,
                        'name' => $child->name,
                        'code' => $child->code,
                        'unit_type' => $child->unit_type,
                    ];
                }),
            ],
        ]);
    }
}
