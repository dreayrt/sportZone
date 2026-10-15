<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Api\BaseController;
use App\Models\{
    Venue,
    Court,
    Addon,
    VenueAmenity,
    Booking,
    SportCategory,
    UserSearchHistory,
};
use App\Services\VenueDirectory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Http};
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class VenueModuleController extends BaseController
{
    public function __construct(private VenueDirectory $directory) {}
    private function owned(Request $r, Venue $venue): void
    {
        abort_unless(
            (int) $venue->owner_id === (int) $r->user()->id,
            403,
            "Bạn chỉ được quản lý cơ sở của mình.",
        );
    }
    private function code(string $prefix): string
    {
        return $prefix . "-" . Str::upper((string) Str::ulid());
    }
    private function slug(string $name): string
    {
        return substr(Str::slug($name), 0, 220) .
            "-" .
            Str::lower((string) Str::ulid());
    }
    public function index(Request $r)
    {
        $f = $r->validate([
            "search" => "nullable|string|max:255",
            "city" => "nullable|string|max:100",
            "district" => "nullable|string|max:100",
            "sport" => "nullable|string|max:30",
            "min_price" => "nullable|integer|min:0",
            "max_price" => "nullable|integer|min:0",
            "rating" => "nullable|numeric|between:0,5",
            "sort" => [
                "nullable",
                Rule::in([
                    "name",
                    "price_asc",
                    "price_desc",
                    "rating",
                    "popular",
                    "nearest",
                ]),
            ],
            "lat" => "nullable|numeric|between:-90,90|required_with:lng",
            "lng" => "nullable|numeric|between:-180,180|required_with:lat",
            "radius" => "nullable|numeric|min:0.1|max:500",
            "page" => "nullable|integer|min:1",
            "per_page" => "nullable|integer|between:1,50",
        ]);
        $f = array_filter($f, fn($v) => $v !== null && $v !== "");
        if (($f["sort"] ?? "") === "nearest" && !isset($f["lat"], $f["lng"])) {
            return $this->validationError([
                "lat" => ["Cần tọa độ để tìm sân gần nhất."],
            ]);
        }
        if (
            isset($f["min_price"], $f["max_price"]) &&
            $f["max_price"] < $f["min_price"]
        ) {
            return $this->validationError([
                "max_price" => [
                    "Giá tối đa phải lớn hơn hoặc bằng giá tối thiểu.",
                ],
            ]);
        }
        return $this->successResponse($this->directory->list($f));
    }
    public function filters()
    {
        return $this->successResponse([
            "locations" => Venue::where("status", "active")
                ->select("city", "district")
                ->distinct()
                ->orderBy("city")
                ->orderBy("district")
                ->get(),
            "sports" => SportCategory::where("is_active", true)
                ->withCount([
                    "courts" => fn($q) => $q
                        ->where("status", "active")
                        ->whereHas(
                            "venue",
                            fn($v) => $v->where("status", "active"),
                        ),
                ])
                ->orderBy("sort_order")
                ->get(),
        ]);
    }
    public function show(string $slug)
    {
        $venue = Venue::where("slug", $slug)
            ->where("status", "active")
            ->with([
                "amenities",
                "courts" => fn($q) => $q
                    ->where("status", "active")
                    ->with("sportCategory"),
            ])
            ->firstOrFail();
        return $this->successResponse($venue);
    }
    public function ownerVenues(Request $r)
    {
        return $this->successResponse(
            Venue::where("owner_id", $r->user()->id)
                ->with(["amenities", "courts.sportCategory"])
                ->withCount("courts")
                ->orderBy("id")
                ->get(),
        );
    }
    private function venueData(Request $r): array
    {
        return $r->validate([
            "name" => "required|string|max:255",
            "description" => "nullable|string|max:10000",
            "address" => "required|string|max:255",
            "ward" => "nullable|string|max:100",
            "city" => "required|string|max:100",
            "district" => "required|string|max:100",
            "phone" => "required|string|max:20",
            "email" => "nullable|email|max:150",
            "open_time" => "required|date_format:H:i",
            "close_time" => "required|date_format:H:i|after:open_time",
            "latitude" =>
                "nullable|numeric|between:-90,90|required_with:longitude",
            "longitude" =>
                "nullable|numeric|between:-180,180|required_with:latitude",
            "status" => [
                "required",
                Rule::in(["active", "inactive", "pending"]),
            ],
            "image" => "nullable|url|max:500",
            "gallery" => "nullable|array|max:12",
            "gallery.*" => "url|max:500",
        ]);
    }
    public function storeVenue(Request $r)
    {
        $d = $this->venueData($r);
        $d["owner_id"] = $r->user()->id;
        $d["code"] = $this->code("VN");
        $d["slug"] = $this->slug($d["name"]);
        $venue = Venue::create($d);
        $this->directory->invalidate();
        return $this->successResponse($venue, "Đã tạo cơ sở.", 201);
    }
    public function updateVenue(Request $r, Venue $venue)
    {
        $this->owned($r, $venue);
        $venue->update($this->venueData($r));
        $this->directory->invalidate();
        return $this->successResponse($venue->fresh(), "Đã lưu cơ sở.");
    }
    public function deleteVenue(Request $r, Venue $venue)
    {
        $this->owned($r, $venue);
        if (
            $venue->bookings()->exists() ||
            $venue->reviews()->exists() ||
            Addon::where("venue_id", $venue->id)->exists()
        ) {
            return $this->errorResponse(
                "Cơ sở có đơn đặt, đánh giá hoặc dịch vụ. Hãy chuyển sang ngừng hoạt động.",
                409,
            );
        }
        $venue->delete();
        $this->directory->invalidate();
        return $this->successResponse(null, "Đã xóa cơ sở.");
    }
    public function courts(Request $r)
    {
        $f = $r->validate([
            "venue_id" => "nullable|integer",
            "sport_category_id" => "nullable|integer",
            "status" => [
                "nullable",
                Rule::in(["active", "maintenance", "closed"]),
            ],
        ]);
        $q = Court::whereHas(
            "venue",
            fn($v) => $v->where("owner_id", $r->user()->id),
        )->with("sportCategory");
        foreach ($f as $k => $v) {
            if ($v !== null) {
                $q->where($k, $v);
            }
        }
        return $this->successResponse($q->orderBy("id")->get());
    }
    private function courtData(Request $r): array
    {
        $d = $r->validate([
            "venue_id" => "required|integer|exists:venues,id",
            "sport_category_id" => [
                "required",
                "integer",
                Rule::exists("sport_categories", "id")->where(
                    "is_active",
                    true,
                ),
            ],
            "name" => "required|string|max:150",
            "surface_type" => "required|string|max:150",
            "indoor" => "required|boolean",
            "capacity" => "nullable|integer|between:1,1000",
            "hourly_rate_standard" => "required|integer|between:0,100000000",
            "hourly_rate_peak" => "required|integer|between:0,100000000",
            "peak_start" => "required|date_format:H:i",
            "peak_end" => "required|date_format:H:i|after:peak_start",
            "min_booking_minutes" => "required|integer|between:15,1440",
            "slot_minutes" => "required|integer|between:15,240",
            "description" => "nullable|string|max:10000",
            "image" => "nullable|url|max:500",
            "status" => [
                "required",
                Rule::in(["active", "maintenance", "closed"]),
            ],
        ]);
        $this->owned($r, Venue::findOrFail($d["venue_id"]));
        if ($d["min_booking_minutes"] % $d["slot_minutes"] !== 0) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                "min_booking_minutes" => [
                    "Thời gian tối thiểu phải chia hết cho độ dài slot.",
                ],
            ]);
        }
        return $d;
    }
    public function storeCourt(Request $r)
    {
        $d = $this->courtData($r);
        $d["code"] = $this->code("CT");
        $court = Court::create($d);
        $this->directory->invalidate();
        return $this->successResponse($court, "Đã thêm sân.", 201);
    }
    public function updateCourt(Request $r, Court $court)
    {
        $this->owned($r, $court->venue);
        $d = $this->courtData($r);
        if (
            $court->bookings()->exists() &&
            (int) $d["venue_id"] !== (int) $court->venue_id
        ) {
            return $this->errorResponse(
                "Không chuyển cơ sở của sân đã có lịch sử đặt.",
                409,
            );
        }
        $court->update($d);
        $this->directory->invalidate();
        return $this->successResponse($court->fresh(), "Đã cập nhật sân.");
    }
    public function deleteCourt(Request $r, Court $court)
    {
        $this->owned($r, $court->venue);
        if ($court->bookings()->exists()) {
            return $this->errorResponse(
                "Sân có lịch sử đặt. Hãy chuyển trạng thái sang đóng cửa.",
                409,
            );
        }
        $court->delete();
        $this->directory->invalidate();
        return $this->successResponse(null, "Đã xóa sân.");
    }
    public function storeAmenity(Request $r, Venue $venue)
    {
        $this->owned($r, $venue);
        $d = $r->validate([
            "name" => [
                "required",
                "string",
                "max:150",
                Rule::unique("venue_amenities")->where("venue_id", $venue->id),
            ],
            "icon" => "nullable|string|max:50",
        ]);
        $a = $venue->amenities()->create($d);
        $this->directory->invalidate();
        return $this->successResponse($a, "Đã thêm tiện ích.", 201);
    }
    public function updateAmenity(Request $r, VenueAmenity $amenity)
    {
        $this->owned($r, $amenity->venue);
        $d = $r->validate([
            "name" => [
                "required",
                "string",
                "max:150",
                Rule::unique("venue_amenities")
                    ->where("venue_id", $amenity->venue_id)
                    ->ignore($amenity->id),
            ],
            "icon" => "nullable|string|max:50",
        ]);
        $amenity->update($d);
        $this->directory->invalidate();
        return $this->successResponse($amenity, "Đã sửa tiện ích.");
    }
    public function deleteAmenity(Request $r, VenueAmenity $amenity)
    {
        $this->owned($r, $amenity->venue);
        $amenity->delete();
        $this->directory->invalidate();
        return $this->successResponse(null, "Đã xóa tiện ích.");
    }
    public function addons(Request $r)
    {
        $r->validate(["venue_id" => "nullable|integer"]);
        $q = Addon::whereIn(
            "venue_id",
            Venue::where("owner_id", $r->user()->id)->select("id"),
        );
        if ($r->filled("venue_id")) {
            $q->where("venue_id", $r->integer("venue_id"));
        }
        return $this->successResponse($q->orderBy("id")->get());
    }
    public function publicAddons(Venue $venue)
    {
        abort_unless($venue->status === "active", 404);
        return $this->successResponse(
            Addon::where("venue_id", $venue->id)
                ->where("status", "active")
                ->get(),
        );
    }
    private function addonData(Request $r): array
    {
        $d = $r->validate([
            "venue_id" => "required|integer|exists:venues,id",
            "name" => "required|string|max:180",
            "category" => [
                "required",
                Rule::in(["drink", "equipment", "service"]),
            ],
            "price" => "required|integer|between:0,100000000",
            "unit" => "required|string|max:50",
            "stock_quantity" => "nullable|integer|min:0",
            "image" => "nullable|url|max:500",
            "status" => ["required", Rule::in(["active", "inactive"])],
        ]);
        $this->owned($r, Venue::findOrFail($d["venue_id"]));
        return $d;
    }
    public function storeAddon(Request $r)
    {
        $d = $this->addonData($r);
        $d["code"] = $this->code("AD");
        return $this->successResponse(
            Addon::create($d),
            "Đã thêm dịch vụ.",
            201,
        );
    }
    public function updateAddon(Request $r, Addon $addon)
    {
        abort_unless($addon->venue_id, 403);
        $this->owned($r, Venue::findOrFail($addon->venue_id));
        $d = $this->addonData($r);
        if (
            $addon->bookingAddons()->exists() &&
            (int) $d["venue_id"] !== (int) $addon->venue_id
        ) {
            return $this->errorResponse(
                "Không chuyển cơ sở của dịch vụ đã có lịch sử sử dụng.",
                409,
            );
        }
        $addon->update($d);
        return $this->successResponse($addon, "Đã cập nhật dịch vụ.");
    }
    public function deleteAddon(Request $r, Addon $addon)
    {
        abort_unless($addon->venue_id, 403);
        $this->owned($r, Venue::findOrFail($addon->venue_id));
        if ($addon->bookingAddons()->exists()) {
            return $this->errorResponse(
                "Dịch vụ có lịch sử sử dụng. Hãy chuyển sang ngừng hoạt động.",
                409,
            );
        }
        $addon->delete();
        return $this->successResponse(null, "Đã xóa dịch vụ.");
    }
    public function calendar(Request $r, Court $court)
    {
        abort_unless($court->venue->status === "active", 404);
        return $this->calendarData($r, $court);
    }
    public function ownerCalendar(Request $r, Court $court)
    {
        $this->owned($r, $court->venue);
        return $this->calendarData($r, $court);
    }
    private function calendarData(Request $r, Court $court)
    {
        $d = $r->validate(["date" => "required|date_format:Y-m-d"]);
        $venue = $court->venue;
        // Read only: booking creation, locking, cancellation and check-in remain owned by Part 3.
        $bookings = Booking::where("court_id", $court->id)
            ->whereDate("booking_date", $d["date"])
            ->whereIn("status", ["pending", "confirmed", "completed"])
            ->get(["start_time", "end_time"]);
        $minute = fn($time) => (int) substr($time, 0, 2) * 60 +
            (int) substr($time, 3, 2);
        $clock = fn($n) => sprintf("%02d:%02d", intdiv($n, 60), $n % 60);
        $slots = [];
        $step = max(15, (int) $court->slot_minutes);
        $end = $minute($venue->close_time);
        for (
            $start = $minute($venue->open_time);
            $start + $step <= $end;
            $start += $step
        ) {
            $blocked = $court->status !== "active";
            foreach ($bookings as $b) {
                if (
                    $start < $minute($b->end_time) &&
                    $start + $step > $minute($b->start_time)
                ) {
                    $blocked = true;
                }
            }
            $slots[] = [
                "start" => $clock($start),
                "end" => $clock($start + $step),
                "available" => !$blocked,
            ];
        }
        return $this->successResponse([
            "court_id" => $court->id,
            "date" => $d["date"],
            "min_booking_minutes" => $court->min_booking_minutes,
            "slots" => $slots,
        ]);
    }
    public function history(Request $r)
    {
        $d = $r->validate([
            "search_query" => "nullable|string|max:255",
            "sport_category_id" =>
                "nullable|integer|exists:sport_categories,id",
            "city" => "nullable|string|max:100",
            "district" => "nullable|string|max:100",
            "latitude" => "nullable|numeric|between:-90,90",
            "longitude" => "nullable|numeric|between:-180,180",
            "filters_json" => "nullable|array",
            "result_count" => "required|integer|min:0",
            "clicked_venue_id" => "nullable|integer|exists:venues,id",
        ]);
        $d["user_id"] = $r->user()->id;
        return $this->successResponse(
            UserSearchHistory::create($d),
            "Đã lưu lịch sử tìm kiếm.",
            201,
        );
    }
    public function getHistory(Request $r)
    {
        return $this->successResponse(
            UserSearchHistory::where("user_id", $r->user()->id)
                ->latest("created_at")
                ->paginate(20),
        );
    }
    public function geocode(Request $r)
    {
        $d = $r->validate(["address" => "required|string|max:500"]);
        $key = config("venues.google_key");
        if (!$key) {
            return $this->errorResponse(
                "Chưa cấu hình Google Geocoding. Bạn có thể nhập tọa độ trực tiếp.",
                503,
            );
        }
        try {
            $res = Http::timeout(10)->get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                [
                    "address" => $d["address"],
                    "key" => $key,
                    "language" => "vi",
                    "region" => "vn",
                ],
            );
        } catch (\Throwable $e) {
            report($e);
            return $this->errorResponse(
                "Không kết nối được dịch vụ bản đồ.",
                502,
            );
        }
        $body = $res->json();
        if (!$res->successful() || ($body["status"] ?? "") !== "OK") {
            return $this->errorResponse(
                "Không tìm được tọa độ. Kiểm tra địa chỉ và cấu hình Google API.",
                422,
            );
        }
        return $this->successResponse([
            "latitude" => $body["results"][0]["geometry"]["location"]["lat"],
            "longitude" => $body["results"][0]["geometry"]["location"]["lng"],
        ]);
    }
    public function upload(Request $r)
    {
        $r->validate([
            "image" => "required|image|mimes:jpeg,jpg,png,webp|max:5120",
        ]);
        if (
            !config("venues.cloudinary_cloud") ||
            !config("venues.cloudinary_secret") ||
            !config("venues.cloudinary_key")
        ) {
            return $this->errorResponse(
                "Chưa cấu hình Cloudinary. Có thể nhập URL ảnh trong form.",
                503,
            );
        }
        $params = [
            "timestamp" => time(),
            "folder" => "sportzone/owner-" . $r->user()->id,
            "transformation" => "c_limit,w_1600,h_1600",
        ];
        ksort($params);
        $signature = sha1(
            urldecode(http_build_query($params)) .
                config("venues.cloudinary_secret"),
        );
        try {
            $res = Http::timeout(30)
                ->attach(
                    "file",
                    file_get_contents($r->file("image")->getRealPath()),
                    $r->file("image")->getClientOriginalName(),
                )
                ->post(
                    "https://api.cloudinary.com/v1_1/" .
                        config("venues.cloudinary_cloud") .
                        "/image/upload",
                    array_merge($params, [
                        "api_key" => config("venues.cloudinary_key"),
                        "signature" => $signature,
                    ]),
                );
        } catch (\Throwable $e) {
            report($e);
            return $this->errorResponse(
                "Không tải được ảnh lên dịch vụ lưu trữ.",
                502,
            );
        }
        if (!$res->successful()) {
            return $this->errorResponse(
                "Dịch vụ lưu ảnh từ chối yêu cầu.",
                502,
            );
        }
        return $this->successResponse(
            [
                "url" => str_replace(
                    "/image/upload/",
                    "/image/upload/f_auto,q_auto/",
                    $res->json("secure_url"),
                ),
            ],
            "Đã tải và tối ưu ảnh.",
        );
    }
}
