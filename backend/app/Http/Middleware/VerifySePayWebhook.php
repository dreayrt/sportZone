<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerifySePayWebhook
{
    /**
     * Xác thực Webhook của SePay bằng HMAC-SHA256
     */
    public function handle(Request $request, Closure $next): Response
    {
        $secret = config('services.sepay.webhook_secret');

        // Nếu chưa cấu hình secret trong .env
        if (empty($secret)) {
            Log::warning('[SePay Webhook] Chưa cấu hình SEPAY_WEBHOOK_SECRET trong .env');

            return response()->json([
                'success' => false,
                'message' => 'Server webhook secret is not configured.',
            ], 500);
        }

        // Lấy headers chữ ký từ SePay (hỗ trợ cả case-insensitive)
        $signature = trim((string) $request->header('X-SePay-Signature', ''));
        $timestamp = trim((string) $request->header('X-SePay-Timestamp', ''));

        // SePay signs the timestamp together with the untouched request body.
        if (! ctype_digit($timestamp)) {
            return response()->json([
                'success' => false,
                'message' => 'Missing or invalid SePay timestamp.',
            ], 401);
        }

        // Kiểm tra header bắt buộc
        if (empty($signature)) {
            Log::warning('[SePay Webhook] Thiếu header chữ ký X-SePay-Signature.');

            return response()->json([
                'success' => false,
                'message' => 'Missing X-SePay-Signature header.',
            ], 401);
        }

        // Chuẩn hóa signature (bỏ tiền tố 'sha256=' nếu có)
        if (! preg_match('/^sha256=([a-f0-9]{64})$/i', $signature, $signatureParts)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid signature format.',
            ], 401);
        }

        // Lấy raw body chính xác (không qua JSON parser)
        $rawBody = $request->getContent();

        // 1. Kiểm tra với công thức: timestamp.rawBody
        $dataWithTimestamp = $timestamp ? ($timestamp.'.'.$rawBody) : $rawBody;
        $expectedHashWithTimestamp = hash_hmac('sha256', $dataWithTimestamp, $secret);

        $isValid = hash_equals($expectedHashWithTimestamp, $signatureParts[1]);

        if (! $isValid) {
            Log::warning('[SePay Webhook] Chữ ký HMAC-SHA256 không hợp lệ', [
                'timestamp' => $timestamp,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid signature verification.',
            ], 401);
        }

        // Kiểm tra Replay Attack nếu có timestamp (lệch không quá 5 phút = 300s)
        $currentTime = time();
        if (abs($currentTime - (int) $timestamp) > 300) {
            Log::warning('[SePay Webhook] Request timestamp bị hết hạn (> 300s)', [
                'request_time' => (int) $timestamp,
                'server_time' => $currentTime,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Webhook timestamp expired.',
            ], 401);
        }

        return $next($request);
    }
}
