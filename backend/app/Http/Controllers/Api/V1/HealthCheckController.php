<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class HealthCheckController extends BaseController
{
    public function index(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            $dbStatus = 'connected';
            $dbName = DB::connection()->getDatabaseName();
        } catch (\Exception $e) {
            $dbStatus = 'disconnected: ' . $e->getMessage();
            $dbName = null;
        }

        return $this->successResponse([
            'status' => 'ok',
            'app_name' => config('app.name'),
            'environment' => config('app.env'),
            'database' => [
                'status' => $dbStatus,
                'name' => $dbName,
            ],
            'server_time' => now()->toIso8601String(),
            'php_version' => PHP_VERSION,
        ], 'Hệ thống SportZone API đang hoạt động bình thường.');
    }
}
