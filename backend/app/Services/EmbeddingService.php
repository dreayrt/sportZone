<?php

namespace App\Services;

use App\Exceptions\AiAssistantException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class EmbeddingService
{
    /** @return list<float> */
    public function embedDocument(string $content, ?string $title = null): array
    {
        return $this->embed($content, 'RETRIEVAL_DOCUMENT', $title);
    }

    /** @return list<float> */
    public function embedQuery(string $query): array
    {
        return $this->embed($query, 'RETRIEVAL_QUERY');
    }

    /**
     * @return list<array{source: string, content: string, score: float}>
     */
    public function findRelevantChunks(string $query, int $limit = 4): array
    {
        $indexPath = (string) config('services.gemini.index_path');

        if (! File::isFile($indexPath)) {
            throw new AiAssistantException('Kho kiến thức AI chưa được lập chỉ mục.');
        }

        try {
            $index = json_decode(File::get($indexPath), true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            throw new AiAssistantException('Chỉ mục kiến thức AI không hợp lệ.', previous: $exception);
        }

        if (! is_array($index) || ! is_array($index['chunks'] ?? null)) {
            throw new AiAssistantException('Chỉ mục kiến thức AI không hợp lệ.');
        }

        $queryEmbedding = $this->embedQuery($query);
        $ranked = [];

        foreach ($index['chunks'] as $chunk) {
            if (! is_array($chunk)
                || ! is_string($chunk['source'] ?? null)
                || ! is_string($chunk['content'] ?? null)
                || ! is_array($chunk['embedding'] ?? null)) {
                continue;
            }

            $embedding = array_map('floatval', $chunk['embedding']);

            if (count($embedding) !== count($queryEmbedding)) {
                continue;
            }

            $ranked[] = [
                'source' => $chunk['source'],
                'content' => $chunk['content'],
                'score' => $this->cosineSimilarity($queryEmbedding, $embedding),
            ];
        }

        usort($ranked, fn (array $left, array $right): int => $right['score'] <=> $left['score']);

        return array_slice($ranked, 0, max(1, min(5, $limit)));
    }

    /** @param list<float> $left
     * @param  list<float>  $right
     */
    public function cosineSimilarity(array $left, array $right): float
    {
        if ($left === [] || count($left) !== count($right)) {
            return 0.0;
        }

        $dot = 0.0;
        $leftNorm = 0.0;
        $rightNorm = 0.0;

        foreach ($left as $index => $value) {
            $rightValue = $right[$index];
            $dot += $value * $rightValue;
            $leftNorm += $value * $value;
            $rightNorm += $rightValue * $rightValue;
        }

        if ($leftNorm === 0.0 || $rightNorm === 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($leftNorm) * sqrt($rightNorm));
    }

    /** @return list<float> */
    private function embed(string $text, string $taskType, ?string $title = null): array
    {
        $apiKey = trim((string) config('services.gemini.api_key'));

        if ($apiKey === '') {
            throw new AiAssistantException('Gemini chưa được cấu hình.');
        }

        $model = preg_replace(
            '#^models/#',
            '',
            (string) config('services.gemini.embedding_model', 'gemini-embedding-001'),
        ) ?: 'gemini-embedding-001';

        $payload = [
            'model' => 'models/'.$model,
            'content' => ['parts' => [['text' => $text]]],
            'taskType' => $taskType,
            'outputDimensionality' => (int) config('services.gemini.embedding_dimensions', 768),
        ];

        if ($taskType === 'RETRIEVAL_DOCUMENT' && $title !== null && trim($title) !== '') {
            $payload['title'] = mb_substr(trim($title), 0, 100);
        }

        $url = rtrim((string) config('services.gemini.base_url'), '/')
            .sprintf('/models/%s:embedContent', rawurlencode($model));
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
                    $values = $response->json('embedding.values');

                    if (is_array($values) && $values !== []) {
                        return array_values(array_map('floatval', $values));
                    }

                    throw new AiAssistantException('Gemini không trả về embedding hợp lệ.');
                }

                if (($response->status() !== 429 && ! $response->serverError()) || $attempt === 2) {
                    break;
                }
            } catch (ConnectionException $exception) {
                if ($attempt === 2) {
                    Log::warning('Không thể kết nối Gemini Embeddings.', ['exception' => $exception::class]);
                    throw new AiAssistantException('Không thể kết nối Gemini Embeddings.', previous: $exception);
                }
            } catch (AiAssistantException $exception) {
                throw $exception;
            } catch (Throwable $exception) {
                Log::warning('Gemini Embeddings gặp lỗi ngoài dự kiến.', ['exception' => $exception::class]);
                throw new AiAssistantException('Gemini Embeddings không khả dụng.', previous: $exception);
            }

            usleep(150000);
        }

        Log::warning('Gemini Embeddings API trả về lỗi.', ['status' => $lastStatus]);

        throw new AiAssistantException('Gemini Embeddings API không khả dụng.');
    }
}
