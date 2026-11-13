<?php

use App\Http\Middleware\CheckUserStatusMiddleware;
use App\Http\Middleware\RecordAdminAction;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\VerifySePayWebhook;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Exception\RouteNotFoundException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
            'admin.audit' => RecordAdminAction::class,
            'check.status' => CheckUserStatusMiddleware::class,
            'sepay.verify' => VerifySePayWebhook::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'hooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Dữ liệu cung cấp không hợp lệ.',
                    'data' => null,
                    'errors' => $e->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
                    'data' => null,
                    'errors' => null,
                ], 401);
            }
        });

        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage() ?: 'Bạn không có quyền truy cập vào tài nguyên này.',
                    'data' => null,
                    'errors' => null,
                ], 403);
            }
        });

        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy endpoint hoặc dữ liệu được yêu cầu.',
                    'data' => null,
                    'errors' => null,
                ], 404);
            }
        });

        // Middleware auth:sanctum với request không có header Accept: application/json
        // sẽ gọi route('login') để redirect (route này không tồn tại ở backend API).
        $exceptions->render(function (RouteNotFoundException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chưa xác thực hoặc phiên đăng nhập đã hết hạn.',
                    'data' => null,
                    'errors' => null,
                ], 401);
            }
        });
    })->create();
