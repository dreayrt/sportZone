<?php
namespace Tests\Feature;
use App\Models\{User, Venue, Court, SportCategory, Booking, Addon};
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
class VenueModuleTest extends TestCase
{
    use RefreshDatabase;
    public function createApplication()
    {
        $app = parent::createApplication();
        // Enforce isolation even if this class is picked up by the default test suite.
        $app["config"]->set("database.default", "sqlite");
        $app["config"]->set("database.connections.sqlite.database", ":memory:");
        $app["config"]->set("database.connections.sqlite.url", null);
        $app["config"]->set("venues.cache_store", "array");
        return $app;
    }
    protected function setUp(): void
    {
        // Always use an isolated in-memory database. Never migrate/fresh the user's database.
        parent::setUp();
        config(["venues.cache_store" => "array"]);
    }
    private function owner(int $n = 1): User
    {
        return User::create([
            "full_name" => "Owner " . $n,
            "phone" => "090000000" . $n,
            "role" => "owner",
            "status" => "active",
        ]);
    }
    private function venue(User $owner, string $slug = "test-venue"): Venue
    {
        return Venue::create([
            "owner_id" => $owner->id,
            "code" => $slug,
            "slug" => $slug,
            "name" => "Test " . $slug,
            "address" => "12 Test Street",
            "city" => "TP. Hồ Chí Minh",
            "district" => "Quận 1",
            "phone" => "0900000099",
            "open_time" => "06:00:00",
            "close_time" => "23:00:00",
            "status" => "active",
        ]);
    }
    private function court(
        Venue $venue,
        string $sport = "badminton",
        int $rate = 90000,
    ): Court {
        $category = SportCategory::firstOrCreate(
            ["code" => $sport],
            ["name" => $sport, "is_active" => true],
        );
        return Court::create([
            "venue_id" => $venue->id,
            "sport_category_id" => $category->id,
            "code" => "CT-" . $venue->id . "-" . $sport,
            "name" => "Court " . $sport,
            "surface_type" => "Mat",
            "indoor" => true,
            "hourly_rate_standard" => $rate,
            "hourly_rate_peak" => 120000,
            "slot_minutes" => 30,
            "min_booking_minutes" => 60,
            "status" => "active",
        ]);
    }
    public function test_public_filters_apply_sport_and_price_to_same_court(): void
    {
        $owner = $this->owner();
        $v = $this->venue($owner);
        $this->court($v, "football", 100000);
        $this->court($v, "badminton", 200000);
        $this->getJson("/api/v1/venues?sport=badminton&max_price=150000")
            ->assertOk()
            ->assertJsonPath("data.total", 0);
        $this->getJson("/api/v1/venues?sport=badminton&max_price=250000")
            ->assertOk()
            ->assertJsonPath("data.total", 1)
            ->assertJsonPath("data.data.0.min_price", 200000);
    }
    public function test_other_owner_cannot_modify_any_owned_resource(): void
    {
        $first = $this->owner();
        $other = $this->owner(2);
        $venue = $this->venue($first);
        $court = $this->court($venue);
        $amenity = $venue->amenities()->create(["name" => "Parking"]);
        $addon = Addon::create([
            "venue_id" => $venue->id,
            "code" => "AD-TEST",
            "name" => "Water",
            "category" => "drink",
            "price" => 10000,
            "unit" => "bottle",
            "status" => "active",
        ]);
        Sanctum::actingAs($other);
        foreach (
            [
                "venues" => $venue->id,
                "courts" => $court->id,
                "amenities" => $amenity->id,
                "addons" => $addon->id,
            ]
            as $resource => $id
        ) {
            $this->deleteJson(
                "/api/v1/owner/{$resource}/{$id}",
            )->assertForbidden();
        }
        $this->assertDatabaseHas("venues", ["id" => $venue->id]);
        $this->assertDatabaseHas("addons", ["id" => $addon->id]);
    }
    public function test_slot_overlap_and_cancellation_without_customer_data_leak(): void
    {
        $owner = $this->owner();
        $venue = $this->venue($owner);
        $court = $this->court($venue);
        $data = [
            "venue_id" => $venue->id,
            "court_id" => $court->id,
            "booking_date" => "2026-10-20",
            "start_time" => "06:30:00",
            "end_time" => "07:30:00",
            "customer_name" => "Private name",
            "customer_phone" => "0900000010",
            "status" => "confirmed",
        ];
        Booking::create(array_merge($data, ["booking_code" => "TEST-1"]));
        Booking::create(
            array_merge($data, [
                "booking_code" => "TEST-2",
                "start_time" => "08:00:00",
                "end_time" => "09:00:00",
                "status" => "cancelled",
            ]),
        );
        $response = $this->getJson(
            "/api/v1/courts/" . $court->id . "/calendar?date=2026-10-20",
        )->assertOk();
        $slots = collect($response->json("data.slots"))->keyBy("start");
        $this->assertTrue($slots["06:00"]["available"]);
        $this->assertFalse($slots["06:30"]["available"]);
        $this->assertFalse($slots["07:00"]["available"]);
        $this->assertTrue($slots["07:30"]["available"]);
        $this->assertTrue($slots["08:00"]["available"]);
        $this->assertStringNotContainsString(
            "Private name",
            $response->getContent(),
        );
        Sanctum::actingAs($owner);
        $this->deleteJson("/api/v1/owner/courts/" . $court->id)->assertStatus(
            409,
        );
        $this->assertDatabaseHas("bookings", ["booking_code" => "TEST-1"]);
    }
    public function test_cache_is_invalidated_when_owner_saves_venue(): void
    {
        $owner = $this->owner();
        $venue = $this->venue($owner);
        $this->court($venue);
        $this->getJson("/api/v1/venues")->assertJsonPath("data.total", 1);
        Sanctum::actingAs($owner);
        $this->putJson("/api/v1/owner/venues/" . $venue->id, [
            "name" => "Updated venue",
            "address" => "12 Test",
            "city" => "TP. Hồ Chí Minh",
            "district" => "Quận 1",
            "phone" => "0900000099",
            "open_time" => "06:00",
            "close_time" => "23:00",
            "status" => "inactive",
        ])->assertOk();
        $this->getJson("/api/v1/venues")->assertJsonPath("data.total", 0);
    }
    public function test_slug_not_found_and_customer_access_and_invalid_coordinates(): void
    {
        $this->getJson("/api/v1/venues/does-not-exist")->assertNotFound();
        $this->getJson("/api/v1/venues?sort=nearest")->assertStatus(422);
        $this->getJson("/api/v1/venues?lat=91&lng=106")->assertStatus(422);
        $customer = User::create([
            "full_name" => "Customer",
            "phone" => "0900000009",
            "role" => "customer",
            "status" => "active",
        ]);
        Sanctum::actingAs($customer);
        $this->getJson("/api/v1/owner/venues")->assertForbidden();
    }
}
