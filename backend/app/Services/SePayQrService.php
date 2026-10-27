<?php

namespace App\Services;

class SePayQrService
{
    /**
     * Sinh URL QR chuyển khoản do SePay cung cấp.
     */
    public function generateQrUrl(
        int $amount,
        string $description,
        ?string $bank = null,
        ?string $accountNo = null,
        ?string $accountName = null
    ): array {
        $bankName = $bank ?: config('services.sepay.bank_name', 'MBBank');
        $accNo = $accountNo ?: config('services.sepay.account_no', '');
        $accName = $accountName ?: config('services.sepay.account_name', 'SPORTZONE');

        // Mã hóa thông tin URL
        $encodedDescription = urlencode(trim($description));
        // Use SePay as the only QR provider for this course project.
        $sepayQrUrl = "https://qr.sepay.vn/img?acc={$accNo}&bank={$bankName}&amount={$amount}&des={$encodedDescription}";

        return [
            'qr_image_url' => $sepayQrUrl,
            'bank_name' => $bankName,
            'account_no' => $accNo,
            'account_name' => $accName,
            'amount' => $amount,
            'description' => $description,
        ];
    }

    /**
     * Tạo nội dung chuyển khoản chuẩn cho đơn đặt sân
     * Ví dụ: SZ77812 hoặc SZ1
     */
    public function makeTransferDescription(string|int $identifier): string
    {
        $prefix = config('services.sepay.code_prefix', 'SZ');
        $cleanId = preg_replace('/[^A-Za-z0-9]/', '', (string) $identifier);

        // Nếu chuỗi đã có sẵn tiền tố SZ hoặc SPZ thì dùng luôn
        if (str_starts_with(strtoupper($cleanId), strtoupper($prefix))) {
            return strtoupper($cleanId);
        }

        return strtoupper($prefix.$cleanId);
    }

    /**
     * Bóc tách mã đơn hoặc booking_id từ nội dung chuyển khoản của ngân hàng
     * Ví dụ: "MBVCB.12345.SZ77812 chuyen khoan" -> "SZ-77812" hoặc "SZ77812"
     */
    public function extractBookingReference(string $content): ?string
    {
        if (empty($content)) {
            return null;
        }

        $prefix = config('services.sepay.code_prefix', 'SZ');

        // Match both legacy numeric codes and current random alphanumeric booking codes.
        $patterns = [
            '/\b('.preg_quote($prefix, '/').'[-_]?[A-Z0-9]{1,29})\b/i',
            '/\b(SPZ[-_]?[A-Z0-9]{1,29})\b/i',
            '/\b(SZ[-_]?[A-Z0-9]{1,29})\b/i',
            '/\b(SPORTZONE[-_]?[A-Z0-9]{1,29})\b/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $content, $matches)) {
                return strtoupper($matches[1]);
            }
        }

        return null;
    }
}
