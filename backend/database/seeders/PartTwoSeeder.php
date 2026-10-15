<?php
namespace Database\Seeders;
use App\Models\{Venue, Addon};
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class PartTwoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            // Preserve the original global addons and their booking references.
            // Create independent per-venue copies; rerunning does not reset owner's edits.
            $catalog = Addon::whereNull("venue_id")->get();
            foreach (Venue::whereNotNull("owner_id")->get() as $venue) {
                foreach ($catalog as $source) {
                    Addon::firstOrCreate(
                        ["code" => "P2-V" . $venue->id . "-A" . $source->id],
                        [
                            "venue_id" => $venue->id,
                            "name" => $source->name,
                            "category" => $source->category,
                            "price" => $source->price,
                            "unit" => $source->unit,
                            "stock_quantity" => $source->stock_quantity,
                            "image" => $source->image,
                            "status" => $source->status,
                        ],
                    );
                }
            }
        });
    }
}
