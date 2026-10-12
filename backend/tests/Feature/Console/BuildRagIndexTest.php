<?php

namespace Tests\Feature\Console;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class BuildRagIndexTest extends TestCase
{
    private string $testDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDirectory = storage_path('framework/testing/rag-'.Str::uuid());
        File::ensureDirectoryExists($this->testDirectory.'/knowledge');
        config([
            'services.gemini.api_key' => 'test-api-key',
            'services.gemini.embedding_model' => 'gemini-embedding-001',
            'services.gemini.embedding_dimensions' => 3,
            'services.gemini.knowledge_path' => $this->testDirectory.'/knowledge',
            'services.gemini.index_path' => $this->testDirectory.'/index.json',
        ]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->testDirectory);

        parent::tearDown();
    }

    public function test_command_builds_a_local_index_without_reembedding_at_query_time(): void
    {
        File::put(
            $this->testDirectory.'/knowledge/faq.md',
            "# FAQ\n\nSportZone lấy giá và lịch trống từ cơ sở dữ liệu.",
        );
        Http::fake(fn (Request $request) => Http::response([
            'embedding' => ['values' => [0.1, 0.2, 0.3]],
        ]));

        $this->artisan('sportzone:rag-index')
            ->expectsOutputToContain('Đã lập chỉ mục')
            ->assertSuccessful();

        $this->assertFileExists($this->testDirectory.'/index.json');
        $index = json_decode(File::get($this->testDirectory.'/index.json'), true, 512, JSON_THROW_ON_ERROR);
        $this->assertSame('faq.md', $index['chunks'][0]['source']);
        $this->assertSame([0.1, 0.2, 0.3], $index['chunks'][0]['embedding']);

        Http::assertSent(fn (Request $request): bool => str_contains($request->url(), ':embedContent')
            && $request['taskType'] === 'RETRIEVAL_DOCUMENT'
        );
    }

    public function test_failed_rebuild_keeps_the_existing_index(): void
    {
        File::put($this->testDirectory.'/knowledge/faq.txt', 'Kiến thức SportZone.');
        File::put($this->testDirectory.'/index.json', '{"existing":true}');
        Http::fake(['*' => Http::response(['error' => []], 401)]);

        $this->artisan('sportzone:rag-index')->assertFailed();

        $this->assertSame('{"existing":true}', File::get($this->testDirectory.'/index.json'));
    }
}
