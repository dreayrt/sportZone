<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TurnstileService
{
    private const FAILURE_TTL_MINUTES = 15;

    public function enabled(): bool
    {
        return (bool) config('services.turnstile.enabled', true);
    }

    public function verify(?string $token, ?string $ip): bool
    {
        if (! $this->enabled()) {
            return true;
        }

        $secret = (string) config('services.turnstile.secret_key', '');
        $token = trim((string) $token);

        if ($secret === '' || $token === '') {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout((int) config('services.turnstile.timeout', 5))
                ->post((string) config('services.turnstile.verify_url'), [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ]);

            return $response->successful() && $response->json('success') === true;
        } catch (\Throwable $e) {
            Log::warning('Turnstile verification failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    public function loginCaptchaRequired(string $login, ?string $ip): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        return $this->loginFailures($login, $ip) >= (int) config('services.turnstile.login_threshold', 3);
    }

    public function recordLoginFailure(string $login, ?string $ip): int
    {
        $failures = $this->loginFailures($login, $ip) + 1;

        Cache::put(
            $this->failureKey($login, $ip),
            $failures,
            now()->addMinutes(self::FAILURE_TTL_MINUTES)
        );

        return $failures;
    }

    public function clearLoginFailures(string $login, ?string $ip): void
    {
        Cache::forget($this->failureKey($login, $ip));
    }

    private function loginFailures(string $login, ?string $ip): int
    {
        return (int) Cache::get($this->failureKey($login, $ip), 0);
    }

    private function failureKey(string $login, ?string $ip): string
    {
        return 'login-fail:'.sha1(mb_strtolower(trim($login))).':'.($ip ?: 'unknown');
    }
}
