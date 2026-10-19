<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class NotificationControllerTest extends TestCase
{
    use DatabaseTransactions;

    public function test_returns_401_when_no_token_is_provided(): void
    {
        $response = $this->getJson('/api/v1/notifications');

        $response->assertUnauthorized()
            ->assertJson([
                'success' => false,
            ]);
    }

    public function test_lists_only_authenticated_user_notifications_newest_first_with_pagination(): void
    {
        $user = $this->createUser('customer');
        $otherUser = $this->createUser('customer');
        $oldest = $this->createNotification($user, ['title' => 'Thông báo cũ']);
        $this->createNotification($user, ['title' => 'Thông báo đã đọc', 'is_read' => true, 'read_at' => now()]);
        $newest = $this->createNotification($user, ['title' => 'Thông báo mới']);
        $otherNotification = $this->createNotification($otherUser, ['title' => 'Thông báo người khác']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/notifications?per_page=2');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.unread_count', 2)
            ->assertJsonPath('data.pagination.current_page', 1)
            ->assertJsonPath('data.pagination.per_page', 2)
            ->assertJsonPath('data.pagination.total', 3)
            ->assertJsonCount(2, 'data.notifications')
            ->assertJsonPath('data.notifications.0.id', $newest->id)
            ->assertJsonMissing(['id' => $otherNotification->id]);

        $this->assertNotSame($oldest->id, $response->json('data.notifications.0.id'));
    }

    #[DataProvider('roles')]
    public function test_all_authenticated_roles_can_list_notifications(string $role): void
    {
        $user = $this->createUser($role);
        $notification = $this->createNotification($user);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/notifications');

        $response->assertOk()
            ->assertJsonPath('data.notifications.0.id', $notification->id);
    }

    public function test_marks_owned_notification_as_read_and_is_idempotent(): void
    {
        $user = $this->createUser('customer');
        $notification = $this->createNotification($user);
        Sanctum::actingAs($user);
        $this->travelTo('2026-10-12 12:00:00');

        $firstResponse = $this->putJson("/api/v1/notifications/{$notification->id}/read");
        $firstReadAt = $notification->fresh()->read_at;

        $firstResponse->assertOk()
            ->assertJsonPath('data.id', $notification->id)
            ->assertJsonPath('data.is_read', true);
        $this->assertNotNull($firstReadAt);

        $this->travelTo('2026-10-12 12:05:00');
        $secondResponse = $this->putJson("/api/v1/notifications/{$notification->id}/read");

        $secondResponse->assertOk()
            ->assertJsonPath('data.is_read', true);
        $this->assertSame(
            $firstReadAt->toIso8601String(),
            $notification->fresh()->read_at?->toIso8601String()
        );
    }

    public function test_returns_404_when_marking_another_users_notification(): void
    {
        $user = $this->createUser('customer');
        $otherUser = $this->createUser('customer');
        $otherNotification = $this->createNotification($otherUser);
        Sanctum::actingAs($user);

        $response = $this->putJson("/api/v1/notifications/{$otherNotification->id}/read");

        $response->assertNotFound()
            ->assertJson([
                'success' => false,
                'message' => 'Không tìm thấy thông báo.',
            ]);
        $this->assertFalse($otherNotification->fresh()->is_read);
    }

    public function test_marks_only_authenticated_users_notifications_as_read(): void
    {
        $user = $this->createUser('owner');
        $otherUser = $this->createUser('customer');
        $firstOwnedNotification = $this->createNotification($user);
        $secondOwnedNotification = $this->createNotification($user);
        $otherNotification = $this->createNotification($otherUser);
        Sanctum::actingAs($user);

        $response = $this->putJson('/api/v1/notifications/read-all');

        $response->assertOk()
            ->assertJsonPath('data.updated_count', 2)
            ->assertJsonPath('data.unread_count', 0);
        $this->assertTrue($firstOwnedNotification->fresh()->is_read);
        $this->assertTrue($secondOwnedNotification->fresh()->is_read);
        $this->assertFalse($otherNotification->fresh()->is_read);
    }

    /**
     * @return array<string, array{string}>
     */
    public static function roles(): array
    {
        return [
            'customer' => ['customer'],
            'owner' => ['owner'],
            'admin' => ['admin'],
        ];
    }

    private function createUser(string $role): User
    {
        $identifier = Str::lower(Str::random(12));

        return User::create([
            'full_name' => "Notification {$role}",
            'email' => "notification-{$identifier}@sportzone.local",
            'phone' => "N{$identifier}",
            'password_hash' => Hash::make('password'),
            'role' => $role,
            'status' => 'active',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createNotification(User $user, array $overrides = []): Notification
    {
        return Notification::create(array_merge([
            'user_id' => $user->id,
            'type' => 'system',
            'title' => 'Thông báo kiểm thử',
            'message' => 'Nội dung thông báo kiểm thử.',
            'channel' => 'in_app',
            'is_read' => false,
        ], $overrides));
    }
}
