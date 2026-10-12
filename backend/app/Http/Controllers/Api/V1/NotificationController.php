<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Api\BaseController;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends BaseController
{
    /**
     * Lấy danh sách thông báo của người dùng hiện tại.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(50, $request->integer('per_page', 10)));
        $notificationsQuery = $request->user()->notifications();

        $unreadCount = (clone $notificationsQuery)
            ->where('is_read', false)
            ->count();

        $paginated = $notificationsQuery
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        $notifications = collect($paginated->items())
            ->map(fn (Notification $notification): array => $this->formatNotification($notification))
            ->values();

        return $this->successResponse([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
            'pagination' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ], 'Lấy danh sách thông báo thành công.');
    }

    /**
     * Đánh dấu một thông báo thuộc người dùng hiện tại là đã đọc.
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->whereKey($id)
            ->first();

        if (! $notification) {
            return $this->notFound('Không tìm thấy thông báo.');
        }

        if (! $notification->is_read) {
            $notification->forceFill([
                'is_read' => true,
                'read_at' => now(),
            ])->save();
        }

        return $this->successResponse(
            $this->formatNotification($notification->fresh()),
            'Đã đánh dấu thông báo là đã đọc.'
        );
    }

    /**
     * Đánh dấu toàn bộ thông báo của người dùng hiện tại là đã đọc.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $updatedCount = $request->user()
            ->notifications()
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return $this->successResponse([
            'updated_count' => $updatedCount,
            'unread_count' => 0,
        ], 'Đã đánh dấu tất cả thông báo là đã đọc.');
    }

    /**
     * @return array{
     *     id: int,
     *     type: string,
     *     title: string,
     *     message: string,
     *     reference_type: string|null,
     *     reference_id: int|null,
     *     channel: string,
     *     is_read: bool,
     *     read_at: string|null,
     *     scheduled_at: string|null,
     *     sent_at: string|null,
     *     created_at: string|null
     * }
     */
    private function formatNotification(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'reference_type' => $notification->reference_type,
            'reference_id' => $notification->reference_id,
            'channel' => $notification->channel,
            'is_read' => (bool) $notification->is_read,
            'read_at' => $notification->read_at?->toIso8601String(),
            'scheduled_at' => $notification->scheduled_at?->toIso8601String(),
            'sent_at' => $notification->sent_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
