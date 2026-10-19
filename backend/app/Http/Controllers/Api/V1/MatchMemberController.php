<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\MatchMember;
use App\Models\MatchPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MatchMemberController extends BaseController
{
    /**
     * Đăng ký tham gia một kèo tìm đối
     * POST /api/v1/matches/{id}/join
     */
    public function join(Request $request, int $matchPostId): JsonResponse
    {
        $match = MatchPost::find($matchPostId);

        if (!$match) {
            return $this->notFound('Không tìm thấy bài đăng tìm đối.');
        }

        $user = $request->user();

        // Không cho người tạo tự đăng ký vào bài của mình
        if ($match->user_id === $user->id) {
            return $this->errorResponse('Bạn là người tạo kèo này nên không cần đăng ký tham gia.', 400);
        }

        // Kiểm tra trạng thái kèo
        if ($match->status !== 'open') {
            return $this->errorResponse('Kèo này hiện không nhận thêm thành viên (trạng thái: ' . $match->status . ').', 400);
        }

        $validated = $request->validate([
            'message' => 'nullable|string|max:255',
        ]);

        // Kiểm tra đã đăng ký trước đó chưa
        $existing = MatchMember::where('match_post_id', $matchPostId)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'accepted') {
                return $this->errorResponse('Bạn đã là thành viên chính thức của kèo này rồi.', 400);
            }
            if ($existing->status === 'pending') {
                return $this->errorResponse('Bạn đã gửi yêu cầu tham gia rồi, vui lòng đợi chủ kèo phê duyệt.', 400);
            }

            // Nếu đã từng bị từ chối hoặc từng rời kèo thì cho phép gửi lại yêu cầu
            $existing->update([
                'status' => 'pending',
                'message' => $validated['message'] ?? null,
                'joined_at' => null,
            ]);

            return $this->successResponse($existing, 'Đã gửi lại yêu cầu tham gia kèo thành công.');
        }

        $member = MatchMember::create([
            'match_post_id' => $matchPostId,
            'user_id' => $user->id,
            'message' => $validated['message'] ?? null,
            'status' => 'pending',
        ]);

        return $this->successResponse($member, 'Đã gửi yêu cầu tham gia kèo thành công! Vui lòng chờ chủ kèo duyệt.', 201);
    }

    /**
     * Duyệt thành viên vào kèo (Chỉ chủ bài đăng)
     * PUT /api/v1/matches/{matchId}/members/{memberId}/accept
     */
    public function accept(Request $request, int $matchPostId, int $memberId): JsonResponse
    {
        $match = MatchPost::find($matchPostId);

        if (!$match) {
            return $this->notFound('Không tìm thấy bài đăng tìm đối.');
        }

        $user = $request->user();
        if ($match->user_id !== $user->id && $user->role !== 'admin') {
            return $this->forbidden('Chỉ người tạo kèo mới có quyền duyệt thành viên.');
        }

        $member = MatchMember::where('id', $memberId)
            ->where('match_post_id', $matchPostId)
            ->first();

        if (!$member) {
            return $this->notFound('Không tìm thấy yêu cầu tham gia của thành viên.');
        }

        if ($member->status === 'accepted') {
            return $this->errorResponse('Thành viên này đã được duyệt trước đó rồi.', 400);
        }

        // Kiểm tra xem kèo đã đủ người chưa
        $acceptedCount = $match->acceptedMembers()->count();
        if ($acceptedCount >= $match->required_members) {
            return $this->errorResponse('Kèo đã đủ số lượng người yêu cầu, không thể duyệt thêm.', 400);
        }

        $member->update([
            'status' => 'accepted',
            'joined_at' => now(),
        ]);

        $match->syncMembersCount();

        return $this->successResponse([
            'member' => $member,
            'current_members' => $match->current_members,
            'status' => $match->status,
        ], 'Đã duyệt thành viên vào kèo thành công!');
    }

    /**
     * Từ chối thành viên (Chỉ chủ bài đăng)
     * PUT /api/v1/matches/{matchId}/members/{memberId}/reject
     */
    public function reject(Request $request, int $matchPostId, int $memberId): JsonResponse
    {
        $match = MatchPost::find($matchPostId);

        if (!$match) {
            return $this->notFound('Không tìm thấy bài đăng tìm đối.');
        }

        $user = $request->user();
        if ($match->user_id !== $user->id && $user->role !== 'admin') {
            return $this->forbidden('Chỉ người tạo kèo mới có quyền từ chối thành viên.');
        }

        $member = MatchMember::where('id', $memberId)
            ->where('match_post_id', $matchPostId)
            ->first();

        if (!$member) {
            return $this->notFound('Không tìm thấy yêu cầu tham gia của thành viên.');
        }

        $member->update(['status' => 'rejected']);
        $match->syncMembersCount();

        return $this->successResponse($member, 'Đã từ chối yêu cầu tham gia của thành viên.');
    }

    /**
     * Rút khỏi kèo (Dành cho thành viên đã đăng ký hoặc đã được duyệt)
     * POST /api/v1/matches/{id}/leave
     */
    public function leave(Request $request, int $matchPostId): JsonResponse
    {
        $match = MatchPost::find($matchPostId);

        if (!$match) {
            return $this->notFound('Không tìm thấy bài đăng tìm đối.');
        }

        $user = $request->user();

        $member = MatchMember::where('match_post_id', $matchPostId)
            ->where('user_id', $user->id)
            ->first();

        if (!$member || in_array($member->status, ['rejected', 'left'])) {
            return $this->errorResponse('Bạn chưa tham gia hoặc đã rời khỏi kèo này.', 400);
        }

        $member->update(['status' => 'left']);
        $match->syncMembersCount();

        return $this->successResponse(null, 'Bạn đã rút lui khỏi kèo thành công.');
    }
}
