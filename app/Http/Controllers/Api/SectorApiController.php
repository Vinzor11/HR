<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Sector;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * API Controller for Sectors
 * 
 * Provides public API endpoints for sector data.
 */
class SectorApiController extends Controller
{
    /**
     * List all sectors.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Sector::query()
            ->where('is_active', true)
            ->withCount('units');

        // Optional search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $sectors = $query->orderBy('name')->get();

        return response()->json([
            'data' => $sectors->map(function ($sector) {
                return [
                    'id' => $sector->id,
                    'name' => $sector->name,
                    'code' => $sector->code,
                    'description' => $sector->description,
                    'units_count' => $sector->units_count,
                ];
            }),
        ]);
    }

    /**
     * Get a specific sector by ID.
     */
    public function show(int $id): JsonResponse
    {
        $sector = Sector::where('is_active', true)
            ->with(['units' => function ($query) {
                $query->where('is_active', true)->orderBy('name');
            }])
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $sector->id,
                'name' => $sector->name,
                'code' => $sector->code,
                'description' => $sector->description,
                'units' => $sector->units->map(function ($unit) {
                    return [
                        'id' => $unit->id,
                        'name' => $unit->name,
                        'code' => $unit->code,
                        'unit_type' => $unit->unit_type,
                    ];
                }),
            ],
        ]);
    }
}
