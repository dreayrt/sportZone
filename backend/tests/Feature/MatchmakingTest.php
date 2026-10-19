<?php

namespace Tests\Feature;

use App\Models\MatchMember;
use App\Models\MatchPost;
use App\Models\SportCategory;
use App\Models\User;
use Tests\TestCase;

class MatchmakingTest extends TestCase
{
    protected function getTestUsers(): array
    {
        $creator = User::where('role', 'customer')->first() ?? User::find(4);
        $applicant = User::where('id', '!=', $creator->id)->first() ?? User::find(1);

        return [$creator, $applicant];
    }

    public function test_guest_can_list_matches(): void
    {
        $response = $this->getJson('/api/v1/matches');

        $response->assertStatus(200)
            ->assertJson(['success' => true]);
    }

    public function test_authenticated_user_can_create_match_post(): void
    {
        [$creator] = $this->getTestUsers();
        $category = SportCategory::first();

        $response = $this->actingAs($creator)->postJson('/api/v1/matches', [
            'title' => 'Tìm 2 bạn đánh cầu lông giao lưu tối nay',
            'sport_category_id' => $category->id,
            'match_date' => now()->addDay()->toDateString(),
            'start_time' => '18:00',
            'end_time' => '20:00',
            'location_note' => 'Sân Cầu Lông Kỳ Hòa, Quận 10',
            'skill_level' => 'intermediate',
            'required_members' => 2,
            'estimated_cost_per_person' => 50000,
            'description' => 'Giao lưu trình độ trung bình khá, vui vẻ lịch sự.',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'title' => 'Tìm 2 bạn đánh cầu lông giao lưu tối nay',
                    'current_members' => 1,
                    'status' => 'open',
                ],
            ]);

        $this->assertDatabaseHas('match_posts', [
            'user_id' => $creator->id,
            'title' => 'Tìm 2 bạn đánh cầu lông giao lưu tối nay',
        ]);
    }

    public function test_user_can_apply_to_join_match(): void
    {
        [$creator, $applicant] = $this->getTestUsers();
        $category = SportCategory::first();

        $post = MatchPost::create([
            'user_id' => $creator->id,
            'sport_category_id' => $category->id,
            'title' => 'Ghép kèo tennis cuối tuần',
            'match_date' => now()->addDays(2)->toDateString(),
            'start_time' => '07:00',
            'end_time' => '09:00',
            'required_members' => 1,
            'current_members' => 1,
            'status' => 'open',
        ]);

        $response = $this->actingAs($applicant)->postJson("/api/v1/matches/{$post->id}/join", [
            'message' => 'Mình đánh được 2 năm rồi, cho mình tham gia với nhé!',
        ]);

        $response->assertStatus(201)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('match_members', [
            'match_post_id' => $post->id,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);
    }

    public function test_creator_cannot_join_own_match(): void
    {
        [$creator] = $this->getTestUsers();
        $category = SportCategory::first();

        $post = MatchPost::create([
            'user_id' => $creator->id,
            'sport_category_id' => $category->id,
            'title' => 'Kèo bóng đá',
            'match_date' => now()->addDay()->toDateString(),
            'start_time' => '19:00',
            'end_time' => '20:30',
            'required_members' => 3,
            'current_members' => 1,
            'status' => 'open',
        ]);

        $response = $this->actingAs($creator)->postJson("/api/v1/matches/{$post->id}/join");

        $response->assertStatus(400)
            ->assertJson(['success' => false]);
    }

    public function test_creator_can_accept_and_reject_member(): void
    {
        [$creator, $applicant] = $this->getTestUsers();
        $category = SportCategory::first();

        $post = MatchPost::create([
            'user_id' => $creator->id,
            'sport_category_id' => $category->id,
            'title' => 'Kèo pickleball',
            'match_date' => now()->addDays(3)->toDateString(),
            'start_time' => '17:00',
            'end_time' => '19:00',
            'required_members' => 1,
            'current_members' => 1,
            'status' => 'open',
        ]);

        $member = MatchMember::create([
            'match_post_id' => $post->id,
            'user_id' => $applicant->id,
            'status' => 'pending',
        ]);

        // 1. Duyệt thành viên
        $acceptResponse = $this->actingAs($creator)->putJson("/api/v1/matches/{$post->id}/members/{$member->id}/accept");

        $acceptResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'current_members' => 2,
                    'status' => 'full', // Đã đủ 1 người yêu cầu + 1 chủ kèo = 2
                ],
            ]);

        // 2. Thành viên tự rút lui
        $leaveResponse = $this->actingAs($applicant)->postJson("/api/v1/matches/{$post->id}/leave");
        $leaveResponse->assertStatus(200);

        // Kèo tự mở lại vì thiếu người
        $post->refresh();
        $this->assertEquals('open', $post->status);
        $this->assertEquals(1, $post->current_members);
    }
}
