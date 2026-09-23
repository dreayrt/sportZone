<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // social_accounts
        if (!Schema::hasTable('social_accounts')) {
            Schema::create('social_accounts', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('user_id');
                $table->enum('provider', ['google', 'facebook'])->comment('Nhà cung cấp OAuth2');
                $table->string('provider_id', 255)->comment('ID user trên provider');
                $table->string('provider_email', 255)->nullable();
                $table->string('provider_name', 255)->nullable();
                $table->string('provider_avatar', 500)->nullable();
                $table->text('access_token')->nullable();
                $table->text('refresh_token')->nullable();
                $table->dateTime('token_expires_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->unique(['provider', 'provider_id'], 'uq_provider_account');
                $table->index('user_id', 'idx_social_user');
            });
        }

        // sport_categories
        if (!Schema::hasTable('sport_categories')) {
            Schema::create('sport_categories', function (Blueprint $table) {
                $table->increments('id');
                $table->string('code', 30)->unique();
                $table->string('name', 100);
                $table->string('description', 255)->nullable();
                $table->string('banner_image', 500)->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // venues
        if (!Schema::hasTable('venues')) {
            Schema::create('venues', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('owner_id')->nullable();
                $table->string('code', 50)->unique();
                $table->string('name', 255);
                $table->string('slug', 255)->unique();
                $table->text('description')->nullable();
                $table->string('address', 255);
                $table->string('ward', 100)->nullable();
                $table->string('district', 100);
                $table->string('city', 100);
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('phone', 20);
                $table->string('email', 150)->nullable();
                $table->time('open_time')->default('06:00:00');
                $table->time('close_time')->default('23:00:00');
                $table->decimal('rating', 2, 1)->default(0);
                $table->integer('review_count')->default(0);
                $table->string('image', 500)->nullable();
                $table->enum('status', ['active', 'inactive', 'pending'])->default('active');
                $table->timestamps();

                $table->foreign('owner_id')->references('id')->on('users')->onDelete('set null');
                $table->index('owner_id', 'idx_venues_owner');
                $table->index(['city', 'status'], 'idx_venues_city_status');
            });
        }

        // venue_amenities
        if (!Schema::hasTable('venue_amenities')) {
            Schema::create('venue_amenities', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('venue_id');
                $table->string('name', 150);
                $table->string('icon', 50)->nullable();

                $table->foreign('venue_id')->references('id')->on('venues')->onDelete('cascade');
                $table->unique(['venue_id', 'name'], 'uq_venue_amenity');
            });
        }

        // courts
        if (!Schema::hasTable('courts')) {
            Schema::create('courts', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('venue_id');
                $table->unsignedInteger('sport_category_id');
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->string('surface_type', 150);
                $table->boolean('indoor')->default(false);
                $table->integer('capacity')->nullable();
                $table->integer('hourly_rate_standard');
                $table->integer('hourly_rate_peak');
                $table->time('peak_start')->default('17:00:00');
                $table->time('peak_end')->default('21:00:00');
                $table->smallInteger('min_booking_minutes')->default(60);
                $table->smallInteger('slot_minutes')->default(30);
                $table->text('description')->nullable();
                $table->string('image', 500)->nullable();
                $table->enum('status', ['active', 'maintenance', 'closed'])->default('active');
                $table->timestamps();

                $table->foreign('venue_id')->references('id')->on('venues')->onDelete('cascade');
                $table->foreign('sport_category_id')->references('id')->on('sport_categories');
                $table->index(['venue_id', 'sport_category_id', 'status'], 'idx_courts_venue_sport_status');
            });
        }

        // addons
        if (!Schema::hasTable('addons')) {
            Schema::create('addons', function (Blueprint $table) {
                $table->increments('id');
                $table->string('code', 50)->unique();
                $table->string('name', 180);
                $table->enum('category', ['drink', 'equipment', 'service']);
                $table->integer('price');
                $table->string('unit', 50);
                $table->integer('stock_quantity')->nullable();
                $table->string('image', 500)->nullable();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // vouchers
        if (!Schema::hasTable('vouchers')) {
            Schema::create('vouchers', function (Blueprint $table) {
                $table->increments('id');
                $table->string('code', 50)->unique();
                $table->string('name', 150);
                $table->enum('discount_type', ['fixed', 'percent']);
                $table->integer('discount_value');
                $table->integer('max_discount')->nullable();
                $table->integer('min_order_value')->default(0);
                $table->integer('usage_limit')->nullable();
                $table->integer('used_count')->default(0);
                $table->dateTime('starts_at');
                $table->dateTime('ends_at');
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamp('created_at')->useCurrent();

                $table->index(['code', 'status', 'starts_at', 'ends_at'], 'idx_vouchers_active');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('addons');
        Schema::dropIfExists('courts');
        Schema::dropIfExists('venue_amenities');
        Schema::dropIfExists('venues');
        Schema::dropIfExists('sport_categories');
        Schema::dropIfExists('social_accounts');
    }
};
