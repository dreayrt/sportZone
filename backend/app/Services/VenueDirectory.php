<?php
namespace App\Services;
use App\Models\Venue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class VenueDirectory
{
    public function list(array $f): array
    {
        $version = Cache::store(config("venues.cache_store"))->get(
            "venues:version",
            "initial",
        );
        ksort($f);
        $key =
            "venues:list:" . $version . ":" . hash("sha256", json_encode($f));
        return Cache::store(config("venues.cache_store"))->remember(
            $key,
            config("venues.cache_seconds"),
            function () use ($f) {
                $courtFilter = function ($c) use ($f) {
                    $c->where("status", "active");
                    if (!empty($f["sport"])) {
                        $c->whereHas(
                            "sportCategory",
                            fn($s) => $s->where("code", $f["sport"]),
                        );
                    }
                    if (isset($f["min_price"])) {
                        $c->where(
                            "hourly_rate_standard",
                            ">=",
                            $f["min_price"],
                        );
                    }
                    if (isset($f["max_price"])) {
                        $c->where(
                            "hourly_rate_standard",
                            "<=",
                            $f["max_price"],
                        );
                    }
                };
                $q = Venue::select("venues.*")
                    ->where("status", "active")
                    ->with([
                        "amenities",
                        "courts" => function ($c) use ($courtFilter) {
                            $courtFilter($c);
                            $c->with("sportCategory");
                        },
                    ]);
                $q->withMin(
                    ["courts as min_price" => $courtFilter],
                    "hourly_rate_standard",
                );
                $q->withCount([
                    "bookings as booking_count" => fn($b) => $b->whereIn(
                        "status",
                        ["confirmed", "completed"],
                    ),
                ]);
                foreach (["city", "district"] as $field) {
                    if (!empty($f[$field])) {
                        $q->where($field, $f[$field]);
                    }
                }
                if (isset($f["rating"])) {
                    $q->where("rating", ">=", $f["rating"]);
                }
                if (!empty($f["search"])) {
                    $q->where(function ($w) use ($f) {
                        $s = $f["search"];
                        $w->where("name", "like", "%{$s}%")
                            ->orWhere("address", "like", "%{$s}%")
                            ->orWhere("district", "like", "%{$s}%");
                        if (DB::getDriverName() === "mysql") {
                            $w->orWhereFullText(
                                ["name", "description", "address"],
                                $s,
                            );
                        }
                    });
                }
                $q->whereHas("courts", $courtFilter);
                if (isset($f["lat"], $f["lng"])) {
                    $q->whereNotNull("latitude")->whereNotNull("longitude");
                    $q->selectRaw(
                        "6371 * 2 * ASIN(SQRT(LEAST(1, POWER(SIN(RADIANS(latitude - ?) / 2), 2) + COS(RADIANS(?)) * COS(RADIANS(latitude)) * POWER(SIN(RADIANS(longitude - ?) / 2), 2)))) AS distance_km",
                        [$f["lat"], $f["lat"], $f["lng"]],
                    );
                    if (isset($f["radius"])) {
                        $q->having("distance_km", "<=", $f["radius"]);
                    }
                }
                switch ($f["sort"] ?? "name") {
                    case "price_asc":
                        $q->orderBy("min_price");
                        break;
                    case "price_desc":
                        $q->orderByDesc("min_price");
                        break;
                    case "rating":
                        $q->orderByDesc("rating")->orderByDesc("review_count");
                        break;
                    case "popular":
                        $q->orderByDesc("booking_count");
                        break;
                    case "nearest":
                        $q->orderBy("distance_km");
                        break;
                    default:
                        $q->orderBy("name");
                }
                return $q
                    ->orderBy("venues.id")
                    ->paginate(
                        $f["per_page"] ?? 12,
                        ["*"],
                        "page",
                        $f["page"] ?? 1,
                    )
                    ->toArray();
            },
        );
    }
    public function invalidate(): void
    {
        Cache::store(config("venues.cache_store"))->forever(
            "venues:version",
            bin2hex(random_bytes(8)),
        );
    }
}
