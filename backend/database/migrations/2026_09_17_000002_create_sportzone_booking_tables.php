<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // bookings
        if (!Schema::hasTable('bookings')) {
            Schema::create('bookings', function (Blueprint $table) {
                $table->increments('id');
                $table->string('booking_code', 30)->unique();
                $table->unsignedInteger('user_id')->nullable();
                $table->unsignedInteger('venue_id');
                $table->unsignedInteger('court_id');
                $table->unsignedInteger('voucher_id')->nullable();
                $table->enum('source', ['website', 'counter', 'admin'])->default('website');
                $table->date('booking_date');
                $table->time('start_time');
                $table->time('end_time');
                $table->string('customer_name', 120);
                $table->string('customer_phone', 20);
                $table->string('customer_email', 150)->nullable();
                $table->text('note')->nullable();
                $table->integer('court_fee')->default(0);
                $table->integer('addons_fee')->default(0);
                $table->integer('discount_amount')->default(0);
                $table->integer('total_price')->default(0);
                $table->enum('status', ['pending', 'confirmed', 'completed', 'cancelled', 'no_show'])->default('confirmed');
                $table->enum('payment_status', ['unpaid', 'partial', 'paid', 'refunded'])->default('unpaid');
                $table->enum('payment_method', ['vietqr', 'momo', 'cash', 'bank_transfer'])->default('cash');
                $table->boolean('checked_in')->default(false);
                $table->dateTime('checked_in_at')->nullable();
                $table->dateTime('cancelled_at')->nullable();
                $table->string('cancel_reason', 255)->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                $table->foreign('venue_id')->references('id')->on('venues');
                $table->foreign('court_id')->references('id')->on('courts');
                $table->foreign('voucher_id')->references('id')->on('vouchers')->onDelete('set null');

                $table->index(['booking_code', 'customer_phone'], 'idx_booking_lookup');
                $table->index(['court_id', 'booking_date', 'start_time', 'end_time'], 'idx_booking_slot');
                $table->index(['venue_id', 'booking_date', 'status'], 'idx_booking_venue_date');
            });
        }

        // booking_addons
        if (!Schema::hasTable('booking_addons')) {
            Schema::create('booking_addons', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('booking_id');
                $table->unsignedInteger('addon_id');
                $table->string('addon_name', 180);
                $table->integer('quantity')->default(1);
                $table->integer('unit_price');
                $table->integer('total_price');

                $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
                $table->foreign('addon_id')->references('id')->on('addons');
                $table->unique(['booking_id', 'addon_id'], 'uq_booking_addon');
            });
        }

        // payments
        if (!Schema::hasTable('payments')) {
            Schema::create('payments', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('booking_id');
                $table->integer('amount');
                $table->enum('method', ['vietqr', 'momo', 'cash', 'bank_transfer']);
                $table->enum('status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
                $table->string('transaction_code', 100)->nullable();
                $table->string('note', 255)->nullable();
                $table->dateTime('paid_at')->nullable();
                $table->unsignedInteger('created_by')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
                $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
                $table->index(['booking_id', 'status'], 'idx_payments_booking_status');
            });
        }

        // booking_status_history
        if (!Schema::hasTable('booking_status_history')) {
            Schema::create('booking_status_history', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('booking_id');
                $table->string('old_status', 30)->nullable();
                $table->string('new_status', 30);
                $table->string('note', 255)->nullable();
                $table->unsignedInteger('changed_by')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
                $table->foreign('changed_by')->references('id')->on('users')->onDelete('set null');
                $table->index(['booking_id', 'created_at'], 'idx_history_booking');
            });
        }

        // reviews
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('venue_id');
                $table->unsignedInteger('user_id')->nullable();
                $table->unsignedInteger('booking_id')->nullable();
                $table->string('customer_name', 120);
                $table->tinyInteger('rating');
                $table->text('comment')->nullable();
                $table->enum('status', ['visible', 'hidden'])->default('visible');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('venue_id')->references('id')->on('venues')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('set null');
                $table->index(['venue_id', 'status'], 'idx_reviews_venue');
            });
        }

        // audit_logs
        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('user_id')->nullable();
                $table->string('action', 80);
                $table->string('entity_type', 80)->nullable();
                $table->integer('entity_id')->nullable();
                $table->text('details')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                $table->index(['user_id', 'created_at'], 'idx_audit_user_time');
            });
        }

        // system_settings
        if (!Schema::hasTable('system_settings')) {
            Schema::create('system_settings', function (Blueprint $table) {
                $table->string('setting_key', 100)->primary();
                $table->text('setting_value')->nullable();
                $table->string('description', 255)->nullable();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('booking_status_history');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('booking_addons');
        Schema::dropIfExists('bookings');
    }
};
