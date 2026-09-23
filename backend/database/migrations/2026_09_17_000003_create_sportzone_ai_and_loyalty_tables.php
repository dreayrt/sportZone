<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // notifications
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('user_id');
                $table->enum('type', [
                    'booking_confirmed',
                    'booking_reminder',
                    'booking_cancelled',
                    'payment_success',
                    'review_reply',
                    'loyalty_points',
                    'referral_reward',
                    'system',
                ]);
                $table->string('title', 255);
                $table->text('message');
                $table->string('reference_type', 50)->nullable()->comment('booking, match_post, review, voucher...');
                $table->integer('reference_id')->nullable();
                $table->enum('channel', ['in_app', 'email', 'sms', 'push'])->default('in_app');
                $table->boolean('is_read')->default(false);
                $table->dateTime('read_at')->nullable();
                $table->dateTime('scheduled_at')->nullable()->comment('Thời điểm gửi (Smart Reminder)');
                $table->dateTime('sent_at')->nullable()->comment('Thời điểm thực tế đã gửi');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index(['user_id', 'is_read', 'created_at'], 'idx_notifications_user_read');
                $table->index(['channel', 'scheduled_at', 'sent_at'], 'idx_notifications_scheduled');
            });
        }

        // user_points
        if (!Schema::hasTable('user_points')) {
            Schema::create('user_points', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('user_id')->unique();
                $table->integer('total_points')->default(0)->comment('Tổng điểm hiện có');
                $table->integer('lifetime_points')->default(0)->comment('Tổng điểm đã tích');
                $table->enum('tier', ['bronze', 'silver', 'gold', 'platinum'])->default('bronze');
                $table->dateTime('tier_updated_at')->nullable();
                $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // point_transactions
        if (!Schema::hasTable('point_transactions')) {
            Schema::create('point_transactions', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('user_id');
                $table->enum('type', ['earn', 'redeem', 'expire', 'bonus', 'refund']);
                $table->integer('points')->comment('Số điểm (+earn, -redeem)');
                $table->integer('balance_after')->comment('Số dư sau giao dịch');
                $table->string('source', 80)->comment('booking, referral, promotion, admin...');
                $table->integer('reference_id')->nullable();
                $table->string('description', 255)->nullable();
                $table->dateTime('expires_at')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->index(['user_id', 'created_at'], 'idx_point_trans_user');
                $table->index(['type', 'created_at'], 'idx_point_trans_type');
            });
        }

        // referral_codes
        if (!Schema::hasTable('referral_codes')) {
            Schema::create('referral_codes', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('user_id')->unique()->comment('Chủ mã giới thiệu');
                $table->string('code', 20)->unique()->comment('Mã giới thiệu duy nhất');
                $table->integer('total_referrals')->default(0);
                $table->integer('total_rewards')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        // referral_rewards
        if (!Schema::hasTable('referral_rewards')) {
            Schema::create('referral_rewards', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('referrer_id')->comment('Người giới thiệu');
                $table->unsignedInteger('referred_id')->comment('Người được giới thiệu');
                $table->unsignedInteger('referral_code_id');
                $table->enum('reward_type', ['points', 'voucher', 'cash'])->default('points');
                $table->integer('referrer_reward_value')->default(0);
                $table->integer('referred_reward_value')->default(0);
                $table->enum('status', ['pending', 'completed', 'cancelled'])->default('pending');
                $table->dateTime('completed_at')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('referrer_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('referred_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('referral_code_id')->references('id')->on('referral_codes')->onDelete('cascade');
                $table->unique(['referrer_id', 'referred_id'], 'uq_referral_pair');
                $table->index(['status', 'created_at'], 'idx_referral_rewards_status');
            });
        }

        // user_search_history
        if (!Schema::hasTable('user_search_history')) {
            Schema::create('user_search_history', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->unsignedInteger('user_id')->nullable();
                $table->string('session_id', 100)->nullable();
                $table->string('search_query', 255)->nullable();
                $table->unsignedInteger('sport_category_id')->nullable();
                $table->string('city', 100)->nullable();
                $table->string('district', 100)->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->json('filters_json')->nullable();
                $table->integer('result_count')->nullable();
                $table->unsignedInteger('clicked_venue_id')->nullable();
                $table->unsignedInteger('clicked_court_id')->nullable();
                $table->unsignedInteger('converted_booking_id')->nullable();
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
                $table->foreign('sport_category_id')->references('id')->on('sport_categories')->onDelete('set null');
                $table->foreign('clicked_venue_id')->references('id')->on('venues')->onDelete('set null');
                $table->foreign('clicked_court_id')->references('id')->on('courts')->onDelete('set null');
                $table->foreign('converted_booking_id')->references('id')->on('bookings')->onDelete('set null');

                $table->index(['user_id', 'created_at'], 'idx_search_user');
                $table->index(['sport_category_id', 'city', 'created_at'], 'idx_search_sport_city');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_search_history');
        Schema::dropIfExists('referral_rewards');
        Schema::dropIfExists('referral_codes');
        Schema::dropIfExists('point_transactions');
        Schema::dropIfExists('user_points');
        Schema::dropIfExists('notifications');
    }
};
