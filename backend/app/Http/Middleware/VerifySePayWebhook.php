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
        $signature = $request->header('X-SePay-Signature') 
            ?? $request->header('X-Sepay-Signature')
            ?? $request->header('x-sepay-signature');

        $timestamp = $request->header('X-SePay-Timestamp') 
            ?? $request->header('X-Sepay-Timestamp')
            ?? $request->header('x-sepay-timestamp');

        // Kiểm tra header bắt buộc
        if (empty($signature)) {
            Log::warning('[SePay Webhook] Thiếu header chữ ký X-SePay-Signature', [
                'headers' => $request->headers->all(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Missing X-SePay-Signature header.',
            ], 401);
        }

        // Chuẩn hóa signature (bỏ tiền tố 'sha256=' nếu có)
        $cleanSignature = str_ireplace('sha256=', '', trim($signature));

        // Lấy raw body chính xác (không qua JSON parser)
        $rawBody = $request->getContent();

        // 1. Kiểm tra với công thức: timestamp.rawBody
        $dataWithTimestamp = $timestamp ? ($timestamp . '.' . $rawBody) : $rawBody;
        $expectedHashWithTimestamp = hash_hmac('sha256', $dataWithTimestamp, $secret);

        // 2. Fallback kiểm tra trực tiếp rawBody (phòng trường hợp SePay cấu hình ký raw body thuần)
        $expectedHashRaw = hash_hmac('sha256', $rawBody, $secret);

        $isValid = hash_equals($expectedHashWithTimestamp, $cleanSignature) 
            || hash_equals($expectedHashRaw, $cleanSignature);

        if (!$isValid) {
            Log::warning('[SePay Webhook] Chữ ký HMAC-SHA256 không hợp lệ', [
                'received_signature' => $signature,
                'timestamp' => $timestamp,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Invalid signature verification.',
            ], 401);
        }

        // Kiểm tra Replay Attack nếu có timestamp (lệch không quá 5 phút = 300s)
        if (!empty($timestamp) && is_numeric($timestamp)) {
            $currentTime = time();
            if (abs($currentTime - (int)$timestamp) > 300) {
                Log::warning('[SePay Webhook] Request timestamp bị hết hạn (> 300s)', [
                    'request_time' => (int)$timestamp,
                    'server_time' => $currentTime,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Webhook timestamp expired.',
                ], 401);
            }
        }

        return $next($request);
    }
}
