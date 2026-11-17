<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('courts', function (Blueprint $table): void {
            $table->smallInteger('min_booking_minutes')->default(30)->change();
        });

        DB::table('courts')
            ->where('slot_minutes', 30)
            ->where('min_booking_minutes', 60)
            ->update(['min_booking_minutes' => 30]);
    }

    /**
     * Reverse the migrations.
     * Existing court settings stay unchanged to preserve subsequent owner edits.
     */
    public function down(): void
    {
        Schema::table('courts', function (Blueprint $table): void {
            $table->smallInteger('min_booking_minutes')->default(60)->change();
        });
    }
};
