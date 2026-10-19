<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn("venues", "gallery")) {
            Schema::table(
                "venues",
                fn(Blueprint $t) => $t->json("gallery")->nullable(),
            );
        }
        if (!Schema::hasColumn("addons", "venue_id")) {
            // SQL import uses signed INT ids; Laravel fresh migrations use unsigned INT.
            // Match the actual referenced column so both installation paths work on MySQL.
            $unsigned =
                DB::getDriverName() === "mysql" &&
                str_contains(
                    strtolower(Schema::getColumnType("venues", "id", true)),
                    "unsigned",
                );
            Schema::table("addons", function (Blueprint $t) use ($unsigned) {
                $t->integer("venue_id", false, $unsigned)->nullable()->index();
                $t->foreign("venue_id")
                    ->references("id")
                    ->on("venues")
                    ->restrictOnDelete();
            });
        }
        if (DB::getDriverName() === "mysql") {
            Schema::table(
                "venues",
                fn(Blueprint $t) => $t->fullText(
                    ["name", "description", "address"],
                    "venues_search_fulltext",
                ),
            );
        }
    }
    public function down(): void
    {
        if (DB::getDriverName() === "mysql") {
            Schema::table(
                "venues",
                fn(Blueprint $t) => $t->dropFullText("venues_search_fulltext"),
            );
        }
        Schema::table("addons", function (Blueprint $t) {
            $t->dropForeign(["venue_id"]);
            $t->dropColumn("venue_id");
        });
        Schema::table("venues", fn(Blueprint $t) => $t->dropColumn("gallery"));
    }
};
