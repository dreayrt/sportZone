<?php
return [
    "cache_store" => env("VENUE_CACHE_STORE", "file"),
    "cache_seconds" => (int) env("VENUE_CACHE_SECONDS", 60),
    "google_key" => env("GOOGLE_MAPS_SERVER_KEY"),
    "cloudinary_cloud" => env("CLOUDINARY_CLOUD_NAME"),
    "cloudinary_key" => env("CLOUDINARY_API_KEY"),
    "cloudinary_secret" => env("CLOUDINARY_API_SECRET"),
];
