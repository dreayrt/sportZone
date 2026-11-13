<?php

namespace App\Rules;

use App\Services\TurnstileService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Turnstile implements ValidationRule
{
    public function __construct(private ?string $ip = null) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $service = app(TurnstileService::class);
        $ip = $this->ip ?? request()->ip();

        if (! $service->verify(is_string($value) ? $value : null, $ip)) {
            $fail('Xác nhận captcha không hợp lệ hoặc đã hết hạn, vui lòng thử lại.');
        }
    }
}
