<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\UnitTypeResource;
use App\Models\UnitType;
use Illuminate\Http\Request;

class UnitTypeController extends Controller
{
    public function index(Request $request)
    {
        $query = UnitType::query()
            ->when(
                $request->boolean('only_active', true),
                fn ($builder) => $builder->where('is_active', true)
            )
            ->orderBy('name');

        $types = $request->has('per_page')
            ? $query->paginate($request->integer('per_page', 50))->withQueryString()
            : $query->get();

        return UnitTypeResource::collection($types);
    }
}


