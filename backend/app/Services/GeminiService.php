<?php

namespace App\Services;

use App\Exceptions\AiAssistantException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use JsonException;
use Throwable;

class GeminiService
{
    /**
     * @param  list<array{role: string, content: string}>  $history
     */
    public function generate(string $prompt, ?string $systemInstruction = null, array $history = []): string
    {
        $contents = $this->historyToContents($history);
        $contents[] = ['role' => 'user', 'parts' => [['text' => $prompt]]];

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 1024,
            ],
        ];

        if ($systemInstruction !== null && trim($systemInstruction) !== '') {
            $payload['systemInstruction'] = ['parts' => [['text' => $systemInstruction]]];
        }

        return $this->extractText($this->postGenerate($payload));
    }

    /**
     * @param  array<string, mixed>  $schema
     * @param  list<array{role: string, content: string}>  $history
     * @return array<string, mixed>
     */
    public function generateStructured(
        string $prompt,
        array $schema,
        ?string $systemInstruction = null,
        array $history = [],
    ): array {
        $contents = $this->historyToContents($history);
        $contents[] = ['role' => 'user', 'parts' => [['text' => $prompt]]];

        $payload = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0,
                'maxOutputTokens' => 512,
                'responseMimeType' => 'application/json',
                'responseSchema' => $schema,
            ],
        ];

        if ($systemInstruction !== null && trim($systemInstruction) !== '') {
            $payload['systemInstruction'] = ['parts' => [['text' => $systemInstruction]]];
        }

        $text = $this->extractText($this->postGenerate($payload));

        try {
            $decoded = json_decode($this->stripCodeFence($text), true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new AiAssistantException('Gemini trả về dữ liệu không đúng định dạng.');
        }

        if (! is_array($decoded)) {
            throw new AiAssistantException('Gemini trả về dữ liệu không đúng định dạng.');
        }

        return $decoded;
    }

    /** @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function post(string $path, array $payload): array
    {
        $apiKey = trim((string) config('services.gemini.api_key'));

        if ($apiKey === '') {
            throw new AiAssistantException('Gemini chưa được cấu hình.');
        }

        $url = rtrim((string) config('services.gemini.base_url'), '/').$path;
        $lastStatus = null;

        for ($attempt = 1; $attempt <= 2; $attempt++) {
            try {
                $response = Http::acceptJson()
                    ->withHeaders(['x-goog-api-key' => $apiKey])
                    ->connectTimeout((int) config('services.gemini.connect_timeout', 5))
                    ->timeout((int) config('services.gemini.timeout', 20))
                    ->post($url, $payload);

                $lastStatus = $response->status();

                if ($response->successful()) {
                    $json = $response->json();

                    if (is_array($json)) {
                        return $json;
                    }

                    throw new AiAssistantException('Gemini trả về dữ liệu không hợp lệ.');
                }

                if (! $this->shouldRetry($response) || $attempt === 2) {
                    break;
                }
            } catch (ConnectionException $exception) {
                if ($attempt === 2) {
                    Log::warning('Không thể kết nối Gemini.', ['exception' => $exception::class]);
                    throw new AiAssistantException('Không thể kết nối Gemini.', previous: $exception);
                }
            } catch (AiAssistantException $exception) {
                throw $exception;
            } catch (Throwable $exception) {
                Log::warning('Gemini gặp lỗi ngoài dự kiến.', ['exception' => $exception::class]);
                throw new AiAssistantException('Gemini không khả dụng.', previous: $exception);
            }

            usleep(150000);
        }

        Log::warning('Gemini API trả về lỗi.', ['status' => $lastStatus]);

        throw new AiAssistantException('Gemini API không khả dụng.', (int) $lastStatus);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function postGenerate(array $payload): array
    {
        $models = array_values(array_unique(array_filter([
            $this->model(),
            $this->normalizeModel((string) config('services.gemini.fallback_model')),
        ])));
        $lastException = null;

        foreach ($models as $index => $model) {
            try {
                return $this->post(
                    sprintf('/models/%s:generateContent', rawurlencode($model)),
                    $payload,
                );
            } catch (AiAssistantException $exception) {
                $lastException = $exception;
                $hasFallback = isset($models[$index + 1]);

                if ($exception->getCode() !== 404 || ! $hasFallback) {
                    throw $exception;
                }

                Log::notice('Gemini model chính không khả dụng, chuyển sang model dự phòng.', [
                    'model' => $model,
                    'fallback_model' => $models[$index + 1],
                ]);
            }
        }

        throw $lastException ?? new AiAssistantException('Gemini API không khả dụng.');
    }

    /** @param array<string, mixed> $response */
    private function extractText(array $response): string
    {
        $parts = data_get($response, 'candidates.0.content.parts', []);
        $text = collect(is_array($parts) ? $parts : [])
            ->filter(fn (mixed $part): bool => is_array($part) && ! ($part['thought'] ?? false))
            ->pluck('text')
            ->filter(fn (mixed $value): bool => is_string($value))
            ->implode('');

        if (trim($text) === '') {
            throw new AiAssistantException('Gemini không trả về nội dung.');
        }

        return trim($text);
    }

    private function shouldRetry(Response $response): bool
    {
        return $response->status() === 429 || $response->serverError();
    }

    private function model(): string
    {
        return $this->normalizeModel((string) config('services.gemini.model', 'gemini-2.5-flash'))
            ?: 'gemini-2.5-flash';
    }

    private function normalizeModel(string $model): string
    {
        return trim((string) preg_replace('#^models/#', '', trim($model)));
    }

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return list<array{role: string, parts: list<array{text: string}>}>
     */
    private function historyToContents(array $history): array
    {
        return collect($history)
            ->take(-6)
            ->filter(fn (array $item): bool => in_array($item['role'] ?? '', ['user', 'assistant'], true))
            ->map(fn (array $item): array => [
                'role' => $item['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => mb_substr(trim((string) ($item['content'] ?? '')), 0, 500)]],
            ])
            ->filter(fn (array $item): bool => $item['parts'][0]['text'] !== '')
            ->values()
            ->all();
    }

    private function stripCodeFence(string $value): string
    {
        $value = trim($value);

        if (str_starts_with($value, '```')) {
            $value = preg_replace('/^```(?:json)?\s*/i', '', $value) ?? $value;
            $value = preg_replace('/\s*```$/', '', $value) ?? $value;
        }

        return trim($value);
    }
}
