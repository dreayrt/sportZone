<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Court;
use App\Models\User;
use App\Models\Venue;
use Tests\TestCase;

class BookingTest extends TestCase
{
    public function test_court_slots_can_be_retrieved(): void
    {
        $court = Court::first();
        $response = $this->getJson("/api/v1/courts/{$court->id}/slots?date=" . date('Y-m-d'));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'court',
                    'date',
                    'slots' => [
                        '*' => ['time', 'start_time', 'end_time', 'peak', 'rate', 'is_booked'],
                    ],
                ],
            ]);
    }

    public function test_owner_calendar_timeline_can_be_retrieved(): void
    {
        $venue = Venue::first();
        $response = $this->getJson("/api/v1/owner/calendar?venue_id={$venue->id}&date=" . date('Y-m-d'));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'date',
                    'venue',
                    'courts',
                    'matrix' => [
                        '*' => ['hour', 'is_peak', 'slots'],
                    ],
                ],
            ]);
    }

    public function test_create_booking_and_concurrency_lock(): void
    {
        $court = Court::first();
        $date = date('Y-m-d', strtotime('+7 days'));

        // 1. Tạo đơn thứ nhất thành công
        $payload = [
            'court_id' => $court->id,
            'booking_date' => $date,
            'start_time' => '07:30',
            'end_time' => '09:00',
            'customer_name' => 'Nguyễn Văn Test',
            'customer_phone' => '0911223344',
            'addons' => [
                ['addon_id' => 1, 'quantity' => 2], // 2 chai nước
            ],
            'voucher_code' => 'SPORT30',
            'payment_method' => 'vietqr',
        ];

        $response1 = $this->postJson('/api/v1/bookings', $payload);
        $response1->assertStatus(201)
            ->assertJson([
                'success' => true,
            ]);

        $createdBooking = $response1->json('data');
        $this->assertNotEmpty($createdBooking['booking_code']);
        $this->assertEquals($date, substr($createdBooking['booking_date'], 0, 10));

        // 2. Tạo đơn thứ hai trùng chính xác khung giờ đó -> Bị từ chối
        $response2 = $this->postJson('/api/v1/bookings', [
            'court_id' => $court->id,
            'booking_date' => $date,
            'start_time' => '08:00',
            'end_time' => '09:30',
            'customer_name' => 'Khách Bị Trùng',
            'customer_phone' => '0988776655',
        ]);

        $response2->assertStatus(422);

        // 3. Test check-in cho đơn vừa tạo
        $owner = User::where('role', 'owner')->first();
        $checkInRes = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/bookings/{$createdBooking['id']}/check-in");
        $checkInRes->assertStatus(200);

        // 4. Test hủy đơn
        $cancelRes = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/bookings/{$createdBooking['id']}/cancel", [
            'reason' => 'Khách bận việc đột xuất',
        ]);
        $cancelRes->assertStatus(200)
            ->assertJson([
                'data' => [
                    'status' => 'cancelled',
                ],
            ]);
    }

    public function test_update_booking_and_status_history(): void
    {
        $owner = User::where('role', 'owner')->first();
        $booking = Booking::first();

        $response = $this->actingAs($owner, 'sanctum')->putJson("/api/v1/bookings/{$booking->id}", [
            'note' => 'Ghi chú cập nhật từ chủ sân',
            'status' => 'confirmed',
            'payment_status' => 'paid',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'note' => 'Ghi chú cập nhật từ chủ sân',
                    'payment_status' => 'paid',
                ],
            ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'note' => 'Ghi chú cập nhật từ chủ sân',
            'payment_status' => 'paid',
        ]);
    }

    public function test_booking_addons_addition_and_removal(): void
    {
        $owner = User::where('role', 'owner')->first();
        $booking = Booking::whereNotIn('status', ['cancelled', 'completed'])->first();
        $initialTotal = $booking->total_price;

        // 1. Thêm dịch vụ vào đơn đặt
        $addRes = $this->actingAs($owner, 'sanctum')->postJson("/api/v1/bookings/{$booking->id}/addons", [
            'addon_id' => 1,
            'quantity' => 3,
        ]);

        $addRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('booking_addons', [
            'booking_id' => $booking->id,
            'addon_id' => 1,
            'quantity' => 3,
        ]);

        // 2. Xóa dịch vụ khỏi đơn đặt
        $removeRes = $this->actingAs($owner, 'sanctum')->deleteJson("/api/v1/bookings/{$booking->id}/addons/1");
        $removeRes->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('booking_addons', [
            'booking_id' => $booking->id,
            'addon_id' => 1,
        ]);
    }

    public function test_cancel_unpaid_bookings_command(): void
    {
        // Tạo đơn test unpaid có created_at quá 60 phút trước
        $court = Court::first();
        $unpaidBooking = Booking::create([
            'booking_code' => 'SZ-UNPAID-' . uniqid(),
            'venue_id' => $court->venue_id,
            'court_id' => $court->id,
            'booking_date' => date('Y-m-d', strtotime('+3 days')),
            'start_time' => '10:00:00',
            'end_time' => '11:30:00',
            'customer_name' => 'Khách Quá Hạn',
            'customer_phone' => '0901234567',
            'court_fee' => 100000,
            'total_price' => 100000,
            'status' => 'pending',
            'payment_status' => 'unpaid',
        ]);
        \Illuminate\Support\Facades\DB::table('bookings')
            ->where('id', $unpaidBooking->id)
            ->update(['created_at' => now()->subMinutes(60)]);

        // Chạy artisan command quét hủy
        $this->artisan('bookings:cancel-unpaid --minutes=30')
            ->assertSuccessful();

        $unpaidBooking->refresh();
        $this->assertEquals('cancelled', $unpaidBooking->status);
        $this->assertNotNull($unpaidBooking->cancelled_at);
        $this->assertStringContainsString('Quá hạn thanh toán', $unpaidBooking->cancel_reason);
    }
}
