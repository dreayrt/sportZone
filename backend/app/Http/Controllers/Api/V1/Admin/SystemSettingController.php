<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SystemSettingController extends BaseController
{
    public function index(): JsonResponse
    {
        return $this->successResponse($this->values());
    }

    public function publicSettings(): JsonResponse
    {
        return $this->successResponse(['hotline' => SystemSetting::getVal('hotline', '1900 6868')]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sepay_bank_name' => ['required', 'string', 'max:100'],
            'sepay_account_no' => ['nullable', 'string', 'regex:/^[0-9]{4,30}$/'],
            'sepay_account_name' => ['required', 'string', 'max:150'],
            'hotline' => ['nullable', 'string', 'max:30'],
            'loyalty_points_per_10k' => ['required', 'integer', 'between:0,10000'],
            'referral_referrer_points' => ['required', 'integer', 'between:0,100000'],
            'referral_referred_points' => ['required', 'integer', 'between:0,100000'],
            'reminder_before_minutes' => ['required', 'integer', 'between:1,1440'],
        ]);
        foreach ($data as $key => $value) {
            SystemSetting::updateOrCreate(['setting_key' => $key], ['setting_value' => $value === null ? '' : (string) $value]);
        }

        return $this->successResponse($this->values(), 'Đã lưu cấu hình hệ thống.');
    }

    private function values(): array
    {
        return [
            'sepay_bank_name' => SystemSetting::getVal('sepay_bank_name', (string) config('services.sepay.bank_name')),
            'sepay_account_no' => SystemSetting::getVal('sepay_account_no', (string) config('services.sepay.account_no')),
            'sepay_account_name' => SystemSetting::getVal('sepay_account_name', (string) config('services.sepay.account_name')),
            'hotline' => SystemSetting::getVal('hotline', ''),
            'loyalty_points_per_10k' => (int) SystemSetting::getVal('loyalty_points_per_10k', '1'),
            'referral_referrer_points' => (int) SystemSetting::getVal('referral_referrer_points', '50'),
            'referral_referred_points' => (int) SystemSetting::getVal('referral_referred_points', '30'),
            'reminder_before_minutes' => (int) SystemSetting::getVal('reminder_before_minutes', '60'),
        ];
    }
}
