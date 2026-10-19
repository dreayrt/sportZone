<?php

namespace App\Console\Commands;

use App\Services\EmbeddingService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Throwable;

#[Signature('sportzone:rag-index')]
#[Description('Tạo lại chỉ mục RAG cục bộ từ kho kiến thức SportZone')]
class BuildRagIndex extends Command
{
    private const MAX_CHUNK_LENGTH = 1200;

    private const CHUNK_OVERLAP = 150;

    public function __construct(private readonly EmbeddingService $embeddings)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $knowledgePath = (string) config('services.gemini.knowledge_path');
        $indexPath = (string) config('services.gemini.index_path');
        $temporaryPath = $indexPath.'.tmp.'.Str::uuid();

        try {
            $documents = $this->readDocuments($knowledgePath);

            if ($documents === []) {
                $this->error("Không tìm thấy tài liệu .md, .txt hoặc .json trong {$knowledgePath}.");

                return self::FAILURE;
            }

            $chunks = [];

            foreach ($documents as $source => $content) {
                foreach ($this->chunk($content) as $position => $chunk) {
                    $this->line(sprintf('Đang embedding %s (chunk %d)...', $source, $position + 1));
                    $chunks[] = [
                        'id' => hash('sha256', $source.'|'.$position.'|'.$chunk),
                        'source' => $source,
                        'content' => $chunk,
                        'embedding' => $this->embeddings->embedDocument($chunk, $source),
                    ];
                }
            }

            $index = [
                'version' => 1,
                'model' => (string) config('services.gemini.embedding_model'),
                'dimensions' => (int) config('services.gemini.embedding_dimensions'),
                'generated_at' => now()->toIso8601String(),
                'chunks' => $chunks,
            ];
            $json = json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

            File::ensureDirectoryExists(dirname($indexPath));
            File::put($temporaryPath, $json);

            if (File::exists($indexPath)) {
                File::delete($indexPath.'.previous');
                File::move($indexPath, $indexPath.'.previous');
            }

            if (! File::move($temporaryPath, $indexPath)) {
                if (File::exists($indexPath.'.previous')) {
                    File::move($indexPath.'.previous', $indexPath);
                }

                throw new \RuntimeException('Không thể thay thế file chỉ mục.');
            }

            File::delete($indexPath.'.previous');
            $this->info(sprintf('Đã lập chỉ mục %d chunk từ %d tài liệu.', count($chunks), count($documents)));

            return self::SUCCESS;
        } catch (Throwable $exception) {
            File::delete($temporaryPath);
            $this->error('Không thể tạo chỉ mục RAG: '.$exception->getMessage());

            return self::FAILURE;
        }
    }

    /** @return array<string, string> */
    private function readDocuments(string $path): array
    {
        if (! File::isDirectory($path)) {
            return [];
        }

        $documents = [];

        foreach (File::files($path) as $file) {
            $extension = strtolower($file->getExtension());

            if (! in_array($extension, ['md', 'txt', 'json'], true)) {
                continue;
            }

            $content = File::get($file->getPathname());

            if ($extension === 'json') {
                $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                $content = $this->jsonToText($decoded);
            }

            if (trim($content) !== '') {
                $documents[$file->getFilename()] = trim($content);
            }
        }

        ksort($documents);

        return $documents;
    }

    /** @return list<string> */
    private function chunk(string $content): array
    {
        $paragraphs = preg_split('/\R{2,}/u', trim($content)) ?: [];
        $chunks = [];
        $current = '';

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);

            if ($paragraph === '') {
                continue;
            }

            if (mb_strlen($paragraph) > self::MAX_CHUNK_LENGTH) {
                if ($current !== '') {
                    $chunks[] = $current;
                    $current = '';
                }

                $step = self::MAX_CHUNK_LENGTH - self::CHUNK_OVERLAP;

                for ($offset = 0; $offset < mb_strlen($paragraph); $offset += $step) {
                    $chunks[] = mb_substr($paragraph, $offset, self::MAX_CHUNK_LENGTH);
                }

                continue;
            }

            $candidate = $current === '' ? $paragraph : $current."\n\n".$paragraph;

            if (mb_strlen($candidate) > self::MAX_CHUNK_LENGTH) {
                $chunks[] = $current;
                $overlap = mb_substr($current, -self::CHUNK_OVERLAP);
                $current = trim($overlap."\n\n".$paragraph);
            } else {
                $current = $candidate;
            }
        }

        if ($current !== '') {
            $chunks[] = $current;
        }

        return array_values(array_filter($chunks, fn (string $chunk): bool => trim($chunk) !== ''));
    }

    private function jsonToText(mixed $value, string $prefix = ''): string
    {
        if (is_scalar($value) || $value === null) {
            return trim($prefix.' '.(string) $value);
        }

        if (! is_array($value)) {
            return '';
        }

        $lines = [];

        foreach ($value as $key => $item) {
            $label = is_string($key) ? trim($prefix.' '.$key) : $prefix;
            $text = $this->jsonToText($item, $label);

            if ($text !== '') {
                $lines[] = $text;
            }
        }

        return implode("\n", $lines);
    }
}
