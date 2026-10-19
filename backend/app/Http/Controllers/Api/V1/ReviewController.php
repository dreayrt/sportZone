<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Booking;
use App\Models\Review;
use App\Models\Venue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ReviewController extends BaseController
{
    /**
     * Lấy danh sách đánh giá của cơ sở thể thao (Public)
     * GET /api/v1/venues/{venueId}/reviews
     */
    public function index(string|int $venueId, Request $request): JsonResponse
    {
        // Hỗ trợ tìm venue theo ID hoặc Slug
        $venue = is_numeric($venueId)
            ? Venue::find($venueId)
            : Venue::where('slug', $venueId)->first();

        if (!$venue) {
            return $this->notFound('Không tìm thấy cơ sở thể thao.');
        }

        // Tính toán thống kê toàn bộ các đánh giá visible của venue (không phụ thuộc vào filter rating)
        $visibleReviewsQuery = Review::where('venue_id', $venue->id)
            ->where('status', 'visible');

        $allRatings = (clone $visibleReviewsQuery)->pluck('rating');
        $totalReviews = $allRatings->count();
        $averageRating = $totalReviews > 0 ? round($allRatings->avg(), 1) : 0.0;

        $ratingDistribution = [
            '5' => 0,
            '4' => 0,
            '3' => 0,
            '2' => 0,
            '1' => 0,
        ];
        foreach ($allRatings as $r) {
            $key = (string) $r;
            if (isset($ratingDistribution[$key])) {
                $ratingDistribution[$key]++;
            }
        }

        // Lọc danh sách hiển thị
        $query = (clone $visibleReviewsQuery)->with(['user:id,full_name,avatar']);

        // Bộ lọc theo số sao: ?rating=5
        if ($request->has('rating') && $request->input('rating') !== '') {
            $filterRating = (int) $request->input('rating');
            if ($filterRating >= 1 && $filterRating <= 5) {
                $query->where('rating', $filterRating);
            }
        }

        // Sắp xếp mới nhất lên đầu
        $perPage = max(1, min(50, (int) $request->input('per_page', 10)));
        $paginated = $query->orderBy('id', 'desc')->paginate($perPage);

        // Chuẩn hóa dữ liệu trả về, không làm lộ thông tin nhạy cảm của user
        $reviewItems = collect($paginated->items())->map(function ($item) {
            return [
                'id' => $item->id,
                'rating' => (int) $item->rating,
                'comment' => $item->comment,
                'status' => $item->status,
                'created_at' => $item->created_at?->toIso8601String(),
                'user' => [
                    'id' => $item->user?->id,
                    'name' => $item->user?->full_name ?: $item->customer_name ?: 'Khách hàng ẩn danh',
                    'avatar' => $item->user?->avatar,
                ],
            ];
        });

        return $this->successResponse([
            'average_rating' => $averageRating,
            'total_reviews' => $totalReviews,
            'rating_distribution' => $ratingDistribution,
            'reviews' => $reviewItems,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Lấy danh sách đánh giá thành công.');
    }

    /**
     * Lấy các đơn đặt sân của khách đủ điều kiện đánh giá cho venue này
     * GET /api/v1/venues/{venueId}/my-reviewable-bookings
     */
    public function getReviewableBookings(string|int $venueId, Request $request): JsonResponse
    {
        $venue = is_numeric($venueId)
            ? Venue::find($venueId)
            : Venue::where('slug', $venueId)->first();

        if (!$venue) {
            return $this->notFound('Không tìm thấy cơ sở thể thao.');
        }

        $user = $request->user();

        // Tìm các đơn completed của user tại venue này chưa từng được review
        $bookings = Booking::where('user_id', $user->id)
            ->where('venue_id', $venue->id)
            ->where('status', 'completed')
            ->whereDoesntHave('review')
            ->with('court:id,name,code')
            ->orderBy('id', 'desc')
            ->get(['id', 'booking_code', 'venue_id', 'court_id', 'booking_date', 'start_time', 'end_time']);

        return $this->successResponse([
            'can_review' => $bookings->isNotEmpty(),
            'reviewable_bookings' => $bookings,
        ], 'Lấy danh sách đơn đủ điều kiện đánh giá.');
    }

    /**
     * Khách hàng gửi đánh giá mới
     * POST /api/v1/reviews
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'booking_id' => 'required|integer',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'required|string|min:10',
        ], [
            'booking_id.required' => 'Mã đơn đặt sân là bắt buộc.',
            'booking_id.integer' => 'Mã đơn đặt sân không hợp lệ.',
            'rating.required' => 'Vui lòng chọn số sao đánh giá.',
            'rating.integer' => 'Số sao đánh giá phải là số nguyên từ 1 đến 5.',
            'rating.min' => 'Số sao đánh giá tối thiểu là 1 sao.',
            'rating.max' => 'Số sao đánh giá tối đa là 5 sao.',
            'comment.required' => 'Vui lòng nhập nội dung nhận xét.',
            'comment.string' => 'Nội dung nhận xét phải là chuỗi ký tự.',
            'comment.min' => 'Nội dung nhận xét tối thiểu 10 ký tự.',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        // 1. Kiểm tra đơn đặt sân tồn tại
        $booking = Booking::with('court')->find($request->input('booking_id'));
        if (!$booking) {
            return $this->notFound('Không tìm thấy thông tin đơn đặt sân.');
        }

        // 2. Kiểm tra booking có thuộc về authenticated user không
        $user = $request->user();
        if ((int) $booking->user_id !== (int) $user->id) {
            return $this->forbidden('Bạn chỉ có thể đánh giá đơn đặt sân của chính mình.');
        }

        // 3. Kiểm tra booking có ở trạng thái 'completed' không
        if ($booking->status !== 'completed') {
            return $this->errorResponse('Chỉ có thể đánh giá đơn đặt sân đã hoàn thành thi đấu.', 422);
        }

        // 4. Kiểm tra booking đã từng được đánh giá chưa
        $alreadyReviewed = Review::where('booking_id', $booking->id)->exists();
        if ($alreadyReviewed) {
            return $this->errorResponse('Đơn đặt sân này đã được đánh giá trước đó.', 422);
        }

        // 5. Xác định venue_id từ relationship thật trong project (không tin venue_id từ client gửi)
        $venueId = $booking->venue_id ?: $booking->court?->venue_id;
        if (!$venueId) {
            return $this->errorResponse('Không xác định được cơ sở thể thao của đơn đặt sân này.', 422);
        }

        // Sử dụng DB transaction để đảm bảo dữ liệu nhất quán
        try {
            $review = DB::transaction(function () use ($booking, $user, $venueId, $request) {
                $createdReview = Review::create([
                    'venue_id' => $venueId,
                    'user_id' => $user->id,
                    'booking_id' => $booking->id,
                    'customer_name' => $user->full_name,
                    'rating' => (int) $request->input('rating'),
                    'comment' => trim($request->input('comment')),
                    'status' => 'visible',
                ]);

                // Tự động tính lại rating và review_count của venue
                $this->recalculateVenueRating($venueId);

                return $createdReview;
            });

            return $this->successResponse([
                'id' => $review->id,
                'venue_id' => $review->venue_id,
                'booking_id' => $review->booking_id,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'status' => $review->status,
                'created_at' => $review->created_at?->toIso8601String(),
            ], 'Gửi đánh giá thành công! Cảm ơn bạn đã đóng góp ý kiến.', 201);
        } catch (\Throwable $e) {
            return $this->errorResponse('Không thể lưu đánh giá: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Admin kiểm duyệt ẩn/hiện đánh giá
     * PUT /api/v1/admin/reviews/{id}/status
     */
    public function updateStatus(int $id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:visible,hidden',
        ], [
            'status.required' => 'Trạng thái đánh giá là bắt buộc.',
            'status.in' => 'Trạng thái phải là visible hoặc hidden.',
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        $review = Review::find($id);
        if (!$review) {
            return $this->notFound('Không tìm thấy đánh giá yêu cầu.');
        }

        try {
            DB::transaction(function () use ($review, $request) {
                $review->status = $request->input('status');
                $review->save();

                // Tính toán lại rating & review_count sau khi thay đổi trạng thái
                $this->recalculateVenueRating($review->venue_id);
            });

            // Lấy thông tin venue sau khi tính lại
            $venue = Venue::find($review->venue_id);

            return $this->successResponse([
                'id' => $review->id,
                'venue_id' => $review->venue_id,
                'status' => $review->status,
                'venue_updated_rating' => (float) $venue?->rating,
                'venue_updated_review_count' => (int) $venue?->review_count,
            ], 'Cập nhật trạng thái đánh giá thành công.');
        } catch (\Throwable $e) {
            return $this->errorResponse('Không thể cập nhật trạng thái: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Tự động tính lại average rating và review count cho Venue
     */
    private function recalculateVenueRating(int $venueId): void
    {
        $stats = Review::where('venue_id', $venueId)
            ->where('status', 'visible')
            ->selectRaw('COUNT(*) as total, AVG(rating) as avg_rating')
            ->first();

        $count = (int) ($stats->total ?? 0);
        $avg = $count > 0 ? round((float) $stats->avg_rating, 1) : 0.0;

        Venue::where('id', $venueId)->update([
            'rating' => $avg,
            'review_count' => $count,
        ]);
    }
}
