<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('booking_holds', function (Blueprint $table): void {
            $table->id();
            $table->uuid('token')->index();
            $table->unsignedInteger('user_id')->index();
            $table->unsignedInteger('court_id');
            $table->date('booking_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamp('expires_at')->index();
            $table->index(['court_id', 'booking_date', 'expires_at']);
        });
        Schema::table('bookings', function (Blueprint $table): void {
            $table->uuid('recurrence_group_id')->nullable()->index();
            $table->string('recurrence_frequency', 10)->nullable();
            $table->unsignedTinyInteger('recurrence_discount_percent')->default(0);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_holds');
        Schema::table('bookings', function (Blueprint $table): void {
            $table->dropIndex(['recurrence_group_id']);
            $table->dropColumn(['recurrence_group_id', 'recurrence_frequency', 'recurrence_discount_percent']);
        });
    }
};
