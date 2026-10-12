<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Court;
use App\Models\SportCategory;
use App\Models\Venue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class AiAssistantControllerTest extends TestCase
{
    use DatabaseTransactions;

    private string $testDirectory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDirectory = storage_path('framework/testing/ai-'.Str::uuid());
        config([
            'services.gemini.api_key' => 'test-api-key',
            'services.gemini.model' => 'gemini-2.5-flash',
            'services.gemini.fallback_model' => 'gemini-3.8-flash',
            'services.gemini.embedding_model' => 'gemini-embedding-001',
            'services.gemini.index_path' => $this->testDirectory.'/index.json',
            'services.gemini.timezone' => 'Asia/Ho_Chi_Minh',
        ]);

        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->testDirectory);
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_search_uses_mysql_data_and_excludes_booked_slots(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-13 12:00:00', 'Asia/Ho_Chi_Minh'));
        $sport = SportCategory::query()->firstOrCreate(
            ['code' => 'pickleball'],
            ['name' => 'Pickleball', 'is_active' => true, 'sort_order' => 1],
        );
        $venue = Venue::query()->create([
            'code' => 'AI-VENUE-'.Str::upper(Str::random(8)),
            'name' => 'SportZone AI Test Venue',
            'slug' => 'ai-test-venue-'.Str::lower(Str::random(8)),
            'address' => '1 AI Test Street',
            'district' => 'Qu?n T?n B?nh AI Test',
            'city' => 'Hồ Chí Minh',
            'phone' => '0900000000',
            'open_time' => '06:00:00',
            'close_time' => '23:00:00',
            'rating' => 4.9,
            'status' => 'active',
        ]);
        $court = Court::query()->create([
            'venue_id' => $venue->id,
            'sport_category_id' => $sport->id,
            'code' => 'AI-COURT-'.Str::upper(Str::random(8)),
            'name' => 'Sân Pickleball AI',
            'surface_type' => 'Synthetic',
            'hourly_rate_standard' => 150000,
            'hourly_rate_peak' => 240000,
            'peak_start' => '17:00:00',
            'peak_end' => '21:00:00',
            'min_booking_minutes' => 60,
            'slot_minutes' => 30,
            'status' => 'active',
        ]);
        Booking::query()->create([
            'booking_code' => 'AI-BK-'.Str::upper(Str::random(8)),
            'venue_id' => $venue->id,
            'court_id' => $court->id,
            'booking_date' => '2026-10-14',
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'customer_name' => 'AI Test',
            'customer_phone' => '0900000000',
            'status' => 'confirmed',
        ]);

        Http::fake([
            '*:generateContent' => Http::response($this->geminiTextResponse(json_encode([
                'intent' => 'search_venue',
                'sport' => 'pickleball',
                'location' => 'Tân Bình AI Test',
                'date' => '2026-10-14',
                'time_from' => '18:00',
                'time_to' => '21:00',
                'sort' => 'price_asc',
                'missing_fields' => [],
            ], JSON_UNESCAPED_UNICODE))),
        ]);

        $response = $this->postJson('/api/v1/ai/chat', [
            'message' => 'Tìm sân pickleball ở Tân Bình tối mai giá rẻ',
        ]);

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.type', 'search_results')
            ->assertJsonPath('data.results.0.venue_id', $venue->id)
            ->assertJsonPath('data.results.0.court_id', $court->id)
            ->assertJsonMissing(['start_time' => '18:00'])
            ->assertJsonFragment(['start_time' => '19:00']);
    }

    #[DataProvider('incompleteSearchProvider')]
    public function test_incomplete_search_asks_for_clarification(string $message, array $parsed, array $missing): void
    {
        Http::fake([
            '*:generateContent' => Http::response($this->geminiTextResponse(json_encode($parsed, JSON_UNESCAPED_UNICODE))),
        ]);

        $this->postJson('/api/v1/ai/chat', ['message' => $message])
            ->assertOk()
            ->assertJsonPath('data.type', 'clarification')
            ->assertJsonPath('data.missing_fields', $missing);
    }

    public static function incompleteSearchProvider(): array
    {
        return [
            'badminton tomorrow at 19 without location' => [
                'Tìm sân cầu lông ngày mai lúc 19h',
                self::parsedSearch('badminton', '', '2026-10-14', '19:00', ''),
                ['location'],
            ],
            'Vietnamese football wording without location' => [
                'Tìm sân đá bóng ngày mai',
                self::parsedSearch('đá bóng', '', '2026-10-14', '', ''),
                ['location'],
            ],
            'high-rated tennis without location' => [
                'Tìm sân tennis đánh giá cao',
                self::parsedSearch('tennis', '', '', '', '', 'rating_desc'),
                ['location'],
            ],
            'tonight without sport and location' => [
                'Tìm sân tối nay',
                self::parsedSearch('', '', '2026-10-13', '18:00', '22:00'),
                ['sport', 'location'],
            ],
        ];
    }

    #[DataProvider('knowledgeQuestionProvider')]
    public function test_knowledge_questions_use_local_rag(string $question, string $answer): void
    {
        File::ensureDirectoryExists($this->testDirectory);
        File::put($this->testDirectory.'/index.json', json_encode([
            'chunks' => [[
                'source' => 'sportzone-policy.md',
                'content' => 'Nội dung chính sách SportZone dùng cho bài kiểm thử.',
                'embedding' => [1.0, 0.0, 0.0],
            ]],
        ], JSON_THROW_ON_ERROR));

        Http::fakeSequence()
            ->push($this->geminiTextResponse(json_encode([
                'intent' => 'knowledge',
                'sport' => '',
                'location' => '',
                'date' => '',
                'time_from' => '',
                'time_to' => '',
                'sort' => 'relevance',
                'missing_fields' => [],
            ])), 200)
            ->push(['embedding' => ['values' => [1.0, 0.0, 0.0]]], 200)
            ->push($this->geminiTextResponse($answer), 200);

        $this->postJson('/api/v1/ai/chat', ['message' => $question])
            ->assertOk()
            ->assertJsonPath('data.type', 'knowledge')
            ->assertJsonPath('data.answer', $answer)
            ->assertJsonPath('data.sources.0', 'sportzone-policy.md');
    }

    public static function knowledgeQuestionProvider(): array
    {
        return [
            ['Chính sách hủy sân như thế nào?', 'Hiện chưa có thời hạn hủy chung; bạn cần liên hệ cơ sở.'],
            ['Làm sao để tích điểm?', 'Booking đủ điều kiện được tích điểm theo quy tắc SportZone.'],
            ['Referral hoạt động thế nào?', 'Mỗi người dùng có một mã giới thiệu riêng.'],
        ];
    }

    #[DataProvider('generalIntentProvider')]
    public function test_general_intents_return_safe_local_message(string $message, string $intent, string $type): void
    {
        Http::fake([
            '*:generateContent' => Http::response($this->geminiTextResponse(json_encode([
                'intent' => $intent,
                'sport' => '',
                'location' => '',
                'date' => '',
                'time_from' => '',
                'time_to' => '',
                'sort' => 'relevance',
                'missing_fields' => [],
            ]))),
        ]);

        $this->postJson('/api/v1/ai/chat', ['message' => $message])
            ->assertOk()
            ->assertJsonPath('data.type', $type);
    }

    public static function generalIntentProvider(): array
    {
        return [
            ['Xin chào', 'greeting', 'message'],
            ['Bạn làm được gì?', 'help', 'help'],
        ];
    }

    public function test_empty_message_is_rejected_before_calling_gemini(): void
    {
        Http::fake();

        $this->postJson('/api/v1/ai/chat', ['message' => ''])
            ->assertUnprocessable()
            ->assertJsonPath('success', false)
            ->assertJsonValidationErrors('message');

        Http::assertNothingSent();
    }

    public function test_invalid_gemini_key_returns_friendly_unavailable_response(): void
    {
        Http::fake(['*' => Http::response(['error' => ['message' => 'API key invalid']], 401)]);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.')
            ->assertJsonMissing(['API key invalid']);
    }

    public function test_invalid_structured_json_returns_friendly_unavailable_response(): void
    {
        Http::fake([
            '*:generateContent' => Http::response($this->geminiTextResponse('not-json')),
        ]);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.');
    }

    public function test_gemini_rate_limit_returns_friendly_unavailable_response(): void
    {
        Http::fake(['*' => Http::response(['error' => ['message' => 'rate limited']], 429)]);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonMissing(['rate limited']);

        Http::assertSentCount(2);
    }

    public function test_retired_primary_model_uses_configured_fallback_model(): void
    {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'model unavailable']], 404)
            ->push($this->geminiTextResponse(json_encode([
                'intent' => 'greeting',
                'sport' => '',
                'location' => '',
                'date' => '',
                'time_from' => '',
                'time_to' => '',
                'sort' => 'relevance',
                'missing_fields' => [],
            ])), 200);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertOk()
            ->assertJsonPath('data.type', 'message');

        Http::assertSentCount(2);
    }

    public function test_structured_response_ignores_gemini_thought_parts(): void
    {
        $json = json_encode([
            'intent' => 'greeting',
            'sport' => '',
            'location' => '',
            'date' => '',
            'time_from' => '',
            'time_to' => '',
            'sort' => 'relevance',
            'missing_fields' => [],
        ]);
        Http::fake([
            '*:generateContent' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [
                        ['thought' => true, 'text' => 'Internal reasoning must not be parsed.'],
                        ['text' => $json],
                    ]],
                ]],
            ]),
        ]);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertOk()
            ->assertJsonPath('data.type', 'message');
    }

    public function test_gemini_timeout_returns_friendly_unavailable_response(): void
    {
        Http::fake(fn () => throw new ConnectionException('timeout'));

        $this->postJson('/api/v1/ai/chat', ['message' => 'Xin chào'])
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.');
    }

    public function test_missing_rag_index_returns_friendly_unavailable_response(): void
    {
        Http::fake([
            '*:generateContent' => Http::response($this->geminiTextResponse(json_encode([
                'intent' => 'knowledge',
                'sport' => '',
                'location' => '',
                'date' => '',
                'time_from' => '',
                'time_to' => '',
                'sort' => 'relevance',
                'missing_fields' => [],
            ]))),
        ]);

        $this->postJson('/api/v1/ai/chat', ['message' => 'Chính sách hủy sân?'])
            ->assertStatus(503)
            ->assertJsonPath('success', false)
            ->assertJsonPath('message', 'Trợ lý AI hiện tạm thời không khả dụng. Vui lòng thử lại sau.');
    }

    /** @return array<string, mixed> */
    private function geminiTextResponse(string $text): array
    {
        return [
            'candidates' => [[
                'content' => [
                    'parts' => [['text' => $text]],
                ],
            ]],
        ];
    }

    /** @return array<string, mixed> */
    private static function parsedSearch(
        string $sport,
        string $location,
        string $date,
        string $timeFrom,
        string $timeTo,
        string $sort = 'relevance',
    ): array {
        return [
            'intent' => 'search_venue',
            'sport' => $sport,
            'location' => $location,
            'date' => $date,
            'time_from' => $timeFrom,
            'time_to' => $timeTo,
            'sort' => $sort,
            'missing_fields' => [],
        ];
    }
}
