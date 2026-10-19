<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\VenueModuleController as V;
Route::prefix("v1")->group(function () {
    Route::get("venues/filters", [V::class, "filters"]);
    Route::get("venues", [V::class, "index"]);
    Route::get("venues/{slug}", [V::class, "show"]);
    Route::get("courts/{court}/calendar", [V::class, "calendar"]);
    Route::get("venue-services/{venue}", [V::class, "publicAddons"]);
    Route::middleware(["auth:sanctum", "check.status"])->group(function () {
        Route::post("search-history", [V::class, "history"])->middleware(
            "throttle:30,1",
        );
        Route::get("search-history", [V::class, "getHistory"]);
        Route::prefix("owner")
            ->middleware("role:owner")
            ->group(function () {
                Route::get("venues", [V::class, "ownerVenues"]);
                Route::post("venues", [V::class, "storeVenue"]);
                Route::put("venues/{venue}", [V::class, "updateVenue"]);
                Route::delete("venues/{venue}", [V::class, "deleteVenue"]);
                Route::post("venues/{venue}/amenities", [
                    V::class,
                    "storeAmenity",
                ]);
                Route::put("amenities/{amenity}", [V::class, "updateAmenity"]);
                Route::delete("amenities/{amenity}", [
                    V::class,
                    "deleteAmenity",
                ]);
                Route::get("courts", [V::class, "courts"]);
                Route::post("courts", [V::class, "storeCourt"]);
                Route::put("courts/{court}", [V::class, "updateCourt"]);
                Route::delete("courts/{court}", [V::class, "deleteCourt"]);
                Route::get("courts/{court}/calendar", [
                    V::class,
                    "ownerCalendar",
                ]);
                Route::get("addons", [V::class, "addons"]);
                Route::post("addons", [V::class, "storeAddon"]);
                Route::put("addons/{addon}", [V::class, "updateAddon"]);
                Route::delete("addons/{addon}", [V::class, "deleteAddon"]);
                Route::post("geocode", [V::class, "geocode"])->middleware(
                    "throttle:10,1",
                );
                Route::post("images", [V::class, "upload"])->middleware(
                    "throttle:10,1",
                );
            });
    });
});
