<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\MatchMember;
use App\Models\MatchPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchPostController extends BaseController
{
    /**
     * Danh sách bài đăng tìm đối / ghép kèo công khai
     * GET /api/v1/matches
     */
    public function index(Request $request): JsonResponse
    {
        $query = MatchPost::query()
            ->with([
                'creator:id,full_name,avatar',
                'sportCategory:id,code,name,banner_image',
                'venue:id,name,address,district,city',
                'court:id,name',
            ]);

        // Mặc định chỉ lấy các kèo sắp diễn ra và trạng thái open/full (trừ khi có filter cụ thể)
        if (! $request->has('status')) {
            $query->whereIn('status', ['open', 'full'])
                ->whereDate('match_date', '>=', now()->toDateString());
        }

        $query->filter($request->only([
            'sport_category_id',
            'skill_level',
            'status',
            'date',
            'city',
            'keyword',
        ]));

        $matches = $query->orderBy('match_date', 'asc')
            ->orderBy('start_time', 'asc')
            ->paginate($request->integer('per_page', 12));

        return $this->successResponse($matches, 'Lấy danh sách kèo ghép tìm đối thành công.');
    }

    /**
     * Chi tiết bài đăng tìm đối
     * GET /api/v1/matches/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $match = MatchPost::with([
            'creator:id,full_name,avatar',
            'sportCategory:id,code,name,banner_image',
            'venue:id,name,address,district,city,latitude,longitude',
            'court:id,name,surface_type',
            'acceptedMembers.user:id,full_name,avatar',
        ])->find($id);

        if (! $match) {
            return $this->notFound('Không tìm thấy bài đăng tìm đối yêu cầu.');
        }

        // Lấy thông tin ứng tuyển của người dùng hiện tại nếu có đăng nhập
        $currentUser = $request->user('sanctum');
        $myApplication = null;
        $isCreator = false;

        if ($currentUser) {
            $isCreator = ($currentUser->id === $match->user_id);
            if (! $isCreator) {
                $myApplication = MatchMember::where('match_post_id', $match->id)
                    ->where('user_id', $currentUser->id)
                    ->first();
            }
        }

        // Nếu là chủ bài đăng, load thêm danh sách chờ duyệt
        if ($isCreator) {
            $match->load(['pendingMembers.user:id,full_name,phone,avatar']);
        }

        $data = $match->toArray();
        $data['is_creator'] = $isCreator;
        $data['my_application'] = $myApplication ? [
            'id' => $myApplication->id,
            'status' => $myApplication->status,
            'message' => $myApplication->message,
            'created_at' => $myApplication->created_at?->format('Y-m-d H:i:s'),
        ] : null;

        return $this->successResponse($data, 'Lấy chi tiết kèo thành công.');
    }

    /**
     * Đăng bài tìm đối / ghép kèo mới (Yêu cầu đăng nhập)
     * POST /api/v1/matches
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:200',
            'sport_category_id' => 'required|integer|exists:sport_categories,id',
            'venue_id' => 'nullable|integer|exists:venues,id',
            'court_id' => 'nullable|integer|exists:courts,id',
            'match_date' => 'required|date|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'location_note' => 'nullable|string|max:255',
            'skill_level' => 'nullable|in:all,beginner,intermediate,advanced',
            'required_members' => 'required|integer|min:1|max:50',
            'estimated_cost_per_person' => 'nullable|integer|min:0',
            'contact_phone' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:2000',
        ]);

        $user = $request->user();

        $match = MatchPost::create([
            'user_id' => $user->id,
            'sport_category_id' => $validated['sport_category_id'],
            'venue_id' => $validated['venue_id'] ?? null,
            'court_id' => $validated['court_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'match_date' => $validated['match_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'location_note' => $validated['location_note'] ?? null,
            'skill_level' => $validated['skill_level'] ?? 'all',
            'required_members' => $validated['required_members'],
            'current_members' => 1, // Chủ bài đăng
            'estimated_cost_per_person' => $validated['estimated_cost_per_person'] ?? 0,
            'contact_phone' => $validated['contact_phone'] ?? $user->phone,
            'status' => 'open',
        ]);

        $match->load(['sportCategory', 'venue', 'court']);

        return $this->successResponse($match, 'Đăng bài tìm đối thành công!', 201);
    }

    /**
     * Cập nhật bài đăng (Chỉ người tạo bài)
     * PUT /api/v1/matches/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $match = MatchPost::find($id);

        if (! $match) {
            return $this->notFound('Không tìm thấy bài đăng cần cập nhật.');
        }

        $user = $request->user();
        if ($match->user_id !== $user->id && $user->role !== 'admin') {
            return $this->forbidden('Bạn không có quyền chỉnh sửa bài đăng này.');
        }

        if (in_array($match->status, ['completed', 'cancelled'])) {
            return $this->errorResponse('Không thể chỉnh sửa bài đăng đã kết thúc hoặc đã hủy.', 400);
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:200',
            'sport_category_id' => 'sometimes|integer|exists:sport_categories,id',
            'venue_id' => 'nullable|integer|exists:venues,id',
            'court_id' => 'nullable|integer|exists:courts,id',
            'match_date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'location_note' => 'nullable|string|max:255',
            'skill_level' => 'sometimes|in:all,beginner,intermediate,advanced',
            'required_members' => 'sometimes|integer|min:1|max:50',
            'estimated_cost_per_person' => 'nullable|integer|min:0',
            'contact_phone' => 'nullable|string|max:20',
            'description' => 'nullable|string|max:2000',
            'status' => 'sometimes|in:open,full,completed,cancelled',
        ]);

        $match->update($validated);
        $match->syncMembersCount();

        return $this->successResponse($match, 'Cập nhật bài đăng tìm đối thành công.');
    }

    /**
     * Hủy bài đăng tìm đối
     * DELETE /api/v1/matches/{id}
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $match = MatchPost::find($id);

        if (! $match) {
            return $this->notFound('Không tìm thấy bài đăng cần hủy.');
        }

        $user = $request->user();
        if ($match->user_id !== $user->id && $user->role !== 'admin') {
            return $this->forbidden('Bạn không có quyền hủy bài đăng này.');
        }

        $match->update(['status' => 'cancelled']);

        return $this->successResponse($match, 'Đã hủy bài đăng tìm đối thành công.');
    }

    /**
     * Danh sách các bài đăng do tôi tạo
     * GET /api/v1/my-matches/created
     */
    public function myPosts(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $posts = MatchPost::where('user_id', $userId)
            ->with(['sportCategory', 'venue', 'court'])
            ->withCount(['pendingMembers', 'acceptedMembers'])
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 10));

        return $this->successResponse($posts, 'Lấy danh sách bài đăng của tôi thành công.');
    }

    /**
     * Danh sách các kèo tôi đã đăng ký tham gia
     * GET /api/v1/my-matches/joined
     */
    public function myJoined(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $memberships = MatchMember::where('user_id', $userId)
            ->with([
                'matchPost.creator:id,full_name,avatar',
                'matchPost.sportCategory',
                'matchPost.venue',
            ])
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 10));

        return $this->successResponse($memberships, 'Lấy danh sách kèo đã đăng ký tham gia thành công.');
    }
}
