<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Court;
use App\Models\Review;
use App\Models\SportCategory;
use App\Models\User;
use App\Models\Venue;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    private function makeCustomer(): User
    {
        return User::create(['full_name' => 'Test customer', 'phone' => '0900'.str_pad((string) (User::count() + 1), 6, '0', STR_PAD_LEFT), 'role' => 'customer', 'status' => 'active']);
    }

    private function makeCourt(): Court
    {
        $owner = User::create(['full_name' => 'Test owner', 'phone' => '0911000001', 'role' => 'owner', 'status' => 'active']);
        $category = SportCategory::create(['code' => 'rev', 'name' => 'Review Sport']);
        $venue = Venue::create(['owner_id' => $owner->id, 'code' => 'VN-REV', 'slug' => 'venue-rev', 'name' => 'Venue', 'address' => '1 Test', 'district' => 'Q1', 'city' => 'HCM', 'phone' => '0901234567', 'open_time' => '06:00:00', 'close_time' => '23:00:00', 'status' => 'active']);

        return Court::create(['venue_id' => $venue->id, 'sport_category_id' => $category->id, 'code' => 'COURT-REV', 'name' => 'Court', 'surface_type' => 'Mat', 'indoor' => true, 'hourly_rate_standard' => 100000, 'hourly_rate_peak' => 150000, 'peak_start' => '17:00', 'peak_end' => '21:00', 'min_booking_minutes' => 30, 'slot_minutes' => 30, 'status' => 'active']);
    }

    private function makeBooking(User $user, Court $court, string $status): Booking
    {
        return Booking::create([
            'booking_code' => 'SZ-T'.strtoupper(substr(uniqid(), -6)),
            'user_id' => $user->id,
            'venue_id' => $court->venue_id,
            'court_id' => $court->id,
            'booking_date' => date('Y-m-d', strtotime('-2 days')),
            'start_time' => '18:00:00',
            'end_time' => '19:00:00',
            'customer_name' => $user->full_name,
            'customer_phone' => '0911223344',
            'court_fee' => 100000,
            'total_price' => 100000,
            'status' => $status,
            'payment_status' => 'paid',
        ]);
    }

    public function test_user_with_completed_booking_can_review_multiple_times(): void
    {
        $court = $this->makeCourt();
        $user = $this->makeCustomer();
        $booking = $this->makeBooking($user, $court, 'completed');

        foreach (['Sân rất đẹp và sạch sẽ', 'Lần hai vẫn rất hài lòng'] as $comment) {
            $this->actingAs($user, 'sanctum')
                ->postJson('/api/v1/reviews', [
                    'booking_id' => $booking->id,
                    'rating' => 5,
                    'comment' => $comment,
                ])
                ->assertCreated();
        }

        $this->assertSame(2, Review::where('booking_id', $booking->id)->count());

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/venues/{$court->venue_id}/my-reviewable-bookings")
            ->assertOk()
            ->assertJsonPath('data.can_review', true)
            ->assertJsonCount(1, 'data.reviewable_bookings');
    }

    public function test_user_without_completed_booking_cannot_review(): void
    {
        $court = $this->makeCourt();
        $user = $this->makeCustomer();
        $booking = $this->makeBooking($user, $court, 'confirmed');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/reviews', [
                'booking_id' => $booking->id,
                'rating' => 4,
                'comment' => 'Chưa chơi mà đã đánh giá',
            ])
            ->assertStatus(422);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/venues/{$court->venue_id}/my-reviewable-bookings")
            ->assertJsonPath('data.can_review', false);
    }
}
