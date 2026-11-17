<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:150'],
            'date' => ['nullable', 'date_format:Y-m-d'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);
        $logs = AuditLog::with('user:id,full_name')
            ->when($data['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                        ->orWhere('entity_type', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($u) => $u->where('full_name', 'like', "%{$search}%"));
                });
            })
            ->when($data['date'] ?? null, fn ($query, $date) => $query->whereDate('created_at', $date))
            ->orderByDesc('id')->paginate($data['per_page'] ?? 20);

        return $this->successResponse($logs);
    }
}
