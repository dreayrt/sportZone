<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class RecordAdminAction
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethodSafe()) {
            return $next($request);
        }

        return DB::transaction(function () use ($request, $next): Response {
            $response = $next($request);
            if ($response->isSuccessful()) {
                $resource = $request->segment(4);
                $id = $request->segment(5);
                $data = json_decode($response->getContent(), true);
                AuditLog::create([
                    'user_id' => $request->user()->id,
                    'action' => strtoupper(str_replace('-', '_', $resource).'_'.$request->method().($request->segment(6) ? '_'.$request->segment(6) : '')),
                    'entity_type' => $resource,
                    'entity_id' => ctype_digit((string) $id) ? (int) $id : ($data['data']['id'] ?? null),
                    'details' => json_encode(array_merge(['method' => $request->method(), 'path' => $request->path()], $resource === 'venues' ? $request->only(['suspended', 'reason']) : []), JSON_UNESCAPED_UNICODE),
                    'ip_address' => $request->ip(),
                ]);
            }

            return $response;
        });
    }
}
