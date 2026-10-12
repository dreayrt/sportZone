<?php

namespace App\Services;

use App\Models\Court;
use App\Models\SportCategory;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AiAssistantService
{
    /** @var list<string> */
    private const INTENTS = ['search_venue', 'knowledge', 'greeting', 'help', 'unknown'];

    /** @var list<string> */
    private const OCCUPYING_BOOKING_STATUSES = ['pending', 'confirmed', 'completed'];

    /** @var array<string, string> */
    private const SPORT_ALIASES = [
        'bong da' => 'football',
        'da bong' => 'football',
        'san da bong' => 'football',
        'football' => 'football',
        'soccer' => 'football',
        'cau long' => 'badminton',
        'badminton' => 'badminton',
        'pickleball' => 'pickleball',
        'tennis' => 'tennis',
        'quan vot' => 'tennis',
        'bong ro' => 'basketball',
        'basketball' => 'basketball',
    ];

    public function __construct(
        private readonly GeminiService $gemini,
        private readonly EmbeddingService $embeddings,
    ) {}

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return array<string, mixed>
     */
    public function chat(string $message, array $history = []): array
    {
        $parsed = $this->classify($message, $history);
        $intent = in_array($parsed['intent'] ?? null, self::INTENTS, true)
            ? $parsed['intent']
            : 'unknown';
        $assistantReply = $this->assistantReply($parsed);

        return match ($intent) {
            'search_venue' => $this->searchVenues($parsed),
            'knowledge' => $this->answerKnowledge($message),
            'greeting' => [
                'type' => 'message',
                'message' => $assistantReply !== ''
                    ? $assistantReply
                    : 'Xin chào! Mình là trợ lý SportZone. Mình có thể giúp bạn tìm sân thật theo khu vực, thời gian, giá hoặc giải đáp chính sách của SportZone.',
            ],
            'help' => [
                'type' => 'help',
                'message' => $assistantReply !== ''
                    ? $assistantReply
                    : 'Bạn có thể nhờ mình tìm sân theo môn, khu vực và thời gian; so sánh giá hoặc đánh giá; và hỏi về booking, thanh toán, tích điểm, giới thiệu bạn bè hay review.',
            ],
            default => [
                'type' => 'message',
                'message' => $assistantReply !== ''
                    ? $assistantReply
                    : 'Mình chưa hiểu rõ yêu cầu. Bạn có thể nói rõ môn thể thao, khu vực và thời gian muốn đặt, hoặc đặt câu hỏi về chính sách SportZone nhé.',
            ],
        };
    }

    /**
     * @param  list<array{role: string, content: string}>  $history
     * @return array<string, mixed>
     */
    private function classify(string $message, array $history): array
    {
        $now = CarbonImmutable::now((string) config('services.gemini.timezone', 'Asia/Ho_Chi_Minh'));
        $schema = [
            'type' => 'object',
            'properties' => [
                'intent' => ['type' => 'string', 'enum' => self::INTENTS],
                'sport' => ['type' => 'string'],
                'location' => ['type' => 'string'],
                'date' => ['type' => 'string'],
                'time_from' => ['type' => 'string'],
                'time_to' => ['type' => 'string'],
                'sort' => ['type' => 'string', 'enum' => ['relevance', 'price_asc', 'rating_desc']],
                'missing_fields' => ['type' => 'array', 'items' => ['type' => 'string']],
                'assistant_reply' => ['type' => 'string'],
            ],
            'required' => ['intent', 'sport', 'location', 'date', 'time_from', 'time_to', 'sort', 'missing_fields'],
        ];
        $system = <<<PROMPT
Bạn là bộ phân tích ý định cho SportZone. Chỉ trích xuất thông tin người dùng đã nói; tuyệt đối không tự tạo tên sân, giá, lịch trống, địa điểm hay chính sách.
Phân loại đúng một intent: search_venue, knowledge, greeting, help, unknown. Dùng knowledge cho mọi câu hỏi hoặc yêu cầu hướng dẫn về tính năng SportZone, gồm booking, thanh toán, hủy sân, tài khoản, hồ sơ, đổi mật khẩu, loyalty, referral, review, check-in và thông báo. Chỉ dùng unknown khi nội dung thực sự không liên quan SportZone.
Đọc cả lịch sử hội thoại gần đây. Nếu tin nhắn hiện tại là câu trả lời cho câu hỏi làm rõ, phải kết hợp nó với thông tin người dùng đã nói ở các lượt trước; không bắt người dùng lặp lại môn, khu vực, ngày hoặc giờ đã cung cấp. Thông tin mới nhất được ưu tiên khi có xung đột.
Với search_venue, chuẩn hóa ngày thành YYYY-MM-DD dựa trên thời điểm hiện tại {$now->format('Y-m-d H:i')} tại múi giờ {$now->timezoneName}; giờ thành HH:MM. Nếu người dùng chỉ nói một giờ, để time_to rỗng. Nếu thiếu trường sau khi đã xét lịch sử, dùng chuỗi rỗng và liệt kê trong missing_fields. sort chỉ là price_asc khi có ý giá rẻ, rating_desc khi có ý đánh giá cao, còn lại relevance.
Với intent khác, để các trường tìm kiếm là chuỗi rỗng và missing_fields là mảng rỗng.
assistant_reply là câu phản hồi tiếng Việt tự nhiên, thân thiện, tối đa hai câu và phải dựa trên ngữ cảnh hội thoại. Với search_venue còn thiếu dữ liệu, hãy xác nhận ngắn gọn điều đã hiểu rồi chỉ hỏi đúng thông tin còn thiếu. Với search_venue đã đủ dữ liệu hoặc knowledge, để assistant_reply rỗng. Với greeting/help, trả lời tự nhiên trong phạm vi khả năng SportZone. Với unknown, lịch sự nói rõ phạm vi hỗ trợ; không tự trả lời kiến thức ngoài SportZone. Không dùng Markdown và không bịa sân, giá, slot hay chính sách trong assistant_reply.
PROMPT;

        return $this->gemini->generateStructured(
            "Tin nhắn cần phân tích: {$message}",
            $schema,
            $system,
            $history,
        );
    }

    /** @param array<string, mixed> $parsed
     * @return array<string, mixed>
     */
    private function searchVenues(array $parsed): array
    {
        $sportInput = $this->cleanText($parsed['sport'] ?? '', 80);
        $location = $this->cleanLocation($parsed['location'] ?? '');
        $sport = $this->resolveSport($sportInput);
        $missing = [];

        if (! $sport) {
            $missing[] = 'sport';
        }

        if ($location === '') {
            $missing[] = 'location';
        }

        if ($missing !== []) {
            return $this->clarification($missing, $parsed);
        }

        $date = $this->resolveDate($parsed['date'] ?? '');

        if ($date === null) {
            return [
                'type' => 'clarification',
                'message' => 'Bạn muốn tìm sân vào ngày nào? Vui lòng cho mình ngày hôm nay, ngày mai hoặc ngày cụ thể.',
                'missing_fields' => ['date'],
            ];
        }

        $parsedTimeFrom = $this->resolveTime($parsed['time_from'] ?? '');
        $parsedTimeTo = $this->resolveTime($parsed['time_to'] ?? '');

        if ($parsedTimeFrom === null && $parsedTimeTo === null) {
            $timeFrom = '06:00';
            $timeTo = '23:00';
        } elseif ($parsedTimeFrom === null) {
            $timeTo = $parsedTimeTo;
            $timeFrom = $this->minutesToTime(max(0, $this->timeToMinutes($timeTo) - 120));
        } else {
            $timeFrom = $parsedTimeFrom;
            $timeTo = $parsedTimeTo
                ?? $this->minutesToTime(min(24 * 60, $this->timeToMinutes($timeFrom) + 120));
        }

        if ($this->timeToMinutes($timeTo) <= $this->timeToMinutes($timeFrom)) {
            return [
                'type' => 'clarification',
                'message' => 'Khoảng giờ bạn cung cấp chưa hợp lệ. Vui lòng nhập giờ bắt đầu trước giờ kết thúc.',
                'missing_fields' => ['time_from', 'time_to'],
            ];
        }

        $like = '%'.$location.'%';
        $baseQuery = Court::query()
            ->select([
                'id', 'venue_id', 'sport_category_id', 'name', 'hourly_rate_standard',
                'hourly_rate_peak', 'peak_start', 'peak_end', 'min_booking_minutes',
                'slot_minutes', 'status',
            ])
            ->where('status', 'active')
            ->where('sport_category_id', $sport->id)
            ->whereHas('venue', fn ($query) => $query->where('status', 'active'))
            ->with([
                'venue:id,name,slug,address,district,city,open_time,close_time,rating,status',
                'sportCategory:id,code,name',
                'bookings' => fn ($query) => $query
                    ->select('id', 'court_id', 'booking_date', 'start_time', 'end_time', 'status')
                    ->whereDate('booking_date', $date)
                    ->whereIn('status', self::OCCUPYING_BOOKING_STATUSES),
            ]);

        $courts = (clone $baseQuery)
            ->whereHas('venue', function ($query) use ($like): void {
                $query->where(function ($locationQuery) use ($like): void {
                    $locationQuery->where('district', 'like', $like)
                        ->orWhere('city', 'like', $like)
                        ->orWhere('ward', 'like', $like)
                        ->orWhere('address', 'like', $like)
                        ->orWhere('name', 'like', $like);
                });
            })
            ->limit(50)
            ->get();

        // Dữ liệu seed cũ có một số dấu tiếng Việt bị thay bằng "?". Chỉ khi LIKE
        // không có kết quả, lọc dự phòng trên tập sân cùng môn đã giới hạn.
        if ($courts->isEmpty()) {
            $courts = $baseQuery
                ->limit(100)
                ->get()
                ->filter(fn (Court $court): bool => $this->venueMatchesLocation($court, $location))
                ->values();
        }

        $results = $courts
            ->map(fn (Court $court): ?array => $this->courtResult($court, $date, $timeFrom, $timeTo))
            ->filter()
            ->values();

        $sort = in_array($parsed['sort'] ?? null, ['price_asc', 'rating_desc'], true)
            ? $parsed['sort']
            : 'relevance';

        $results = match ($sort) {
            'price_asc' => $results->sortBy('price'),
            'rating_desc' => $results->sortByDesc('rating'),
            default => $results->sortByDesc('rating'),
        };

        $results = $results->take(5)->values();
        $count = $results->count();

        $dateLabel = CarbonImmutable::parse($date)->format('d/m/Y');
        $resultMessage = $count > 0
            ? "Mình đã kiểm tra sân {$sport->name} tại {$location} vào {$dateLabel} và tìm thấy {$count} lựa chọn phù hợp cho bạn."
            : "Mình đã kiểm tra sân {$sport->name} tại {$location} vào {$dateLabel}, nhưng hiện chưa có khung giờ phù hợp. Bạn thử đổi giờ hoặc khu vực nhé.";

        return [
            'type' => 'search_results',
            'query' => [
                'sport' => $sport->name,
                'location' => $location,
                'date' => $date,
                'time_from' => $timeFrom,
                'time_to' => $timeTo,
                'sort' => $sort,
            ],
            'message' => $resultMessage,
            'results' => $results->all(),
        ];
    }

    /** @return array<string, mixed> */
    private function answerKnowledge(string $question): array
    {
        $chunks = $this->embeddings->findRelevantChunks($question, 4);

        if ($chunks === []) {
            return [
                'type' => 'knowledge',
                'answer' => 'Kho kiến thức SportZone hiện chưa có thông tin chính xác cho câu hỏi này.',
                'sources' => [],
            ];
        }

        $context = collect($chunks)
            ->map(fn (array $chunk, int $index): string => sprintf(
                "[Nguồn %d: %s]\n%s",
                $index + 1,
                $chunk['source'],
                $chunk['content'],
            ))
            ->implode("\n\n");
        $system = <<<'PROMPT'
Bạn là trợ lý kiến thức SportZone. Chỉ trả lời dựa trên CONTEXT SPORTZONE được cung cấp. Không suy diễn, không tự tạo chính sách, giá, phần thưởng hay quy trình. Nếu context không đủ, hãy nói rõ: "Kho kiến thức SportZone hiện chưa có thông tin chính xác cho câu hỏi này." Trả lời ngắn gọn bằng tiếng Việt, dùng văn bản thuần không có cú pháp Markdown, và không nhắc đến embedding hay kỹ thuật RAG.
PROMPT;
        $answer = $this->gemini->generate(
            "CONTEXT SPORTZONE:\n{$context}\n\nCÂU HỎI:\n{$question}",
            $system,
        );

        return [
            'type' => 'knowledge',
            'answer' => $answer,
            'sources' => collect($chunks)->pluck('source')->unique()->values()->all(),
        ];
    }

    /** @return array<string, mixed>|null */
    private function courtResult(Court $court, string $date, string $timeFrom, string $timeTo): ?array
    {
        $venue = $court->venue;

        if (! $venue) {
            return null;
        }

        $requestedStart = max($this->timeToMinutes($timeFrom), $this->timeToMinutes((string) $venue->open_time));
        $requestedEnd = min($this->timeToMinutes($timeTo), $this->timeToMinutes((string) $venue->close_time));
        $duration = max(1, (int) $court->min_booking_minutes);
        $step = max(1, (int) $court->slot_minutes);
        $timezone = (string) config('services.gemini.timezone', 'Asia/Ho_Chi_Minh');
        $now = CarbonImmutable::now($timezone);

        if ($date === $now->toDateString()) {
            $minutesNow = ((int) $now->format('H') * 60) + (int) $now->format('i');
            $requestedStart = max($requestedStart, (int) (ceil($minutesNow / $step) * $step));
        }

        $slots = [];

        for ($start = $requestedStart; $start + $duration <= $requestedEnd; $start += $step) {
            $end = $start + $duration;

            if ($this->isOccupied($court->bookings, $start, $end)) {
                continue;
            }

            $hourlyRate = $this->hourlyRateForSlot($court, $start, $end);
            $slots[] = [
                'start_time' => $this->minutesToTime($start),
                'end_time' => $this->minutesToTime($end),
                'price' => (int) round($hourlyRate * ($duration / 60)),
            ];

            if (count($slots) === 6) {
                break;
            }
        }

        if ($slots === []) {
            return null;
        }

        return [
            'venue_id' => (int) $venue->id,
            'venue_name' => $venue->name,
            'court_id' => (int) $court->id,
            'court_name' => $court->name,
            'sport' => $court->sportCategory?->name,
            'price' => min(array_column($slots, 'price')),
            'rating' => (float) $venue->rating,
            'available_slots' => $slots,
            'date' => $date,
            'slug' => $venue->slug,
            'address' => $venue->address,
        ];
    }

    /** @param Collection<int, mixed> $bookings */
    private function isOccupied(Collection $bookings, int $start, int $end): bool
    {
        return $bookings->contains(function ($booking) use ($start, $end): bool {
            $bookedStart = $this->timeToMinutes((string) $booking->start_time);
            $bookedEnd = $this->timeToMinutes((string) $booking->end_time);

            return $start < $bookedEnd && $end > $bookedStart;
        });
    }

    private function hourlyRateForSlot(Court $court, int $start, int $end): int
    {
        $peakStart = $this->timeToMinutes((string) $court->peak_start);
        $peakEnd = $this->timeToMinutes((string) $court->peak_end);
        $isPeak = $start < $peakEnd && $end > $peakStart;

        return (int) ($isPeak ? $court->hourly_rate_peak : $court->hourly_rate_standard);
    }

    private function resolveSport(string $input): ?SportCategory
    {
        if ($input === '') {
            return null;
        }

        $normalized = $this->normalize($input);
        $expectedCode = self::SPORT_ALIASES[$normalized] ?? $normalized;

        return SportCategory::query()
            ->where('is_active', true)
            ->get(['id', 'code', 'name'])
            ->first(function (SportCategory $category) use ($normalized, $expectedCode): bool {
                return $this->normalize($category->code) === $expectedCode
                    || $this->normalize($category->name) === $normalized;
            });
    }

    private function venueMatchesLocation(Court $court, string $location): bool
    {
        $expectedTokens = $this->locationTokens($location);

        if ($expectedTokens === []) {
            return false;
        }

        $venue = $court->venue;

        if (! $venue) {
            return false;
        }

        foreach ([$venue->district, $venue->city, $venue->ward, $venue->address, $venue->name] as $value) {
            $storedTokens = $this->locationTokens((string) $value);
            $windowSize = count($expectedTokens);

            for ($offset = 0; $offset <= count($storedTokens) - $windowSize; $offset++) {
                $matches = true;

                foreach ($expectedTokens as $index => $expectedToken) {
                    $storedToken = $storedTokens[$offset + $index];
                    $pattern = '/^'.str_replace('\\?', '[a-z0-9]*', preg_quote($storedToken, '/')).'$/';

                    if (! preg_match($pattern, $expectedToken)) {
                        $matches = false;
                        break;
                    }
                }

                if ($matches) {
                    return true;
                }
            }
        }

        return false;
    }

    /** @return list<string> */
    private function locationTokens(string $value): array
    {
        $ascii = Str::of($value)->ascii()->lower()->value();
        $clean = trim((string) preg_replace('/[^a-z0-9?]+/', ' ', $ascii));

        return $clean === '' ? [] : (preg_split('/\s+/', $clean) ?: []);
    }

    private function resolveDate(mixed $value): ?string
    {
        $timezone = (string) config('services.gemini.timezone', 'Asia/Ho_Chi_Minh');
        $today = CarbonImmutable::now($timezone)->startOfDay();
        $normalized = $this->normalize($this->cleanText($value, 30));

        if ($normalized === '' || in_array($normalized, ['today', 'hom nay', 'toi nay'], true)) {
            return $today->toDateString();
        }

        if (in_array($normalized, ['tomorrow', 'ngay mai'], true)) {
            return $today->addDay()->toDateString();
        }

        $raw = $this->cleanText($value, 30);

        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $raw)) {
            return null;
        }

        try {
            $date = CarbonImmutable::createFromFormat('!Y-m-d', $raw, $timezone);
        } catch (\Throwable) {
            return null;
        }

        return $date && $date->greaterThanOrEqualTo($today) ? $date->toDateString() : null;
    }

    private function resolveTime(mixed $value): ?string
    {
        $raw = trim((string) $value);

        if ($raw === '') {
            return null;
        }

        if (! preg_match('/^(\d{1,2})(?::(\d{2}))?$/', $raw, $matches)) {
            return null;
        }

        $hour = (int) $matches[1];
        $minute = isset($matches[2]) ? (int) $matches[2] : 0;

        if ($hour > 23 || $minute > 59) {
            return null;
        }

        return sprintf('%02d:%02d', $hour, $minute);
    }

    /** @param list<string> $missing
     * @return array<string, mixed>
     */
    private function clarification(array $missing, array $parsed): array
    {
        $fallback = match (true) {
            in_array('sport', $missing, true) && in_array('location', $missing, true) => 'Bạn muốn tìm sân môn gì và ở khu vực nào?',
            in_array('sport', $missing, true) => 'Bạn muốn tìm sân môn gì?',
            default => 'Bạn muốn tìm sân ở khu vực nào?',
        };
        $message = $this->assistantReply($parsed) ?: $fallback;

        return [
            'type' => 'clarification',
            'message' => $message,
            'missing_fields' => $missing,
        ];
    }

    /** @param array<string, mixed> $parsed */
    private function assistantReply(array $parsed): string
    {
        $reply = $this->cleanText($parsed['assistant_reply'] ?? '', 300);
        $reply = trim(strip_tags($reply));

        return trim((string) preg_replace('/\s+/u', ' ', $reply));
    }

    private function cleanLocation(mixed $value): string
    {
        $clean = preg_replace('/[^\pL\pN\s,.\-]/u', '', $this->cleanText($value, 100));

        return trim((string) preg_replace('/\s+/u', ' ', $clean ?? ''));
    }

    private function cleanText(mixed $value, int $maxLength): string
    {
        return mb_substr(trim(is_scalar($value) ? (string) $value : ''), 0, $maxLength);
    }

    private function normalize(string $value): string
    {
        return Str::of($value)->ascii()->lower()->squish()->value();
    }

    private function timeToMinutes(string $time): int
    {
        [$hours, $minutes] = array_pad(array_map('intval', explode(':', $time)), 2, 0);

        return ($hours * 60) + $minutes;
    }

    private function minutesToTime(int $minutes): string
    {
        $minutes = max(0, min((24 * 60) - 1, $minutes));

        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
